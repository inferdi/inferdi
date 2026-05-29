import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
} from 'fastify'
import {describe, expect, it} from 'vitest'
import {inferdiFastify, type InferdiScope} from '../src/index'

type RequestWithScope = FastifyRequest & { di: TestScope | null }
type InstanceWithRoot = FastifyInstance & { di: TestRoot }

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

class TestScope implements InferdiScope {
  disposeCalls = 0
  disposed = false
  requestId = ''

  constructor(
    private readonly options: {
      readonly disposeDelay?: number
      readonly disposeError?: Error
    } = {},
  ) {}

  get(key: 'users') {
    return {
      profile: (id: string) => ({ id, requestId: this.requestId }),
    }
  }

  async dispose() {
    this.disposeCalls += 1
    if (this.options.disposeDelay !== undefined) {
      await delay(this.options.disposeDelay)
    }
    this.disposed = true
    if (this.options.disposeError !== undefined) {
      throw this.options.disposeError
    }
  }
}

class SyncThrowScope extends TestScope {
  constructor(private readonly disposeError: Error) {
    super()
  }

  dispose(): Promise<void> {
    this.disposeCalls += 1
    throw this.disposeError
  }
}

class TestRoot implements InferdiScope {
  scopes: TestScope[] = []
  createScopeCalls = 0
  disposeCalls = 0
  disposed = false
  nextScope: TestScope | undefined
  disposeError: Error | undefined

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

  async dispose() {
    this.disposeCalls += 1
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
    const logged: unknown[] = []
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      setupScope: () => {
        throw setupError
      },
      logDisposeError: (error) => {
        logged.push(error)
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
    expect(logged).toEqual([disposeError])

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
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, { container: root })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ ok: true })

    await app.close()
  })

  it('uses custom disposal logging and swallows request disposal failures', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const logged: unknown[] = []
    root.nextScope = new TestScope({ disposeError })

    app.register(inferdiFastify, {
      container: root,
      logDisposeError: (error, request) => {
        logged.push(error)
        expect(request.id).toBeTypeOf('string')
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(logged).toEqual([disposeError])

    await app.close()
  })

  it('logs synchronous disposal throws without corrupting the response', async () => {
    const app = Fastify()
    const root = new TestRoot()
    const disposeError = new Error('sync dispose failed')
    const logged: unknown[] = []
    root.nextScope = new SyncThrowScope(disposeError)

    app.register(inferdiFastify, {
      container: root,
      logDisposeError: (error) => {
        logged.push(error)
      },
    })
    app.get('/ok', async () => ({ ok: true }))

    const response = await app.inject('/ok')

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ ok: true })
    expect(logged).toEqual([disposeError])

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

  it('propagates root disposal errors through fastify.close()', async () => {
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
})
