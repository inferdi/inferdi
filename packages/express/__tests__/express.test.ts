import { EventEmitter } from 'node:events'
import {
  createServer,
  request as httpRequest,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import {describe, expect, it, vi} from 'vitest'
import {
  inferdiExpress,
  skipInferdiDispose,
  type InferdiScope,
} from '../src/index'

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
  app: Express,
  run: (baseUrl: string) => Promise<T>,
) {
  const server = createServer(app)
  const baseUrl = await listen(server)
  try {
    return await run(baseUrl)
  } finally {
    await close(server)
  }
}

async function requestJson(app: Express, path: string, init?: RequestInit) {
  return withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, init)
    const body = await response.json()
    await tick()
    return { body, status: response.status }
  })
}

async function requestText(app: Express, path: string, init?: RequestInit) {
  return withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, init)
    const body = await response.text()
    await tick()
    return { body, status: response.status }
  })
}

function errorHandler(errors: unknown[]) {
  return (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    errors.push(error)
    if (!res.headersSent) {
      res.status(500).send('error')
      return
    }
    res.end()
  }
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

describe('@inferdi/express', () => {
  it('creates one request scope and disposes it after a successful response', async () => {
    const root = new TestRoot()
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/users/:id', (req, res) => {
      res.json(req.di.get('users').profile(req.params.id))
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
    const app = express()

    app.use(inferdiExpress({
      container: root,
      setupScope: (scope, req) => {
        scope.requestId = req.get('x-request-id') ?? ''
      },
    }))
    app.get('/users/:id', (req, res) => {
      res.json(req.di.get('users').profile(req.params.id))
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

  it('uses custom async createScope, setupScope, and disposeScope hooks', async () => {
    const root = new TestRoot()
    const customScope = new TestScope()
    const disposed = deferred<TestScope>()
    const app = express()

    app.use(inferdiExpress({
      container: root,
      createScope: async (receivedRoot, req, res) => {
        expect(receivedRoot).toBe(root)
        expect(req.path).toBe('/users/8')
        expect(res.headersSent).toBe(false)
        await delay(1)
        return customScope
      },
      setupScope: async (scope, req) => {
        await delay(1)
        scope.requestId = req.get('x-request-id') ?? ''
      },
      disposeScope: async (scope, req, res) => {
        expect(req.di).toBe(scope)
        expect(res.headersSent).toBe(true)
        await delay(1)
        disposed.resolve(scope)
      },
    }))
    app.get('/users/:id', (req, res) => {
      res.json(req.di.get('users').profile(req.params.id))
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
    const errors: unknown[] = []
    root.createScopeError = createError
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/ok', (_req, res) => {
      res.json({ ok: true })
    })
    app.use(errorHandler(errors))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(errors).toEqual([createError])
    expect(root.scopes).toHaveLength(0)
  })

  it('forwards default createScope failures when setupScope is configured', () => {
    const root = new TestRoot()
    const createError = new Error('create failed')
    root.createScopeError = createError
    const app = inferdiExpress({
      container: root,
      setupScope: () => {},
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })

    expect(failure).toBe(createError)
    expect(root.scopes).toHaveLength(0)
  })

  it('uses custom synchronous createScope hooks', () => {
    const root = new TestRoot()
    const customScope = new TestScope()
    const app = inferdiExpress({
      container: root,
      createScope: () => customScope,
      disposeScope: () => {},
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let nextCalls = 0

    app(req, res, (error) => {
      expect(error).toBeUndefined()
      nextCalls += 1
    })
    res.emit('finish')

    expect(nextCalls).toBe(1)
    expect(req.di).toBe(customScope)
    expect(root.createScopeCalls).toBe(0)
  })

  it('forwards custom synchronous createScope failures', () => {
    const root = new TestRoot()
    const createError = new Error('custom create failed')
    const app = inferdiExpress({
      container: root,
      createScope: () => {
        throw createError
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })

    expect(failure).toBe(createError)
    expect(root.createScopeCalls).toBe(0)
  })

  it('disposes a half-built scope when setupScope fails', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const errors: unknown[] = []
    const app = express()

    app.use(inferdiExpress({
      container: root,
      setupScope: () => {
        throw setupError
      },
    }))
    app.get('/ok', (_req, res) => {
      res.json({ unreachable: true })
    })
    app.use(errorHandler(errors))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(errors).toEqual([setupError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('disposes a half-built scope when async setupScope rejects', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const app = inferdiExpress({
      container: root,
      setupScope: async () => {
        throw setupError
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })
    await tick()

    expect(failure).toBe(setupError)
    expect(Object.prototype.hasOwnProperty.call(req, 'di')).toBe(false)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('disposes a half-built scope with synchronous setup-cleanup', () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposed: TestScope[] = []
    const app = inferdiExpress({
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: (scope) => {
        disposed.push(scope)
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })

    expect(failure).toBe(setupError)
    expect(disposed).toEqual([root.scopes[0]])
    expect(Object.prototype.hasOwnProperty.call(req, 'di')).toBe(false)
  })

  it('surfaces only the setup error and logs the setup-cleanup failure', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const errors: unknown[] = []
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = express()

    try {
      app.use(inferdiExpress({
        container: root,
        setupScope: () => {
          throw setupError
        },
      }))
      app.use(errorHandler(errors))

      const response = await requestText(app, '/ok')

      expect(response.status).toBe(500)
      expect(errors).toEqual([setupError])
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to dispose InferDI Express request scope',
        disposeError,
      )
      expect(root.scopes[0]?.disposeCalls).toBe(1)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('routes setup-cleanup failures through onDisposeError', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handled: unknown[] = []
    const errors: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = express()

    app.use(inferdiExpress({
      container: root,
      setupScope: () => {
        throw setupError
      },
      onDisposeError: (error) => {
        handled.push(error)
      },
    }))
    app.use(errorHandler(errors))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    // onDisposeError handled the cleanup failure, so only the original setup
    // error surfaces — no AggregateError.
    expect(errors).toEqual([setupError])
    expect(handled).toEqual([disposeError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('registers cleanup before downstream middleware runs', async () => {
    const root = new TestRoot()
    let finishListeners = 0
    let closeListeners = 0
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/ok', (_req, res) => {
      finishListeners = res.listenerCount('finish')
      closeListeners = res.listenerCount('close')
      res.json({ ok: true })
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(finishListeners).toBeGreaterThan(0)
    expect(closeListeners).toBeGreaterThan(0)
  })

  it('calls next synchronously on the default path', () => {
    const root = new TestRoot()
    const app = inferdiExpress({
      container: root,
      disposeScope: () => {},
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    const calls: string[] = []

    app(req, res, (error) => {
      expect(error).toBeUndefined()
      calls.push('next')
    })
    calls.push('after')
    res.emit('finish')

    expect(calls).toEqual(['next', 'after'])
    expect(res.listenerCount('finish')).toBe(0)
    expect(res.listenerCount('close')).toBe(0)
  })

  it('disposes activation failures from async createScope hooks', async () => {
    const root = new TestRoot()
    const activationError = new Error('response listener failed')
    const app = inferdiExpress({
      container: root,
      createScope: async (receivedRoot) => receivedRoot.createScope(),
    })
    const req = {} as Request
    const res = {
      destroyed: false,
      on: () => {
        throw activationError
      },
      removeListener: () => {},
    } as unknown as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })
    await tick()

    expect(failure).toBe(activationError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(Object.prototype.hasOwnProperty.call(req, 'di')).toBe(false)
  })

  it('disposes activation failures after async setupScope hooks', async () => {
    const root = new TestRoot()
    const activationError = new Error('response listener failed')
    const app = inferdiExpress({
      container: root,
      setupScope: async () => {},
    })
    const req = {} as Request
    const res = {
      destroyed: false,
      on: () => {
        throw activationError
      },
      removeListener: () => {},
    } as unknown as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })
    await tick()

    expect(failure).toBe(activationError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(Object.prototype.hasOwnProperty.call(req, 'di')).toBe(false)
  })

  it('disposes when req.di cannot be assigned', async () => {
    const root = new TestRoot()
    const app = inferdiExpress({ container: root })
    const req = Object.defineProperty({}, 'di', {
      configurable: true,
      value: undefined,
      writable: false,
    }) as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let failure: unknown

    app(req, res, (error) => {
      failure = error
    })
    await tick()

    expect(failure).toBeInstanceOf(TypeError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(Object.prototype.hasOwnProperty.call(req, 'di')).toBe(false)
  })

  it('removes the opposite listener and keeps cleanup idempotent', async () => {
    const root = new TestRoot()
    const app = inferdiExpress({ container: root })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response

    await new Promise<void>((resolve, reject) => {
      app(req, res, (error) => {
        if (error !== undefined) {
          reject(error)
          return
        }
        resolve()
      })
    })

    expect(res.listenerCount('finish')).toBe(1)
    expect(res.listenerCount('close')).toBe(1)

    const finish = res.listeners('finish')[0] as () => void
    const close = res.listeners('close')[0] as () => void
    finish()
    close()
    await tick()

    expect(res.listenerCount('finish')).toBe(0)
    expect(res.listenerCount('close')).toBe(0)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('runs cleanup when the response was destroyed during async setup', async () => {
    const root = new TestRoot()
    const cleaned = deferred()
    const next = vi.fn()
    root.nextScope = new TestScope({ onDispose: cleaned.resolve })
    const app = inferdiExpress({
      container: root,
      setupScope: async (_scope, req) => {
        skipInferdiDispose(req)
        await delay(1)
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: true,
      writableEnded: false,
    }) as Response

    app(req, res, next)
    await cleaned.promise

    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(next).not.toHaveBeenCalled()
  })

  it('force-cleans when the response is destroyed immediately after listeners attach', () => {
    const root = new TestRoot()
    const app = inferdiExpress({ container: root })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    const originalOn = res.on.bind(res)
    const next = vi.fn()

    res.on = ((event: string | symbol, listener: (...args: any[]) => void) => {
      const result = originalOn(event, listener)
      if (event === 'close') {
        res.destroyed = true
      }
      return result
    }) as Response['on']

    app(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.listenerCount('finish')).toBe(0)
    expect(res.listenerCount('close')).toBe(0)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('supports synchronous response disposal hooks', async () => {
    const root = new TestRoot()
    const disposed: TestScope[] = []
    const app = express()

    app.use(inferdiExpress({
      container: root,
      disposeScope: (scope, req) => {
        expect(req.di).toBe(scope)
        disposed.push(scope)
      },
    }))
    app.get('/ok', (_req, res) => {
      res.json({ ok: true })
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(disposed).toEqual([root.scopes[0]])
  })

  it('does not attach response cleanup listeners when autoDispose is false', () => {
    const root = new TestRoot()
    const app = inferdiExpress({
      container: root,
      autoDispose: false,
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let nextCalls = 0

    app(req, res, (error) => {
      expect(error).toBeUndefined()
      nextCalls += 1
    })

    expect(nextCalls).toBe(1)
    expect(res.listenerCount('finish')).toBe(0)
    expect(res.listenerCount('close')).toBe(0)
    expect(root.scopes[0]?.disposeCalls).toBe(0)
  })

  it('force-cleans manual requests when the response is already destroyed', () => {
    const root = new TestRoot()
    const app = inferdiExpress({
      container: root,
      autoDispose: false,
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: true,
      writableEnded: false,
    }) as Response
    const next = vi.fn()

    app(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.listenerCount('finish')).toBe(0)
    expect(res.listenerCount('close')).toBe(0)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('surfaces the setup error and logs synchronous setup-cleanup failures', () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('sync cleanup failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const app = inferdiExpress({
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: () => {
        throw disposeError
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response
    let failure: unknown

    try {
      app(req, res, (error) => {
        failure = error
      })

      expect(failure).toBe(setupError)
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to dispose InferDI Express request scope',
        disposeError,
      )
      expect(Object.prototype.hasOwnProperty.call(req, 'di')).toBe(false)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('runs cleanup exactly once when the connection closes early', async () => {
    const cleaned = deferred()
    const root = new TestRoot()
    root.nextScope = new TestScope({ onDispose: cleaned.resolve })
    const wrote = deferred()
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/stream', (_req, res) => {
      res.write('chunk')
      wrote.resolve()
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

      await wrote.promise
      await cleaned.promise
    })

    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('preserves Express error handling and still disposes', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const errors: unknown[] = []
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/boom', async () => {
      throw routeError
    })
    app.use((
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      errors.push(error)
      res.status(409).json({ message: (error as Error).message })
    })

    const response = await requestJson(app, '/boom')

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ message: 'route failed' })
    expect(errors).toEqual([routeError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('keeps skipInferdiDispose honored on a handled route error (documented limitation)', async () => {
    // Express middleware is callback-style: `next()` returns no downstream
    // completion promise, so this middleware cannot observe a route exception.
    // Cleanup fires on the Node response `finish`/`close` event, where a handled
    // error (the error handler produced a response) is indistinguishable from a
    // normal response. Unlike Fastify/Koa/Hono/Elysia, Express therefore keeps
    // `skipInferdiDispose` honored even when the route fails. Documented in the
    // README; asserted here so the trade-off stays explicit.
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const errors: unknown[] = []
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/boom', (req, _res, next) => {
      skipInferdiDispose(req)
      next(routeError)
    })
    app.use((
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      errors.push(error)
      res.status(409).json({ message: (error as Error).message })
    })

    const response = await requestJson(app, '/boom')

    expect(response.status).toBe(409)
    expect(errors).toEqual([routeError])
    // The skip marker is honored despite the failure — the leak the other
    // adapters prevent is the documented Express trade-off.
    expect(root.scopes[0]?.disposeCalls).toBe(0)
  })

  it('does not emit unhandled rejections for response cleanup failures', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason)
    }
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = express()

    process.on('unhandledRejection', onUnhandled)
    try {
      app.use(inferdiExpress({ container: root }))
      app.get('/ok', (_req, res) => {
        res.json({ ok: true })
      })

      const response = await requestJson(app, '/ok')
      await tick()

      expect(response.status).toBe(200)
      expect(root.scopes[0]?.disposeCalls).toBe(1)
      expect(unhandled).toEqual([])
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to dispose InferDI Express request scope',
        disposeError,
      )
    } finally {
      process.off('unhandledRejection', onUnhandled)
      consoleError.mockRestore()
    }
  })

  it('calls onDisposeError with the request and response', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handled: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = express()

    app.use(inferdiExpress({
      container: root,
      onDisposeError: (error, req, res) => {
        handled.push([error, req.di, req.path, res.headersSent])
      },
    }))
    app.get('/ok', (_req, res) => {
      res.json({ ok: true })
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(handled).toEqual([[disposeError, root.scopes[0], '/ok', true]])
  })

  it('falls back to console.error when onDisposeError rejects', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('logger failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = express()

    try {
      app.use(inferdiExpress({
        container: root,
        onDisposeError: async () => {
          throw handlerError
        },
      }))
      app.get('/ok', (_req, res) => {
        res.json({ ok: true })
      })

      const response = await requestJson(app, '/ok')
      const aggregate = consoleError.mock.calls[0]?.[1] as AggregateError

      expect(response.status).toBe(200)
      expect(aggregate).toBeInstanceOf(AggregateError)
      expect(aggregate.errors).toEqual([disposeError, handlerError])
    } finally {
      consoleError.mockRestore()
    }
  })

  it('swallows fallback logging failures after response completion', async () => {
    const root = new TestRoot()
    root.nextScope = new TestScope({
      disposeError: new Error('dispose failed'),
    })
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {
        throw new Error('logger failed')
      })
    const app = express()

    try {
      app.use(inferdiExpress({ container: root }))
      app.get('/ok', (_req, res) => {
        res.json({ ok: true })
      })

      const response = await requestJson(app, '/ok')

      expect(response.status).toBe(200)
      expect(root.scopes[0]?.disposeCalls).toBe(1)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('logs synchronous response cleanup and handler failures', () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('handler failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const app = inferdiExpress({
      container: root,
      disposeScope: () => {
        throw disposeError
      },
      onDisposeError: () => {
        throw handlerError
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response

    try {
      app(req, res, () => {})
      res.emit('finish')

      const aggregate = consoleError.mock.calls[0]?.[1] as AggregateError
      expect(aggregate).toBeInstanceOf(AggregateError)
      expect(aggregate.errors).toEqual([disposeError, handlerError])
    } finally {
      consoleError.mockRestore()
    }
  })

  it('supports boolean and predicate autoDispose controls', async () => {
    const booleanRoot = new TestRoot()
    const predicateRoot = new TestRoot()
    const booleanApp = express()
    const predicateApp = express()

    booleanApp.use(inferdiExpress({
      container: booleanRoot,
      autoDispose: false,
    }))
    booleanApp.get('/manual', (_req, res) => {
      res.json({ ok: true })
    })

    predicateApp.use(inferdiExpress({
      container: predicateRoot,
      autoDispose: (req) => req.path !== '/manual',
    }))
    predicateApp.get('/:mode', (_req, res) => {
      res.json({ ok: true })
    })

    await requestJson(booleanApp, '/manual')
    await requestJson(predicateApp, '/manual')
    await requestJson(predicateApp, '/auto')

    expect(booleanRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[1]?.disposeCalls).toBe(1)
  })

  it('supports async autoDispose predicates that skip disposal', async () => {
    const root = new TestRoot()
    const app = inferdiExpress({
      container: root,
      autoDispose: async () => false,
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response

    app(req, res, () => {})
    res.emit('finish')
    await tick()

    expect(root.scopes[0]?.disposeCalls).toBe(0)
  })

  it('routes synchronous autoDispose predicate failures through cleanup handling', () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const handled: unknown[] = []
    const app = inferdiExpress({
      container: root,
      disposeScope: () => {},
      autoDispose: () => {
        throw predicateError
      },
      onDisposeError: (error) => {
        handled.push(error)
      },
    })
    const req = {} as Request
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writableEnded: false,
    }) as Response

    app(req, res, () => {})
    res.emit('finish')

    expect(handled).toEqual([predicateError])
  })

  it('routes autoDispose predicate failures through cleanup handling', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const disposeError = new Error('dispose failed')
    const handled: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = express()

    app.use(inferdiExpress({
      container: root,
      autoDispose: async () => {
        throw predicateError
      },
      onDisposeError: (error, req) => {
        handled.push([error, req.path])
      },
    }))
    app.get('/ok', (_req, res) => {
      res.json({ ok: true })
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    // onDisposeError is a per-error sink: the predicate failure and the dispose
    // failure are reported separately.
    expect(handled).toEqual([
      [predicateError, '/ok'],
      [disposeError, '/ok'],
    ])
  })

  it('awaits an async onDisposeError for autoDispose predicate failures', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const handled: unknown[] = []
    const app = express()

    app.use(inferdiExpress({
      container: root,
      autoDispose: () => {
        throw predicateError
      },
      onDisposeError: async (error) => {
        await Promise.resolve()
        handled.push(error)
      },
    }))
    app.get('/ok', (_req, res) => {
      res.json({ ok: true })
    })

    const response = await requestJson(app, '/ok')

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(handled).toEqual([predicateError])
  })

  it('skipInferdiDispose skips response cleanup for one request only', async () => {
    const root = new TestRoot()
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/:mode', (req, res) => {
      if (req.params.mode === 'manual') {
        skipInferdiDispose(req)
      }
      res.json({ ok: true })
    })

    await requestJson(app, '/manual')
    await requestJson(app, '/auto')

    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)
  })

  it('skipInferdiDispose does not suppress setup-failure cleanup', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const errors: unknown[] = []
    const app = express()

    app.use(inferdiExpress({
      container: root,
      setupScope: (_scope, req) => {
        skipInferdiDispose(req)
        throw setupError
      },
    }))
    app.use(errorHandler(errors))

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(errors).toEqual([setupError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('exposes req.di to setup-failure disposeScope and clears it before error handlers', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const errors: unknown[] = []
    let cleanupDi: unknown
    let errorHandlerSawDi = false
    const app = express()

    app.use(inferdiExpress({
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: (scope, req) => {
        cleanupDi = req.di
        return scope.dispose()
      },
    }))
    app.use((
      error: unknown,
      req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      errors.push(error)
      errorHandlerSawDi = Object.prototype.hasOwnProperty.call(req, 'di')
      res.status(500).send('error')
    })

    const response = await requestText(app, '/ok')

    expect(response.status).toBe(500)
    expect(errors).toEqual([setupError])
    expect(cleanupDi).toBe(root.scopes[0])
    expect(errorHandlerSawDi).toBe(false)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })
})
