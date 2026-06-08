import { Hono, type Context } from 'hono'
import {describe, expect, it, vi} from 'vitest'
import {
  inferdiHono,
  skipInferdiDispose,
  type InferdiHonoEnv,
  type InferdiScope,
} from '../src/index'

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

class SyncScope implements InferdiScope {
  disposeCalls = 0

  constructor(private readonly disposeError?: Error) {}

  dispose() {
    this.disposeCalls += 1
    if (this.disposeError !== undefined) {
      throw this.disposeError
    }
  }
}

class SingleScopeRoot<Scope extends InferdiScope> {
  createScopeCalls = 0

  constructor(readonly scope: Scope) {}

  createScope() {
    this.createScopeCalls += 1
    return this.scope
  }
}

function json(error: Error, c: Context, status = 500) {
  return c.json({ message: error.message }, status as 500)
}

describe('@inferdi/hono', () => {
  it('creates one request scope and disposes it after a successful response', async () => {
    const root = new TestRoot()
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({ container: root }))
    app.get('/users/:id', async (c) => {
      return c.json(c.var.di.get('users').profile(c.req.param('id')))
    })

    const response = await app.request('/users/42')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '42', requestId: '' })
    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(root.scopes[0]?.disposed).toBe(true)
  })

  it('keeps scoped state isolated between requests', async () => {
    const root = new TestRoot()
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({
      container: root,
      setupScope: (scope, c) => {
        scope.requestId = c.req.header('x-request-id') ?? ''
      },
    }))
    app.get('/users/:id', async (c) => {
      return c.json(c.var.di.get('users').profile(c.req.param('id')))
    })

    const first = await app.request('/users/1', {
      headers: { 'x-request-id': 'first' },
    })
    const second = await app.request('/users/2', {
      headers: { 'x-request-id': 'second' },
    })

    expect(await first.json()).toEqual({ id: '1', requestId: 'first' })
    expect(await second.json()).toEqual({ id: '2', requestId: 'second' })
    expect(root.scopes).toHaveLength(2)
    expect(root.scopes[0]).not.toBe(root.scopes[1])
    expect(root.scopes.map((scope) => scope.disposeCalls)).toEqual([1, 1])
  })

  it('supports a custom Hono context key', async () => {
    const root = new TestRoot()
    const app = new Hono<InferdiHonoEnv<TestRoot, 'container'>>()

    app.use('*', inferdiHono({ container: root, key: 'container' }))
    app.get('/users/:id', async (c) => {
      return c.json(c.get('container').get('users').profile(c.req.param('id')))
    })

    const response = await app.request('/users/7')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '7', requestId: '' })
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('uses custom async createScope, setupScope, and disposeScope hooks', async () => {
    const root = new TestRoot()
    const customScope = new TestScope()
    const disposed: TestScope[] = []
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({
      container: root,
      createScope: async (receivedRoot, c) => {
        expect(receivedRoot).toBe(root)
        expect(c.req.path).toBe('/users/8')
        await delay(1)
        return customScope
      },
      setupScope: async (scope, c) => {
        await delay(1)
        scope.requestId = c.req.header('x-request-id') ?? ''
      },
      disposeScope: async (scope, c) => {
        expect(c.var.di).toBe(scope)
        await delay(1)
        disposed.push(scope)
      },
    }))
    app.get('/users/:id', async (c) => {
      return c.json(c.var.di.get('users').profile(c.req.param('id')))
    })

    const response = await app.request('/users/8', {
      headers: { 'x-request-id': 'custom' },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '8', requestId: 'custom' })
    expect(root.createScopeCalls).toBe(0)
    expect(disposed).toEqual([customScope])
  })

  it('forwards createScope failures without disposing', async () => {
    const root = new TestRoot()
    const createError = new Error('create failed')
    let handledError: Error | undefined
    root.createScopeError = createError
    const app = new Hono()

    app.use('*', inferdiHono({ container: root }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c, 503)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ message: 'create failed' })
    expect(handledError).toBe(createError)
    expect(root.scopes).toHaveLength(0)
  })

  it('disposes a half-built scope when setupScope fails', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    let handledError: Error | undefined
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      setupScope: () => {
        throw setupError
      },
    }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c, 418)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(418)
    expect(handledError).toBe(setupError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('supports synchronous setup cleanup hooks', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    let handledError: Error | undefined
    let disposed = false
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      setupScope: () => {
        throw setupError
      },
      disposeScope: () => {
        disposed = true
      },
    }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c, 418)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(418)
    expect(handledError).toBe(setupError)
    expect(disposed).toBe(true)
  })

  it('surfaces only the setup error and logs the cleanup failure', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      setupScope: async () => {
        throw setupError
      },
    }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(500)
    expect(handledError).toBe(setupError)
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to dispose InferDI Hono request scope',
      disposeError,
    )
    errorSpy.mockRestore()
  })

  it('disposes after handled route errors without replacing the response', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    let handledError: Error | undefined
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({ container: root }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c, 409)
    })
    app.get('/boom', () => {
      throw routeError
    })

    const response = await app.request('/boom')

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ message: 'route failed' })
    expect(handledError).toBe(routeError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('logs disposal errors by default without replacing the response', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({ container: root }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(handledError).toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to dispose InferDI Hono request scope',
      disposeError,
    )

    errorSpy.mockRestore()
  })

  it('logs synchronous disposeScope throws by default', async () => {
    const root = new TestRoot()
    const disposeError = new Error('sync dispose failed')
    let handledError: Error | undefined
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({
      container: root,
      disposeScope: () => {
        throw disposeError
      },
    }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(handledError).toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to dispose InferDI Hono request scope',
      disposeError,
    )

    errorSpy.mockRestore()
  })

  it('swallows fallback logging failures after the response is produced', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('logger failed')
    })

    app.use('*', inferdiHono({ container: root }))
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('propagates the route error and logs disposal failures separately', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const disposeError = new Error('dispose failed')
    const handled: Error[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({ container: root }))
    app.onError((error, c) => {
      handled.push(error)
      return json(error, c)
    })
    app.get('/boom', () => {
      throw routeError
    })

    const response = await app.request('/boom')

    expect(response.status).toBe(500)
    // The route error reaches onError once; the dispose error is logged, never
    // aggregated into the response.
    expect(handled).toEqual([routeError])
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to dispose InferDI Hono request scope',
      disposeError,
    )

    errorSpy.mockRestore()
  })

  it('lets onDisposeError swallow cleanup failures', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const logged: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      onDisposeError: (error, c) => {
        logged.push(error)
        expect(c.req.path).toBe('/ok')
      },
    }))
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(logged).toEqual([disposeError])
  })

  it('lets an async onDisposeError handle cleanup failures', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const logged: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      onDisposeError: async (error) => {
        await Promise.resolve()
        logged.push(error)
      },
    }))
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(logged).toEqual([disposeError])
  })

  it('logs an aggregate when onDisposeError throws, still propagating the route error', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('logger failed')
    const handled: Error[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({
      container: root,
      onDisposeError: () => {
        throw handlerError
      },
    }))
    app.onError((error, c) => {
      handled.push(error)
      return json(error, c)
    })
    app.get('/boom', () => {
      throw routeError
    })

    const response = await app.request('/boom')
    const aggregate = errorSpy.mock.calls[0]?.[1] as AggregateError

    expect(response.status).toBe(500)
    expect(handled).toEqual([routeError])
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([disposeError, handlerError])

    errorSpy.mockRestore()
  })

  it('logs an aggregate when an async onDisposeError rejects', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('async logger failed')
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({
      container: root,
      onDisposeError: async () => {
        throw handlerError
      },
    }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')
    const aggregate = errorSpy.mock.calls[0]?.[1] as AggregateError

    expect(response.status).toBe(200)
    expect(handledError).toBeUndefined()
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([disposeError, handlerError])

    errorSpy.mockRestore()
  })

  it('clears c.var[key] before the error handler runs on a setupScope failure', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    let scopeInErrorHandler: unknown = 'unset'
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({
      container: root,
      setupScope: () => {
        throw setupError
      },
    }))
    app.onError((error, c) => {
      scopeInErrorHandler = c.var.di
      return json(error, c, 418)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(418)
    expect(scopeInErrorHandler).toBeUndefined()
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('supports boolean and predicate autoDispose controls', async () => {
    const booleanRoot = new TestRoot()
    const predicateRoot = new TestRoot()
    const booleanApp = new Hono()
    const predicateApp = new Hono()

    booleanApp.use('*', inferdiHono({
      container: booleanRoot,
      autoDispose: false,
    }))
    booleanApp.get('/manual', (c) => c.json({ ok: true }))

    predicateApp.use('*', inferdiHono({
      container: predicateRoot,
      autoDispose: (c) => c.req.path !== '/manual',
    }))
    predicateApp.get('/manual', (c) => c.json({ ok: true }))
    predicateApp.get('/auto', (c) => c.json({ ok: true }))

    await booleanApp.request('/manual')
    await predicateApp.request('/manual')
    await predicateApp.request('/auto')

    expect(booleanRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[1]?.disposeCalls).toBe(1)
  })

  it('supports an asynchronous autoDispose predicate', async () => {
    const root = new TestRoot()
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      autoDispose: async (c) => c.req.path !== '/manual',
    }))
    app.get('/manual', (c) => c.json({ ok: true }))
    app.get('/auto', (c) => c.json({ ok: true }))

    await app.request('/manual')
    await app.request('/auto')

    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)
  })

  it('logs an aggregate of autoDispose predicate and cleanup failures', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const disposeError = new Error('dispose failed')
    let handledError: Error | undefined
    root.nextScope = new TestScope({ disposeError })
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({
      container: root,
      autoDispose: async () => {
        throw predicateError
      },
    }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c)
    })
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')
    const aggregate = errorSpy.mock.calls[0]?.[1] as AggregateError

    expect(response.status).toBe(200)
    expect(handledError).toBeUndefined()
    expect(aggregate).toBeInstanceOf(AggregateError)
    expect(aggregate.errors).toEqual([predicateError, disposeError])

    errorSpy.mockRestore()
  })

  it('awaits an async onDisposeError for autoDispose predicate failures', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const handled: unknown[] = []
    const app = new Hono()

    app.use('*', inferdiHono({
      container: root,
      autoDispose: () => {
        throw predicateError
      },
      onDisposeError: async (error) => {
        await Promise.resolve()
        handled.push(error)
      },
    }))
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(handled).toEqual([predicateError])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('uses the default synchronous disposal path', async () => {
    const scope = new SyncScope()
    const root = new SingleScopeRoot(scope)
    const app = new Hono()

    app.use('*', inferdiHono({ container: root }))
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(scope.disposeCalls).toBe(1)
  })

  it('logs synchronous default disposal throws without replacing the response', async () => {
    const disposeError = new Error('sync default dispose failed')
    const scope = new SyncScope(disposeError)
    const root = new SingleScopeRoot(scope)
    const app = new Hono()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    app.use('*', inferdiHono({ container: root }))
    app.get('/ok', (c) => c.json({ ok: true }))

    const response = await app.request('/ok')

    expect(response.status).toBe(200)
    expect(scope.disposeCalls).toBe(1)
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to dispose InferDI Hono request scope',
      disposeError,
    )

    errorSpy.mockRestore()
  })

  it('rethrows the route error and logs cleanup failures separately', async () => {
    const root = new TestRoot()
    const nextError = new Error('next failed')
    const disposeError = new Error('dispose failed')
    root.nextScope = new TestScope({ disposeError })
    const middleware = inferdiHono({ container: root })
    const fakeContext = { set: () => {} } as unknown as Context
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      middleware(fakeContext, async () => {
        throw nextError
      }),
    ).rejects.toBe(nextError)

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to dispose InferDI Hono request scope',
      disposeError,
    )

    errorSpy.mockRestore()
  })

  it('rethrows the route error unchanged when cleanup succeeds', async () => {
    const root = new TestRoot()
    const nextError = new Error('next failed')
    const middleware = inferdiHono({ container: root })
    const fakeContext = { set: () => {} } as unknown as Context

    await expect(
      middleware(fakeContext, async () => {
        throw nextError
      }),
    ).rejects.toBe(nextError)

    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('skipInferdiDispose skips every middleware instance on a successful request', async () => {
    const firstRoot = new TestRoot()
    const secondRoot = new TestRoot()
    const app = new Hono<
      InferdiHonoEnv<TestRoot> & InferdiHonoEnv<TestRoot, 'other'>
    >()

    app.use('*', inferdiHono({ container: firstRoot }))
    app.use('*', inferdiHono({ container: secondRoot, key: 'other' }))
    app.get('/stream', (c) => {
      skipInferdiDispose(c)
      return c.json({ skipped: true })
    })

    const response = await app.request('/stream')

    expect(response.status).toBe(200)
    expect(firstRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(secondRoot.scopes[0]?.disposeCalls).toBe(0)
  })

  it('skipInferdiDispose does not skip disposal when the request fails', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    let handledError: Error | undefined
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({ container: root }))
    app.onError((error, c) => {
      handledError = error
      return json(error, c, 500)
    })
    app.get('/boom', (c) => {
      skipInferdiDispose(c)
      throw routeError
    })

    const response = await app.request('/boom')

    expect(response.status).toBe(500)
    expect(handledError).toBe(routeError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('skipInferdiDispose skips disposal for one request only', async () => {
    const root = new TestRoot()
    const app = new Hono<InferdiHonoEnv<TestRoot>>()

    app.use('*', inferdiHono({ container: root }))
    app.get('/stream', (c) => {
      skipInferdiDispose(c)
      return c.json({ skipped: true })
    })
    app.get('/normal', (c) => c.json({ skipped: false }))

    const skipped = await app.request('/stream')
    const normal = await app.request('/normal')

    expect(skipped.status).toBe(200)
    expect(normal.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)
  })
})
