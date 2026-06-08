import http from 'node:http'
import type {AddressInfo} from 'node:net'
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyRequest,
} from 'fastify'
import {describe, expect, it} from 'vitest'
import {
  inferdiFastify,
  skipInferdiDispose,
  type InferdiScope,
} from '../src/index'

async function listenOn(app: FastifyInstance): Promise<number> {
  await app.listen({ port: 0, host: '127.0.0.1' })
  const address = app.server.address() as AddressInfo
  return address.port
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 3000,
): Promise<void> {
  const start = Date.now()
  while (!predicate() && Date.now() - start < timeoutMs) {
    await delay(5)
  }
}

type RequestWithScope = FastifyRequest & { di: TestScope | null }
type InstanceWithRoot = FastifyInstance & { di: TestRoot }

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// Minimal Pino-compatible logger that captures `request.log.error(...)` calls,
// so tests can assert what the default disposal sink received.
function makeLogger(sink: unknown[]): FastifyBaseLogger {
  const logger = {
    level: 'error',
    silent() {},
    trace() {},
    debug() {},
    info() {},
    warn() {},
    error(obj: unknown) {
      sink.push(obj)
    },
    fatal() {},
    child() {
      return logger
    },
  }
  return logger as unknown as FastifyBaseLogger
}

function loggedError(entry: unknown): unknown {
  return (entry as { err: unknown }).err
}

// A logger whose `error(...)` throws, used to prove the fallback log is guarded.
function makeThrowingLogger(loggerError: Error): FastifyBaseLogger {
  const logger = {
    level: 'error',
    silent() {},
    trace() {},
    debug() {},
    info() {},
    warn() {},
    error() {
      throw loggerError
    },
    fatal() {},
    child() {
      return logger
    },
  }
  return logger as unknown as FastifyBaseLogger
}

class TestScope implements InferdiScope {
  disposeCalls = 0
  disposed = false
  requestId = ''

  constructor(
    private readonly options: {
      readonly disposeDelay?: number
      readonly disposeError?: Error
      readonly disposeSyncError?: Error
      readonly disposeSync?: boolean
    } = {},
  ) {}

  get(key: 'users') {
    return {
      profile: (id: string) => ({ id, requestId: this.requestId }),
    }
  }

  dispose(): void | Promise<void> {
    this.disposeCalls += 1

    if (this.options.disposeSyncError !== undefined) {
      throw this.options.disposeSyncError
    }

    if (this.options.disposeSync === true) {
      this.disposed = true
      return
    }

    return this.disposeAsync()
  }

  private async disposeAsync(): Promise<void> {
    if (this.options.disposeDelay !== undefined) {
      await delay(this.options.disposeDelay)
    }
    this.disposed = true
    if (this.options.disposeError !== undefined) {
      throw this.options.disposeError
    }
  }
}

class TestRoot implements InferdiScope {
  scopes: TestScope[] = []
  createScopeCalls = 0
  disposeCalls = 0
  disposed = false
  nextScope: TestScope | undefined
  disposeError: Error | undefined
  disposeSyncError: Error | undefined

  createScope() {
    this.createScopeCalls += 1
    const scope = this.nextScope ?? new TestScope()
    this.nextScope = undefined
    this.scopes.push(scope)
    return scope
  }

  get(key: 'health') {
    return {
      check: () => 'ok',
    }
  }

  dispose(): void | Promise<void> {
    this.disposeCalls += 1
    if (this.disposeSyncError !== undefined) {
      throw this.disposeSyncError
    }
    return this.disposeAsync()
  }

  private async disposeAsync(): Promise<void> {
    this.disposed = true
    if (this.disposeError !== undefined) {
      throw this.disposeError
    }
  }
}

describe('@inferdi/fastify', () => {
  it('creates one request scope and disposes it after a successful response', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, { container: root })
    app.get('/users/:id', async (request) => {
      const scope = (request as RequestWithScope).di
      const { id } = request.params as { id: string }
      return scope?.get('users').profile(id)
    })

    const response = await app.inject('/users/42')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ id: '42', requestId: '' })
    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(app.hasDecorator('di')).toBe(true)
    expect(app.hasRequestDecorator('di')).toBe(true)

    await app.close()
  })

  it('disposes a synchronous scope without scheduling a microtask', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let sawDisposedInLaterHook = false
    root.nextScope = new TestScope({ disposeSync: true })

    app.register(inferdiFastify, { container: root })
    // A later sync onResponse hook observes that the default sync dispose path
    // already completed synchronously by the time the plugin called done().
    app.addHook('onResponse', (_request, _reply, done) => {
      sawDisposedInLaterHook = root.scopes[0]?.disposed === true
      done()
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(sawDisposedInLaterHook).toBe(true)

    await app.close()
  })

  it('forwards a synchronous createScope failure to Fastify without disposing', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const createError = new Error('createScope failed')
    let handledError: Error | undefined
    root.createScope = () => {
      throw createError
    }

    app.register(inferdiFastify, { container: root })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(503).send({ message: error.message })
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(503)
    expect(handledError).toBe(createError)
    expect(root.scopes).toHaveLength(0)

    await app.close()
  })

  it('forwards a custom createScope failure without disposing', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const createError = new Error('custom createScope failed')
    let handledError: Error | undefined

    app.register(inferdiFastify, {
      container: root,
      createScope: () => {
        throw createError
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(503).send({ message: error.message })
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(503)
    expect(handledError).toBe(createError)
    expect(root.scopes).toHaveLength(0)

    await app.close()
  })

  it('uses the default createScope with a setupScope hook', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      setupScope: (scope, request) => {
        scope.requestId = request.id
      },
    })
    app.get('/users/:id', async (request) => {
      const scope = (request as RequestWithScope).di
      const { id } = request.params as { id: string }
      return scope?.get('users').profile(id)
    })

    const response = await app.inject('/users/5')
    const body = JSON.parse(response.body) as { id: string; requestId: string }

    expect(response.statusCode).toBe(200)
    expect(body.id).toBe('5')
    expect(body.requestId).not.toBe('')
    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('uses custom createScope and setupScope before the handler runs', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const customScope = new TestScope()

    app.register(inferdiFastify, {
      container: root,
      createScope: (receivedRoot, request) => {
        expect(receivedRoot).toBe(root)
        expect(request.id).toBeTypeOf('string')
        root.scopes.push(customScope)
        return customScope
      },
      setupScope: (scope, request) => {
        scope.requestId = request.id
      },
    })
    app.get('/users/:id', async (request) => {
      const scope = (request as RequestWithScope).di
      const { id } = request.params as { id: string }
      return scope?.get('users').profile(id)
    })

    const response = await app.inject('/users/7')
    const body = JSON.parse(response.body) as { id: string; requestId: string }

    expect(response.statusCode).toBe(200)
    expect(body.id).toBe('7')
    expect(body.requestId).not.toBe('')
    expect(root.createScopeCalls).toBe(0)
    expect(customScope.disposeCalls).toBe(1)

    await app.close()
  })

  it('uses custom createScope without setupScope', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const customScope = new TestScope()

    app.register(inferdiFastify, {
      container: root,
      createScope: () => customScope,
    })
    app.get('/users/:id', async (request) => {
      const scope = (request as RequestWithScope).di
      const { id } = request.params as { id: string }
      return scope?.get('users').profile(id)
    })

    const response = await app.inject('/users/8')

    expect(response.statusCode).toBe(200)
    expect(customScope.disposeCalls).toBe(1)

    await app.close()
  })

  it('disposes request scopes after handled route errors', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const routeError = new Error('route failed')

    app.register(inferdiFastify, { container: root })
    app.setErrorHandler((error, _request, reply) => {
      expect(error).toBe(routeError)
      reply.code(409).send({ message: error.message })
    })
    app.get('/boom', async () => {
      throw routeError
    })

    const response = await app.inject('/boom')

    expect(response.statusCode).toBe(409)
    expect(JSON.parse(response.body)).toEqual({ message: 'route failed' })
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('preserves the original setupScope error when cleanup disposal also fails', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handled: unknown[] = []
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      setupScope: () => {
        throw setupError
      },
      onDisposeError: (error) => {
        handled.push(error)
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(418).send({ message: error.message })
    })
    app.get('/users/:id', async () => ({ unreachable: true }))

    const response = await app.inject('/users/1')

    expect(response.statusCode).toBe(418)
    expect(handledError).toBe(setupError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(handled).toEqual([disposeError])

    await app.close()
  })

  it('never aggregates a setup failure with an onDisposeError failure', async () => {
    const logged: unknown[] = []
    const app = Fastify({ loggerInstance: makeLogger(logged) })
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handlerError = new Error('handler failed')
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      setupScope: () => {
        throw setupError
      },
      onDisposeError: () => {
        throw handlerError
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(418).send({ message: error.message })
    })
    app.get('/users/:id', async () => ({ unreachable: true }))

    const response = await app.inject('/users/1')
    const aggregate = loggedError(logged[0]) as AggregateError

    // The thrown error stays the original setup error — never an AggregateError.
    expect(response.statusCode).toBe(418)
    expect(handledError).toBe(setupError)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([disposeError, handlerError])

    await app.close()
  })

  it('synchronously disposes a half-built scope when setupScope fails', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeSync: true })

    app.register(inferdiFastify, {
      container: root,
      setupScope: () => {
        throw setupError
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(418).send({ message: error.message })
    })
    app.get('/users/:id', async () => ({ unreachable: true }))

    const response = await app.inject('/users/1')

    expect(response.statusCode).toBe(418)
    expect(handledError).toBe(setupError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(root.scopes[0]?.disposed).toBe(true)

    await app.close()
  })

  it('awaits async request-scope disposal in onResponse', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const scope = new TestScope({ disposeDelay: 10 })
    let laterHookSawDisposed = false
    root.nextScope = scope

    app.register(inferdiFastify, { container: root })
    const laterOnResponse = new Promise<void>((resolve) => {
      app.addHook('onResponse', async () => {
        laterHookSawDisposed = scope.disposed
        resolve()
      })
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')
    await laterOnResponse

    expect(response.statusCode).toBe(200)
    expect(laterHookSawDisposed).toBe(true)

    await app.close()
  })

  it('logs default disposal failures without corrupting the response', async () => {
    const logged: unknown[] = []
    const app = Fastify({ loggerInstance: makeLogger(logged) })
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, { container: root })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ ok: true })
    expect(loggedError(logged[0])).toBe(disposeError)

    await app.close()
  })

  it('logs synchronous default disposal throws without corrupting the response', async () => {
    const logged: unknown[] = []
    const app = Fastify({ loggerInstance: makeLogger(logged) })
    const root = new TestRoot()
    const disposeError = new Error('sync dispose failed')
    root.nextScope = new TestScope({ disposeSyncError: disposeError })

    app.register(inferdiFastify, { container: root })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ ok: true })
    expect(loggedError(logged[0])).toBe(disposeError)

    await app.close()
  })

  it('routes request disposal failures to onDisposeError and swallows them', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handled: unknown[] = []
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      onDisposeError: (error, request) => {
        handled.push(error)
        expect(request.id).toBeTypeOf('string')
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(handled).toEqual([disposeError])

    await app.close()
  })

  it('routes synchronous disposal throws to onDisposeError', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('sync dispose failed')
    const handled: unknown[] = []
    root.nextScope = new TestScope({ disposeSyncError: disposeError })

    app.register(inferdiFastify, {
      container: root,
      onDisposeError: (error) => {
        handled.push(error)
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ ok: true })
    expect(handled).toEqual([disposeError])

    await app.close()
  })

  it('logs a single request disposal failure when no onDisposeError is set', async () => {
    const logged: unknown[] = []
    const app = Fastify({ loggerInstance: makeLogger(logged) })
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      autoDispose: true,
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(loggedError(logged[0])).toBe(disposeError)

    await app.close()
  })

  it('uses a custom disposeScope hook (async) instead of scope.dispose', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposed: TestScope[] = []

    app.register(inferdiFastify, {
      container: root,
      disposeScope: async (scope, request) => {
        expect(request.id).toBeTypeOf('string')
        await Promise.resolve()
        disposed.push(scope)
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(disposed).toEqual([root.scopes[0]])
    expect(root.scopes[0]?.disposeCalls).toBe(0)

    await app.close()
  })

  it('supports a synchronous disposeScope hook', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposed: TestScope[] = []

    app.register(inferdiFastify, {
      container: root,
      disposeScope: (scope) => {
        disposed.push(scope)
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(disposed).toEqual([root.scopes[0]])

    await app.close()
  })

  it('skips disposal when autoDispose is false', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      autoDispose: false,
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(0)

    await app.close()
  })

  it('supports a synchronous autoDispose predicate', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      autoDispose: (request) => request.url !== '/manual',
    })
    app.get('/manual', async () => ({ ok: true }))
    app.get('/auto', async () => ({ ok: true }))

    await app.inject('/manual')
    await app.inject('/auto')

    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('supports an asynchronous autoDispose predicate', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      autoDispose: async (request) => request.url !== '/manual',
    })
    app.get('/manual', async () => ({ ok: true }))
    app.get('/auto', async () => ({ ok: true }))

    await app.inject('/manual')
    await app.inject('/auto')

    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('routes autoDispose predicate failures through cleanup and still disposes', async () => {
    const logged: unknown[] = []
    const app = Fastify({ loggerInstance: makeLogger(logged) })
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const disposeError = new Error('dispose failed')
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      autoDispose: () => {
        throw predicateError
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')
    const aggregate = loggedError(logged[0]) as AggregateError

    expect(response.statusCode).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([predicateError, disposeError])

    await app.close()
  })

  it('awaits async onDisposeError handling for autoDispose failures', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const handled: unknown[] = []

    app.register(inferdiFastify, {
      container: root,
      autoDispose: () => {
        throw predicateError
      },
      onDisposeError: async (error) => {
        await Promise.resolve()
        handled.push(error)
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(handled).toEqual([predicateError])

    await app.close()
  })

  it('lets an async onDisposeError handle a request disposal failure', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handled: unknown[] = []
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      onDisposeError: async (error) => {
        await Promise.resolve()
        handled.push(error)
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(handled).toEqual([disposeError])

    await app.close()
  })

  it('aggregates a disposal failure with an async onDisposeError rejection', async () => {
    const logged: unknown[] = []
    const app = Fastify({ loggerInstance: makeLogger(logged) })
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('handler failed')
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      onDisposeError: async () => {
        throw handlerError
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')
    const aggregate = loggedError(logged[0]) as AggregateError

    expect(response.statusCode).toBe(200)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([disposeError, handlerError])

    await app.close()
  })

  it('skipInferdiDispose suppresses disposal for one request only', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, { container: root })
    app.get('/manual', async (request) => {
      skipInferdiDispose(request)
      return { ok: true }
    })
    app.get('/auto', async () => ({ ok: true }))

    await app.inject('/manual')
    await app.inject('/auto')

    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('disposes despite skipInferdiDispose when the route fails', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const routeError = new Error('route failed')

    app.register(inferdiFastify, { container: root })
    app.setErrorHandler((error, _request, reply) => {
      reply.code(409).send({ message: (error as Error).message })
    })
    app.get('/boom', async (request) => {
      skipInferdiDispose(request)
      throw routeError
    })

    const response = await app.inject('/boom')

    expect(response.statusCode).toBe(409)
    // Finding 3: a failed request disposes even when skipInferdiDispose was
    // called; the marker only suppresses successful response cleanup.
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('keeps request.di visible to disposeScope during normal cleanup', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let diDuringCleanup: unknown

    app.register(inferdiFastify, {
      container: root,
      disposeScope: async (scope, request) => {
        diDuringCleanup = (request as RequestWithScope).di
        await scope.dispose()
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    // Finding 1: cleanup hooks observe the same `request.di` handle the request
    // did, matching the other adapters.
    expect(diDuringCleanup).toBe(root.scopes[0])
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('exposes request.di to setup-failure disposeScope and clears it before error handlers', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    let diDuringCleanup: unknown
    let diInErrorHandler: unknown = 'unset'

    app.register(inferdiFastify, {
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: (scope, request) => {
        diDuringCleanup = (request as RequestWithScope).di
        return scope.dispose()
      },
    })
    app.setErrorHandler((error, request, reply) => {
      diInErrorHandler = (request as RequestWithScope).di
      reply.code(500).send({ message: (error as Error).message })
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(500)
    // Finding 4: setup-failure cleanup hooks see the scope on `request.di`, but
    // it is cleared before the framework error handler runs.
    expect(diDuringCleanup).toBe(root.scopes[0])
    expect(diInErrorHandler).toBeNull()
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('root-only mode exposes app.di without request decoration or request hooks', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      scopePerRequest: false,
    })
    app.get('/health', async function (request) {
      const thisRoot = (this as InstanceWithRoot).di
      const serverRoot = (request.server as InstanceWithRoot).di
      return {
        sameRoot: thisRoot === root && serverRoot === root,
        hasRequestDi: Object.prototype.hasOwnProperty.call(request, 'di'),
        health: serverRoot.get('health').check(),
      }
    })

    const response = await app.inject('/health')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({
      sameRoot: true,
      hasRequestDi: false,
      health: 'ok',
    })
    expect(root.createScopeCalls).toBe(0)
    expect(app.hasRequestDecorator('di')).toBe(false)

    await app.close()
  })

  it('disposes the root container on close when requested', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      disposeRootOnClose: true,
    })

    await app.ready()
    await app.close()

    expect(root.disposeCalls).toBe(1)
    expect(root.disposed).toBe(true)
  })

  it('propagates async root disposal errors through fastify.close()', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('root dispose failed')
    root.disposeError = disposeError

    app.register(inferdiFastify, {
      container: root,
      disposeRootOnClose: true,
    })

    await app.ready()
    await expect(app.close()).rejects.toBe(disposeError)
  })

  it('propagates synchronous root disposal errors through fastify.close()', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('sync root dispose failed')
    root.disposeSyncError = disposeError

    app.register(inferdiFastify, {
      container: root,
      disposeRootOnClose: true,
    })

    await app.ready()
    await expect(app.close()).rejects.toBe(disposeError)
  })

  it('leaves the root container alive when root disposal is not requested', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, { container: root })

    await app.ready()
    await app.close()

    expect(root.disposeCalls).toBe(0)
    expect(root.disposed).toBe(false)
  })

  it('surfaces Fastify duplicate instance decoration errors', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.decorate('di', {})
    app.register(inferdiFastify, { container: root })

    await expect(app.ready()).rejects.toThrow(/decorat/i)
  })

  it('surfaces Fastify duplicate request decoration errors', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.decorateRequest('di', null)
    app.register(inferdiFastify, { container: root })

    await expect(app.ready()).rejects.toThrow(/decorat/i)
  })

  it('keeps the original setup error when both disposal and the logger throw', async () => {
    const setupError = new Error('setup boom')
    const app = Fastify({
      loggerInstance: makeThrowingLogger(new Error('logger boom')),
    })
    const root = new TestRoot()
    root.nextScope = new TestScope({ disposeSyncError: new Error('dispose boom') })
    let handledError: unknown

    app.register(inferdiFastify, {
      container: root,
      setupScope: () => {
        throw setupError
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(500).send({ message: error.message })
    })
    app.get('/x', async () => ({ ok: true }))

    const response = await app.inject('/x')
    const body = JSON.parse(response.body) as { message: string }

    // The throwing logger must not replace the original setup error.
    expect(response.statusCode).toBe(500)
    expect(handledError).toBe(setupError)
    expect(body.message).toBe('setup boom')

    await app.close()
  })

  it('keeps autoDispose: true on the default synchronous disposal path', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let disposedInLaterHook = false
    root.nextScope = new TestScope({ disposeSync: true })

    app.register(inferdiFastify, { container: root, autoDispose: true })
    // A later sync onResponse hook observes that the default sync dispose path
    // already completed synchronously, proving autoDispose: true did not move
    // the request onto the async disposeCustom path.
    app.addHook('onResponse', (_request, _reply, done) => {
      disposedInLaterHook = root.scopes[0]?.disposed === true
      done()
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(disposedInLaterHook).toBe(true)

    await app.close()
  })

  it('awaits an asynchronous createScope before exposing the scope', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const customScope = new TestScope()

    app.register(inferdiFastify, {
      container: root,
      createScope: async () => {
        await delay(5)
        root.scopes.push(customScope)
        return customScope
      },
    })
    app.get('/users/:id', async (request) => {
      const scope = (request as RequestWithScope).di
      const { id } = request.params as { id: string }
      return scope?.get('users').profile(id)
    })

    const response = await app.inject('/users/9')

    expect(response.statusCode).toBe(200)
    expect(root.createScopeCalls).toBe(0)
    expect(customScope.disposeCalls).toBe(1)

    await app.close()
  })

  it('forwards an asynchronous createScope rejection to Fastify without disposing', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const createError = new Error('async create failed')

    app.register(inferdiFastify, {
      container: root,
      createScope: async () => {
        throw createError
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      reply.code(500).send({ message: error.message })
    })
    app.get('/x', async () => ({ ok: true }))

    const response = await app.inject('/x')

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.body)).toEqual({ message: 'async create failed' })
    expect(root.scopes).toHaveLength(0)

    await app.close()
  })

  it('awaits an asynchronous setupScope before exposing the scope', async () => {
    const app = Fastify()
    const root = new TestRoot()

    app.register(inferdiFastify, {
      container: root,
      setupScope: async (scope, request) => {
        await delay(5)
        scope.requestId = request.id
      },
    })
    app.get('/users/:id', async (request) => {
      const scope = (request as RequestWithScope).di
      const { id } = request.params as { id: string }
      return scope?.get('users').profile(id)
    })

    const response = await app.inject('/users/10')
    const body = JSON.parse(response.body) as { id: string; requestId: string }

    expect(response.statusCode).toBe(200)
    expect(body.requestId).not.toBe('')
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })

  it('disposes a half-built scope when an asynchronous setupScope rejects', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const setupError = new Error('async setup failed')
    let handledError: unknown
    root.nextScope = new TestScope({ disposeSync: true })

    app.register(inferdiFastify, {
      container: root,
      setupScope: async () => {
        throw setupError
      },
    })
    app.setErrorHandler((error, _request, reply) => {
      handledError = error
      reply.code(500).send({ message: error.message })
    })
    app.get('/x', async (request) => {
      const scope = (request as RequestWithScope).di
      return { hasScope: scope !== null }
    })

    const response = await app.inject('/x')

    expect(response.statusCode).toBe(500)
    expect(handledError).toBe(setupError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    await app.close()
  })
})

describe('@inferdi/fastify client abort', () => {
  function abortableGet(port: number, path: string): http.ClientRequest {
    const request = http.request({ host: '127.0.0.1', port, path, method: 'GET' })
    request.on('error', () => {})
    request.end()
    return request
  }

  it('disposes the request scope when the client aborts before the response', async () => {
    const app = Fastify()
    const root = new TestRoot()
    root.nextScope = new TestScope({ disposeSync: true })
    let entered = false
    let release: () => void = () => {}
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, { container: root })
    app.get('/slow', async () => {
      entered = true
      await handlerGate
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => entered)
    request.destroy()
    await waitFor(() => root.scopes[0]?.disposeCalls === 1)

    expect(root.scopes[0]?.disposeCalls).toBe(1)

    release()
    await app.close()
  })

  it('awaits an asynchronous scope disposal on abort', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let entered = false
    let release: () => void = () => {}
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, { container: root })
    app.get('/slow', async () => {
      entered = true
      await handlerGate
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => entered)
    request.destroy()
    await waitFor(() => root.scopes[0]?.disposed === true)

    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(root.scopes[0]?.disposed).toBe(true)

    release()
    await app.close()
  })

  it('honors skipInferdiDispose on abort (manual ownership)', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let entered = false
    let aborted = false
    let release: () => void = () => {}
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, { container: root })
    app.addHook('onRequestAbort', (_request, done) => {
      aborted = true
      done()
    })
    app.get('/slow', async (request) => {
      skipInferdiDispose(request)
      entered = true
      await handlerGate
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => entered)
    request.destroy()
    await waitFor(() => aborted)
    await delay(50)

    expect(root.scopes[0]?.disposeCalls).toBe(0)

    release()
    await app.close()
  })

  it('honors autoDispose: false on abort (manual ownership)', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let entered = false
    let aborted = false
    let release: () => void = () => {}
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, { container: root, autoDispose: false })
    app.addHook('onRequestAbort', (_request, done) => {
      aborted = true
      done()
    })
    app.get('/slow', async () => {
      entered = true
      await handlerGate
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => entered)
    request.destroy()
    await waitFor(() => aborted)
    await delay(50)

    expect(root.scopes[0]?.disposeCalls).toBe(0)

    release()
    await app.close()
  })

  it('disposes a scope that is created after the request already aborted', async () => {
    const app = Fastify()
    const root = new TestRoot()
    root.nextScope = new TestScope({ disposeSync: true })
    let createStarted = false
    let aborted = false
    let handlerEntered = false
    let release: () => void = () => {}
    const createGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, {
      container: root,
      createScope: async () => {
        createStarted = true
        await createGate
        return root.createScope()
      },
    })
    app.addHook('onRequestAbort', (_request, done) => {
      aborted = true
      done()
    })
    app.get('/slow', async () => {
      handlerEntered = true
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => createStarted)
    request.destroy()
    await waitFor(() => aborted)

    release()
    await waitFor(() => root.scopes[0]?.disposeCalls === 1)

    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(handlerEntered).toBe(false)

    await app.close()
  })

  it('disposes a scope after async setup finishes when the request aborted during setup', async () => {
    const app = Fastify()
    const root = new TestRoot()
    let setupStarted = false
    let aborted = false
    let handlerEntered = false
    let release: () => void = () => {}
    const setupGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, {
      container: root,
      setupScope: async () => {
        setupStarted = true
        await setupGate
      },
    })
    app.addHook('onRequestAbort', (_request, done) => {
      aborted = true
      done()
    })
    app.get('/slow', async () => {
      handlerEntered = true
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => setupStarted)
    request.destroy()
    await waitFor(() => aborted)

    release()
    await waitFor(() => root.scopes[0]?.disposeCalls === 1)

    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(handlerEntered).toBe(false)

    await app.close()
  })

  it('uses custom abort disposal hooks once a scope has been exposed', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposed: TestScope[] = []
    let predicateSawReply = false
    let entered = false
    let release: () => void = () => {}
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, {
      container: root,
      autoDispose: (_request, reply) => {
        predicateSawReply = typeof reply.code === 'function'
        return true
      },
      disposeScope: (scope, _request, reply) => {
        expect(typeof reply.code).toBe('function')
        disposed.push(scope)
      },
    })
    app.get('/slow', async () => {
      entered = true
      await handlerGate
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => entered)
    request.destroy()
    await waitFor(() => disposed.length === 1)

    expect(predicateSawReply).toBe(true)
    expect(disposed).toEqual([root.scopes[0]])
    expect(root.scopes[0]?.disposeCalls).toBe(0)

    release()
    await app.close()
  })

  it('routes custom abort disposal failures to onDisposeError', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('abort dispose failed')
    const handled: unknown[] = []
    let entered = false
    let release: () => void = () => {}
    const handlerGate = new Promise<void>((resolve) => {
      release = resolve
    })

    app.register(inferdiFastify, {
      container: root,
      disposeScope: () => {
        throw disposeError
      },
      onDisposeError: (error, _request, reply) => {
        expect(typeof reply.code).toBe('function')
        handled.push(error)
      },
    })
    app.get('/slow', async () => {
      entered = true
      await handlerGate
      return { ok: true }
    })

    const port = await listenOn(app)
    const request = abortableGet(port, '/slow')
    await waitFor(() => entered)
    request.destroy()
    await waitFor(() => handled.length === 1)

    expect(handled).toEqual([disposeError])

    release()
    await app.close()
  })
})
