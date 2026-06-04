import { EventEmitter } from 'node:events'
import {
  createServer,
  request as httpRequest,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { PassThrough } from 'node:stream'
import Koa, { type Context } from 'koa'
import {describe, expect, it} from 'vitest'
import {
  inferdiKoa,
  skipInferdiDispose,
  type InferdiKoaState,
  type InferdiScope,
} from '../src/index'

type AppState = InferdiKoaState<TestScope>

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function tick() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function listen(server: Server) {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

async function close(server: Server) {
  if (!server.listening) return

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function withServer<T>(
  app: Koa,
  run: (baseUrl: string) => Promise<T>,
) {
  const server = createServer(app.callback())
  const baseUrl = await listen(server)
  try {
    return await run(baseUrl)
  } finally {
    await close(server)
  }
}

async function requestJson(app: Koa, path: string, init?: RequestInit) {
  return withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, init)
    const body = await response.json()
    return { body, status: response.status }
  })
}

async function requestText(app: Koa, path: string, init?: RequestInit) {
  return withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, init)
    const body = await response.text()
    return { body, status: response.status }
  })
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
      readonly onDispose?: () => void
    } = {},
  ) {}

  get(key: 'users') {
    return {
      profile: (id: string) => ({ id, requestId: this.requestId }),
    }
  }

  async dispose() {
    this.disposeCalls += 1

    if (this.options.disposeSyncError !== undefined) {
      throw this.options.disposeSyncError
    }

    if (this.options.disposeDelay !== undefined) {
      await delay(this.options.disposeDelay)
    }

    this.disposed = true
    this.options.onDispose?.()

    if (this.options.disposeError !== undefined) {
      throw this.options.disposeError
    }
  }
}

class TestRoot {
  scopes: TestScope[] = []
  createScopeCalls = 0
  nextScope: TestScope | undefined
  createScopeError: Error | undefined

  createScope() {
    this.createScopeCalls += 1
    if (this.createScopeError !== undefined) {
      throw this.createScopeError
    }

    const scope = this.nextScope ?? new TestScope()
    this.nextScope = undefined
    this.scopes.push(scope)
    return scope
  }
}

describe('@inferdi/koa', () => {
  it('creates one request scope and disposes it after a successful response', async () => {
    const root = new TestRoot()
    const app = new Koa()
      .use(inferdiKoa({ container: root }))
      .use((ctx) => {
        const id = ctx.path.split('/').pop() ?? ''
        ctx.body = ctx.state.di.get('users').profile(id)
      })

    const response = await requestJson(app, '/users/42')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: '42', requestId: '' })
    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(root.scopes[0]?.disposed).toBe(true)
  })

  it('keeps scoped state isolated between requests', async () => {
    const root = new TestRoot()
    const app = new Koa()
      .use(inferdiKoa({
        container: root,
        setupScope: (scope, ctx) => {
          scope.requestId = ctx.get('x-request-id')
        },
      }))
      .use((ctx) => {
        const id = ctx.path.split('/').pop() ?? ''
        ctx.body = ctx.state.di.get('users').profile(id)
      })

    const first = await requestJson(app, '/users/1', {
      headers: { 'x-request-id': 'first' },
    })
    const second = await requestJson(app, '/users/2', {
      headers: { 'x-request-id': 'second' },
    })

    expect(first.body).toEqual({ id: '1', requestId: 'first' })
    expect(second.body).toEqual({ id: '2', requestId: 'second' })
    expect(root.scopes).toHaveLength(2)
    expect(root.scopes[0]).not.toBe(root.scopes[1])
    expect(root.scopes.map((scope) => scope.disposeCalls)).toEqual([1, 1])
  })

  it('supports a custom Koa state key', async () => {
    const root = new TestRoot()
    const app = new Koa()
      .use(inferdiKoa({ container: root, key: 'container' }))
      .use((ctx) => {
        ctx.body = ctx.state.container.get('users').profile('7')
      })

    const response = await requestJson(app, '/users/7')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: '7', requestId: '' })
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('uses custom async createScope, setupScope, and disposeScope hooks', async () => {
    const root = new TestRoot()
    const customScope = new TestScope()
    const disposed = deferred<TestScope>()
    const app = new Koa()
      .use(inferdiKoa({
        container: root,
        createScope: async (receivedRoot, ctx) => {
          expect(receivedRoot).toBe(root)
          expect(ctx.path).toBe('/users/8')
          await delay(1)
          return customScope
        },
        setupScope: async (scope, ctx) => {
          await delay(1)
          scope.requestId = ctx.get('x-request-id')
        },
        disposeScope: async (scope, ctx) => {
          expect(ctx.state.di).toBe(scope)
          await delay(1)
          disposed.resolve(scope)
        },
      }))
      .use((ctx) => {
        ctx.body = ctx.state.di.get('users').profile('8')
      })

    const response = await withServer(app, async (baseUrl) => {
      const result = await fetch(`${baseUrl}/users/8`, {
        headers: { 'x-request-id': 'custom' },
      })
      const body = await result.json()
      await disposed.promise
      return { body, status: result.status }
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: '8', requestId: 'custom' })
    expect(root.createScopeCalls).toBe(0)
    expect(await disposed.promise).toBe(customScope)
  })

  it('forwards createScope failures without disposing', async () => {
    const root = new TestRoot()
    const createError = new Error('create failed')
    const emitted: unknown[] = []
    root.createScopeError = createError
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({ container: root }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(emitted).toEqual([createError])
    expect(root.scopes).toHaveLength(0)
  })

  it('disposes a half-built scope when setupScope fails', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const emitted: unknown[] = []
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      setupScope: () => {
        throw setupError
      },
    }))
    app.use((ctx) => {
      ctx.body = { unreachable: true }
    })

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(emitted).toEqual([setupError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('exposes ctx.state to setup-failure disposal hooks', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const seen: unknown[] = []
    const app = new Koa<AppState>()

    app.on('error', () => {})
    app.use(inferdiKoa({
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: (scope, ctx) => {
        seen.push(ctx.state.di === scope)
      },
    }))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(seen).toEqual([true])
  })

  it('disposes the scope when the client disconnects during async setup', async () => {
    const root = new TestRoot()
    const cleaned = deferred()
    root.nextScope = new TestScope({ onDispose: cleaned.resolve })
    const setupStarted = deferred()
    const releaseSetup = deferred()
    let scopeRes: Context['res'] | undefined
    const app = new Koa()

    app.on('error', () => {})
    app.use(inferdiKoa({
      container: root,
      setupScope: async (_scope, ctx) => {
        scopeRes = ctx.res
        setupStarted.resolve()
        await releaseSetup.promise
      },
    }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const server = createServer(app.callback())
    const baseUrl = await listen(server)
    try {
      const req = httpRequest(baseUrl)
      req.once('error', () => {})
      req.end()

      // Abort the connection while setupScope is mid-await, so the response
      // `close` event fires before the middleware registers its listeners.
      await setupStarted.promise
      const closed = deferred()
      scopeRes?.once('close', closed.resolve)
      req.destroy()
      await closed.promise
      releaseSetup.resolve()
      await cleaned.promise
    } finally {
      await close(server)
    }

    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('aggregates setup and setup-cleanup failures by default', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const emitted: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      setupScope: () => {
        throw setupError
      },
    }))
    app.use((ctx) => {
      ctx.body = { unreachable: true }
    })

    const response = await requestText(app, '/ok')
    const aggregate = emitted[0] as AggregateError

    expect(response.status).toBe(500)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([setupError, disposeError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('lets onDisposeError handle setup-cleanup failures', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handled: unknown[] = []
    const emitted: unknown[] = []
    root.nextScope = new TestScope({ disposeSyncError: disposeError })
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      setupScope: async () => {
        throw setupError
      },
      onDisposeError: (error, ctx) => {
        handled.push([error, ctx.path])
      },
    }))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(emitted).toEqual([setupError])
    expect(handled).toEqual([[disposeError, '/ok']])
  })

  it('aggregates setup cleanup failures when onDisposeError fails', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handlerError = new Error('logger failed')
    const emitted: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      setupScope: () => {
        throw setupError
      },
      onDisposeError: async () => {
        throw handlerError
      },
    }))

    const response = await requestText(app, '/ok')
    const aggregate = emitted[0] as AggregateError

    expect(response.status).toBe(500)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([
      setupError,
      disposeError,
      handlerError,
    ])
  })

  it('aggregates synchronous setup cleanup and onDisposeError failures', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handlerError = new Error('logger failed')
    const emitted: unknown[] = []
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: () => {
        throw disposeError
      },
      onDisposeError: () => {
        throw handlerError
      },
    }))

    const response = await requestText(app, '/ok')
    const aggregate = emitted[0] as AggregateError

    expect(response.status).toBe(500)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([
      setupError,
      disposeError,
      handlerError,
    ])
  })

  it('registers cleanup before downstream middleware runs', async () => {
    const root = new TestRoot()
    let finishListeners = 0
    let closeListeners = 0
    const app = new Koa()
      .use(inferdiKoa({ container: root }))
      .use((ctx) => {
        finishListeners = ctx.res.listenerCount('finish')
        closeListeners = ctx.res.listenerCount('close')
        ctx.body = { ok: true }
      })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(finishListeners).toBeGreaterThan(0)
    expect(closeListeners).toBeGreaterThan(0)
  })

  it('removes the opposite listener and keeps cleanup idempotent', async () => {
    const root = new TestRoot()
    const app = inferdiKoa({ container: root })
    const res = new EventEmitter() as Context['res']
    const koaApp = new EventEmitter() as Context['app']
    const context = {
      app: koaApp,
      res,
      state: {},
    } as Context

    await app(context, async () => {})

    expect(res.listenerCount('finish')).toBe(1)
    expect(res.listenerCount('close')).toBe(1)

    const finish = res.listeners('finish')[0] as () => void
    const close = res.listeners('close')[0] as () => void
    finish()
    close()
    await tick()

    expect(res.listenerCount('close')).toBe(0)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('supports synchronous response disposal hooks', async () => {
    const root = new TestRoot()
    const disposed: TestScope[] = []
    const app = new Koa()
      .use(inferdiKoa({
        container: root,
        disposeScope: (scope, ctx) => {
          expect(ctx.state.di).toBe(scope)
          disposed.push(scope)
        },
      }))
      .use((ctx) => {
        ctx.body = { ok: true }
      })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(disposed).toEqual([root.scopes[0]])
  })

  it('keeps the scope alive for stream bodies until response completion', async () => {
    const root = new TestRoot()
    const started = deferred<PassThrough>()
    let scope: TestScope | undefined
    const app = new Koa<AppState>()

    app.use(inferdiKoa({ container: root }))
    app.use((ctx) => {
      const body = new PassThrough()
      scope = ctx.state.di
      ctx.body = body
      body.write('hello ')
      started.resolve(body)
    })

    const response = await withServer(app, async (baseUrl) => {
      const pending = fetch(`${baseUrl}/stream`)
      const stream = await started.promise
      expect(scope?.disposeCalls).toBe(0)
      stream.end('world')

      const result = await pending
      const body = await result.text()
      await tick()
      return { body, status: result.status }
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe('hello world')
    expect(scope?.disposeCalls).toBe(1)
  })

  it('runs cleanup exactly once when the connection closes early', async () => {
    const cleaned = deferred()
    const root = new TestRoot()
    root.nextScope = new TestScope({ onDispose: cleaned.resolve })
    const started = deferred<PassThrough>()
    const app = new Koa<AppState>()

    app.use(inferdiKoa({ container: root }))
    app.use((ctx) => {
      const body = new PassThrough()
      ctx.body = body
      body.write('chunk')
      started.resolve(body)
    })

    await withServer(app, async (baseUrl) => {
      await new Promise<void>((resolve, reject) => {
        const req = httpRequest(`${baseUrl}/stream`, (res) => {
          res.once('data', () => {
            req.destroy()
            resolve()
          })
        })
        req.once('error', reject)
        req.end()
      })

      const stream = await started.promise
      stream.destroy()
      await cleaned.promise
    })

    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('preserves downstream Koa error handling and still disposes', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const emitted: unknown[] = []
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(async (ctx, next) => {
      try {
        await next()
      } catch (error) {
        ctx.status = 409
        ctx.body = { message: (error as Error).message }
        ctx.app.emit('error', error, ctx)
      }
    })
    app.use(inferdiKoa({ container: root }))
    app.use(() => {
      throw routeError
    })

    const response = await requestJson(app, '/boom')

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ message: 'route failed' })
    expect(emitted).toEqual([routeError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('emits response cleanup failures through Koa error events', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const emitted: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({ container: root }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(emitted).toEqual([disposeError])
  })

  it('swallows cleanup reporting failures after response completion', async () => {
    const root = new TestRoot()
    root.nextScope = new TestScope({
      disposeError: new Error('dispose failed'),
    })
    const app = new Koa()

    app.use(inferdiKoa({ container: root }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestJson(app, '/ok')
    await tick()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('calls onDisposeError with the typed Koa context', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handled: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Koa<AppState>()

    app.use(inferdiKoa({
      container: root,
      onDisposeError: (error, ctx) => {
        handled.push([error, ctx.state.di, ctx.path])
      },
    }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(handled).toEqual([[disposeError, root.scopes[0], '/ok']])
  })

  it('emits an aggregate when onDisposeError rejects during response cleanup', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('logger failed')
    const emitted: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      onDisposeError: async () => {
        throw handlerError
      },
    }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestJson(app, '/ok')
    const aggregate = emitted[0] as AggregateError

    expect(response.status).toBe(200)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([disposeError, handlerError])
  })

  it('supports boolean and predicate autoDispose controls', async () => {
    const booleanRoot = new TestRoot()
    const predicateRoot = new TestRoot()
    const booleanApp = new Koa()
      .use(inferdiKoa({
        container: booleanRoot,
        autoDispose: false,
      }))
      .use((ctx) => {
        ctx.body = { ok: true }
      })
    const predicateApp = new Koa()
      .use(inferdiKoa({
        container: predicateRoot,
        autoDispose: (ctx) => ctx.path !== '/manual',
      }))
      .use((ctx) => {
        ctx.body = { ok: true }
      })

    await requestJson(booleanApp, '/manual')
    await requestJson(predicateApp, '/manual')
    await requestJson(predicateApp, '/auto')

    expect(booleanRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[1]?.disposeCalls).toBe(1)
  })

  it('routes autoDispose predicate failures through cleanup handling', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const disposeError = new Error('dispose failed')
    const emitted: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      autoDispose: async () => {
        throw predicateError
      },
    }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestJson(app, '/ok')
    const aggregate = emitted[0] as AggregateError

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([predicateError, disposeError])
  })

  it('awaits async onDisposeError handling for autoDispose failures', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const handled: unknown[] = []
    const handledDone = deferred()
    const disposedDone = deferred()
    root.nextScope = new TestScope({ onDispose: disposedDone.resolve })
    const app = new Koa()

    app.use(inferdiKoa({
      container: root,
      autoDispose: () => {
        throw predicateError
      },
      onDisposeError: async (error, ctx) => {
        await delay(1)
        handled.push([error, ctx.path])
        handledDone.resolve()
      },
    }))
    app.use((ctx) => {
      ctx.body = { ok: true }
    })

    const response = await requestJson(app, '/ok')
    await handledDone.promise
    await disposedDone.promise

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(handled).toEqual([[predicateError, '/ok']])
  })

  it('skipInferdiDispose skips response cleanup for one request only', async () => {
    const root = new TestRoot()
    const app = new Koa()
      .use(inferdiKoa({ container: root }))
      .use((ctx) => {
        if (ctx.path === '/manual') {
          skipInferdiDispose(ctx)
        }
        ctx.body = { ok: true }
      })

    await requestJson(app, '/manual')
    await requestJson(app, '/auto')

    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)
  })

  it('skipInferdiDispose does not suppress setup-failure cleanup', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const emitted: unknown[] = []
    const app = new Koa()

    app.on('error', (error) => {
      emitted.push(error)
    })
    app.use(inferdiKoa({
      container: root,
      setupScope: (_scope, ctx) => {
        skipInferdiDispose(ctx)
        throw setupError
      },
    }))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(emitted).toEqual([setupError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })
})
