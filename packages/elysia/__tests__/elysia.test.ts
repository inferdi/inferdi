import { Elysia, t } from 'elysia'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  inferdiElysia,
  skipInferdiDispose,
  type InferdiScope
} from '../src/index'

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function waitForAfterResponse() {
  await delay(5)
}

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init)
}

class TestScope implements InferdiScope {
  disposeCalls = 0
  disposed = false
  requestId = ''

  constructor(
    private readonly options: {
      readonly disposeDelay?: number
      readonly disposeError?: Error
    } = {}
  ) {}

  get(key: 'users') {
    return {
      profile: (id: string) => ({ id, requestId: this.requestId })
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

  get(key: 'health') {
    return {
      check: () => 'ok'
    }
  }
}

function jsonError(
  target: { value?: unknown },
  status = 500
) {
  return ({ error, set }: { error: Readonly<Error>, set: { status?: number } }) => {
    target.value = error
    set.status = status
    return { message: error.message }
  }
}

describe('@inferdi/elysia', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates one request scope and disposes it after a successful response', async () => {
    const root = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/users/:id', ({ di, params }) =>
        di.get('users').profile(params.id)
      )

    const response = await app.handle(request('/users/42'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '42', requestId: '' })
    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(root.scopes[0]?.disposed).toBe(true)
  })

  it('keeps scoped state isolated between requests', async () => {
    const root = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupScope: (scope, { request }) => {
          scope.requestId = request.headers.get('x-request-id') ?? ''
        }
      }))
      .get('/users/:id', ({ di, params }) =>
        di.get('users').profile(params.id)
      )

    const first = await app.handle(request('/users/1', {
      headers: { 'x-request-id': 'first' }
    }))
    const second = await app.handle(request('/users/2', {
      headers: { 'x-request-id': 'second' }
    }))
    await waitForAfterResponse()

    expect(await first.json()).toEqual({ id: '1', requestId: 'first' })
    expect(await second.json()).toEqual({ id: '2', requestId: 'second' })
    expect(root.scopes).toHaveLength(2)
    expect(root.scopes[0]).not.toBe(root.scopes[1])
    expect(root.scopes.map((scope) => scope.disposeCalls)).toEqual([1, 1])
  })

  it('supports a custom context key', async () => {
    const root = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: root, key: 'container' }))
      .get('/users/:id', ({ container, params }) =>
        container.get('users').profile(params.id)
      )

    const response = await app.handle(request('/users/7'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '7', requestId: '' })
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('uses custom async createScope, setupScope, and disposeScope hooks', async () => {
    const root = new TestRoot()
    const customScope = new TestScope()
    const disposed: TestScope[] = []
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        createScope: async (receivedRoot, context) => {
          expect(receivedRoot).toBe(root)
          expect(context.request.url).toBe('http://localhost/users/8')
          await delay(1)
          return customScope
        },
        setupScope: async (scope, context) => {
          await delay(1)
          scope.requestId = context.request.headers.get('x-request-id') ?? ''
        },
        disposeScope: async (scope, context) => {
          expect(context.di).toBe(scope)
          expect(context.phase).toBe('afterResponse')
          await delay(1)
          disposed.push(scope)
        }
      }))
      .get('/users/:id', ({ di, params }) =>
        di.get('users').profile(params.id)
      )

    const response = await app.handle(request('/users/8', {
      headers: { 'x-request-id': 'custom' }
    }))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '8', requestId: 'custom' })
    expect(root.createScopeCalls).toBe(0)
    expect(disposed).toEqual([customScope])
  })

  it('supports custom createScope without setupScope', async () => {
    const root = new TestRoot()
    const customScope = new TestScope()
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        createScope: () => customScope
      }))
      .get('/users/:id', ({ di, params }) =>
        di.get('users').profile(params.id)
      )

    const response = await app.handle(request('/users/9'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: '9', requestId: '' })
    expect(root.createScopeCalls).toBe(0)
    expect(customScope.disposeCalls).toBe(1)
  })

  it('supports synchronous default scope disposal', async () => {
    class SyncScope implements InferdiScope {
      disposeCalls = 0

      dispose() {
        this.disposeCalls += 1
      }
    }

    class SyncRoot {
      readonly scopes: SyncScope[] = []

      createScope() {
        const scope = new SyncScope()
        this.scopes.push(scope)
        return scope
      }
    }

    const root = new SyncRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('logs synchronous default-dispose throws without replacing the response', async () => {
    const disposeError = new Error('sync default dispose failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    class SyncThrowingScope implements InferdiScope {
      disposeCalls = 0

      dispose() {
        this.disposeCalls += 1
        throw disposeError
      }
    }

    class SyncThrowingRoot {
      readonly scopes: SyncThrowingScope[] = []

      createScope() {
        const scope = new SyncThrowingScope()
        this.scopes.push(scope)
        return scope
      }
    }

    const root = new SyncThrowingRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose InferDI Elysia request scope',
      {
        err: disposeError,
        phase: 'afterResponse'
      }
    )

    consoleError.mockRestore()
  })

  it('forwards createScope failures without disposing', async () => {
    const root = new TestRoot()
    const createError = new Error('create failed')
    const handled: { value?: unknown } = {}
    root.createScopeError = createError
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(jsonError(handled, 503))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ message: 'create failed' })
    expect(handled.value).toBe(createError)
    expect(root.scopes).toHaveLength(0)
  })

  it('disposes a half-built scope when setupScope fails', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupScope: () => {
          throw setupError
        }
      }))
      .onError(jsonError(handled, 418))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))

    expect(response.status).toBe(418)
    expect(handled.value).toBe(setupError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('surfaces only the setup error and logs the cleanup failure', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handled: { value?: unknown } = {}
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupScope: async () => {
          throw setupError
        }
      }))
      .onError(jsonError(handled))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))

    expect(response.status).toBe(500)
    expect(handled.value).toBe(setupError)
    expect(consoleError).toHaveBeenCalledOnce()
    const [, payload] = consoleError.mock.calls[0] ?? []
    expect(payload).toMatchObject({ phase: 'setup' })
    expect((payload as { err?: unknown }).err).toBe(disposeError)

    consoleError.mockRestore()
  })

  it('keeps setup errors when onDisposeError handles setup cleanup failures', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handled: { value?: unknown } = {}
    const logged: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupScope: () => {
          throw setupError
        },
        onDisposeError: async (error, context) => {
          await delay(1)
          logged.push([error, context.phase])
        }
      }))
      .onError(jsonError(handled, 409))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))

    expect(response.status).toBe(409)
    expect(handled.value).toBe(setupError)
    expect(logged).toEqual([[disposeError, 'setup']])
  })

  it('surfaces the setup error and logs synchronous onDisposeError failures', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handlerError = new Error('logger failed')
    const handled: { value?: unknown } = {}
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupScope: () => {
          throw setupError
        },
        onDisposeError: () => {
          throw handlerError
        }
      }))
      .onError(jsonError(handled))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))

    expect(response.status).toBe(500)
    expect(handled.value).toBe(setupError)
    expect(consoleError).toHaveBeenCalledOnce()
    const [, payload] = consoleError.mock.calls[0] ?? []
    expect(payload).toMatchObject({ phase: 'setup' })
    expect((payload as { err?: unknown }).err).toBeInstanceOf(AggregateError)
    expect(((payload as { err: AggregateError }).err).errors).toEqual([
      disposeError,
      handlerError
    ])
    expect(root.scopes[0]?.disposeCalls).toBe(1)

    consoleError.mockRestore()
  })

  it('surfaces the setup error and logs rejected onDisposeError failures', async () => {
    const root = new TestRoot()
    const setupError = new Error('setup failed')
    const disposeError = new Error('setup cleanup failed')
    const handlerError = new Error('async logger failed')
    const handled: { value?: unknown } = {}
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupScope: async () => {
          throw setupError
        },
        onDisposeError: async () => {
          throw handlerError
        }
      }))
      .onError(jsonError(handled))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))

    expect(response.status).toBe(500)
    expect(handled.value).toBe(setupError)
    expect(consoleError).toHaveBeenCalledOnce()
    const [, payload] = consoleError.mock.calls[0] ?? []
    expect(payload).toMatchObject({ phase: 'setup' })
    expect((payload as { err?: unknown }).err).toBeInstanceOf(AggregateError)
    expect(((payload as { err: AggregateError }).err).errors).toEqual([
      disposeError,
      handlerError
    ])

    consoleError.mockRestore()
  })

  it('disposes after handled route errors without replacing the response', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(jsonError(handled, 409))
      .get('/boom', () => {
        throw routeError
      })

    const response = await app.handle(request('/boom'))
    await waitForAfterResponse()

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ message: 'route failed' })
    expect(handled.value).toBe(routeError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('keeps the request scope alive for user onError handlers', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const observed: unknown[] = []
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(({ di, set }) => {
        observed.push([di.disposed, di.get('users').profile('error')])
        set.status = 409
        return { handled: true }
      })
      .get('/boom', () => {
        throw routeError
      })

    const response = await app.handle(request('/boom'))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ handled: true })
    expect(observed).toEqual([
      [false, { id: 'error', requestId: '' }]
    ])
    expect(root.scopes[0]?.disposeCalls).toBe(0)

    await waitForAfterResponse()

    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(root.scopes[0]?.disposed).toBe(true)
  })

  it('disposes after beforeHandle errors', async () => {
    const root = new TestRoot()
    const hookError = new Error('before failed')
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onBeforeHandle(() => {
        throw hookError
      })
      .onError(jsonError(handled, 410))
      .get('/boom', () => ({ unreachable: true }))

    const response = await app.handle(request('/boom'))
    await waitForAfterResponse()

    expect(response.status).toBe(410)
    expect(handled.value).toBe(hookError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('disposes after validation errors that happen after derive', async () => {
    const root = new TestRoot()
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(jsonError(handled, 422))
      .get('/needs-header', ({ di }) => di.get('users').profile('1'), {
        headers: t.Object({
          'x-user-id': t.String()
        })
      })

    const response = await app.handle(request('/needs-header'))
    await waitForAfterResponse()

    expect(response.status).toBe(422)
    expect(handled.value).toBeInstanceOf(Error)
    expect(root.createScopeCalls).toBe(1)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('runs setupValidatedScope after validation with the request scope', async () => {
    const root = new TestRoot()
    const calls: unknown[] = []
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupValidatedScope: (scope, context) => {
          calls.push([context.di === scope, context.headers['x-user-id']])
          scope.requestId = context.headers['x-user-id'] ?? ''
        }
      }))
      .get('/needs-header', ({ di }) => di.get('users').profile('1'), {
        headers: t.Object({
          'x-user-id': t.String()
        })
      })

    const response = await app.handle(request('/needs-header', {
      headers: { 'x-user-id': 'validated-user' }
    }))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: '1',
      requestId: 'validated-user'
    })
    expect(calls).toEqual([[true, 'validated-user']])
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('does not run setupValidatedScope when validation fails', async () => {
    const root = new TestRoot()
    const handled: { value?: unknown } = {}
    const setupValidatedScope = vi.fn()
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupValidatedScope
      }))
      .onError(jsonError(handled, 422))
      .get('/needs-header', ({ di }) => di.get('users').profile('1'), {
        headers: t.Object({
          'x-user-id': t.String()
        })
      })

    const response = await app.handle(request('/needs-header'))
    await waitForAfterResponse()

    expect(response.status).toBe(422)
    expect(handled.value).toBeInstanceOf(Error)
    expect(setupValidatedScope).not.toHaveBeenCalled()
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('disposes after setupValidatedScope failures without running the handler', async () => {
    const root = new TestRoot()
    const setupError = new Error('validated setup failed')
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        setupValidatedScope: () => {
          throw setupError
        }
      }))
      .onError(jsonError(handled, 409))
      .get('/needs-header', () => ({ unreachable: true }), {
        headers: t.Object({
          'x-user-id': t.String()
        })
      })

    const response = await app.handle(request('/needs-header', {
      headers: { 'x-user-id': 'validated-user' }
    }))
    await waitForAfterResponse()

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ message: 'validated setup failed' })
    expect(handled.value).toBe(setupError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('does not clean up when parsing fails before derive creates a scope', async () => {
    const root = new TestRoot()
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(jsonError(handled, 400))
      .post('/json', ({ di }) => di.get('users').profile('1'), {
        body: t.Object({
          name: t.String()
        })
      })

    const response = await app.handle(request('/json', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{'
    }))

    expect(response.status).toBe(400)
    expect(handled.value).toBeInstanceOf(Error)
    expect(root.createScopeCalls).toBe(0)
  })

  it('does not replace error responses when cleanup fails on the error path', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const disposeError = new Error('dispose failed')
    const handled: { value?: unknown } = {}
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(jsonError(handled, 409))
      .get('/boom', () => {
        throw routeError
      })

    const response = await app.handle(request('/boom'))
    await waitForAfterResponse()

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ message: 'route failed' })
    expect(handled.value).toBe(routeError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose InferDI Elysia request scope',
      {
        err: disposeError,
        phase: 'error'
      }
    )

    consoleError.mockRestore()
  })

  it('lets onDisposeError observe error-path cleanup failures', async () => {
    const root = new TestRoot()
    const routeError = new Error('route failed')
    const disposeError = new Error('dispose failed')
    const logged: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        onDisposeError: (error, context) => {
          logged.push([error, context.phase, context.error])
        }
      }))
      .onError(({ error, set }) => {
        set.status = 409
        return { message: error.message }
      })
      .get('/boom', () => {
        throw routeError
      })

    const response = await app.handle(request('/boom'))
    await waitForAfterResponse()

    expect(response.status).toBe(409)
    expect(logged).toEqual([[disposeError, 'error', routeError]])
  })

  it('logs afterResponse disposal errors by default', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose InferDI Elysia request scope',
      {
        err: disposeError,
        phase: 'afterResponse'
      }
    )

    consoleError.mockRestore()
  })

  it('logs custom disposeScope failures by default', async () => {
    const root = new TestRoot()
    const disposeError = new Error('custom dispose failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        disposeScope: () => {
          throw disposeError
        }
      }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to dispose InferDI Elysia request scope',
      {
        err: disposeError,
        phase: 'afterResponse'
      }
    )

    consoleError.mockRestore()
  })

  it('lets onDisposeError handle afterResponse cleanup failures', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const logged: unknown[] = []
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        onDisposeError: async (error, context) => {
          await delay(1)
          logged.push([error, context.phase])
        }
      }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(logged).toEqual([[disposeError, 'afterResponse']])
    expect(consoleError).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('handles synchronous disposeScope throws', async () => {
    const root = new TestRoot()
    const disposeError = new Error('sync dispose failed')
    const logged: unknown[] = []
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        disposeScope: () => {
          throw disposeError
        },
        onDisposeError: (error, context) => {
          logged.push([error, context.phase])
        }
      }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(logged).toEqual([[disposeError, 'afterResponse']])
  })

  it('supports boolean and predicate autoDispose controls', async () => {
    const booleanRoot = new TestRoot()
    const predicateRoot = new TestRoot()
    const booleanApp = new Elysia()
      .use(inferdiElysia({
        container: booleanRoot,
        autoDispose: false
      }))
      .get('/manual', () => ({ ok: true }))
    const predicateApp = new Elysia()
      .use(inferdiElysia({
        container: predicateRoot,
        autoDispose: (context) =>
          new URL(context.request.url).pathname !== '/manual'
      }))
      .get('/manual', () => ({ ok: true }))
      .get('/auto', () => ({ ok: true }))

    await booleanApp.handle(request('/manual'))
    await predicateApp.handle(request('/manual'))
    await predicateApp.handle(request('/auto'))
    await waitForAfterResponse()

    expect(booleanRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(predicateRoot.scopes[1]?.disposeCalls).toBe(1)
  })

  it('reports autoDispose failures and still attempts disposal', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const disposeError = new Error('dispose failed')
    const logged: unknown[] = []
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        autoDispose: async () => {
          throw predicateError
        },
        onDisposeError: async (error, context) => {
          logged.push([error, context.phase])
        }
      }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(logged).toEqual([
      [predicateError, 'afterResponse'],
      [disposeError, 'afterResponse']
    ])
  })

  it('logs aggregated cleanup errors by default', async () => {
    const root = new TestRoot()
    const predicateError = new Error('predicate failed')
    const disposeError = new Error('dispose failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        autoDispose: () => {
          throw predicateError
        }
      }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(consoleError).toHaveBeenCalledOnce()

    const [, payload] = consoleError.mock.calls[0] ?? []
    expect(payload).toMatchObject({ phase: 'afterResponse' })
    expect(
      (payload as { err?: unknown }).err
    ).toBeInstanceOf(AggregateError)
    expect(
      ((payload as { err: AggregateError }).err).errors
    ).toEqual([predicateError, disposeError])

    consoleError.mockRestore()
  })

  it('logs both cleanup and onDisposeError failures', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const handlerError = new Error('logger failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        onDisposeError: () => {
          throw handlerError
        }
      }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(consoleError).toHaveBeenCalledOnce()

    const [, payload] = consoleError.mock.calls[0] ?? []
    expect(payload).toMatchObject({ phase: 'afterResponse' })
    expect(
      (payload as { err?: unknown }).err
    ).toBeInstanceOf(AggregateError)
    expect(
      ((payload as { err: AggregateError }).err).errors
    ).toEqual([disposeError, handlerError])

    consoleError.mockRestore()
  })

  it('ignores failures from the default cleanup logger', async () => {
    const root = new TestRoot()
    const disposeError = new Error('dispose failed')
    const loggerError = new Error('logger failed')
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {
        throw loggerError
      })
    root.nextScope = new TestScope({ disposeError })
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/ok', () => ({ ok: true }))

    const response = await app.handle(request('/ok'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
    expect(consoleError).toHaveBeenCalledOnce()

    consoleError.mockRestore()
  })

  it('skipInferdiDispose skips disposal for one request only', async () => {
    const root = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/stream', (context) => {
        skipInferdiDispose(context)
        return { skipped: true }
      })
      .get('/normal', () => ({ skipped: false }))

    const skipped = await app.handle(request('/stream'))
    const normal = await app.handle(request('/normal'))
    await waitForAfterResponse()

    expect(skipped.status).toBe(200)
    expect(normal.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(root.scopes[1]?.disposeCalls).toBe(1)
  })

  it('skipInferdiDispose skips disposal with custom autoDispose settings', async () => {
    const root = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        autoDispose: true
      }))
      .get('/stream', (context) => {
        skipInferdiDispose(context)
        return { skipped: true }
      })

    const response = await app.handle(request('/stream'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(0)
  })

  it('skipInferdiDispose short-circuits the custom disposal path on success', async () => {
    const root = new TestRoot()
    let autoDisposeCalls = 0
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        /*
         * A predicate forces the custom `disposeOnce` path; skip must
         * short-circuit before the predicate is ever evaluated
         */
        autoDispose: () => {
          autoDisposeCalls += 1
          return true
        }
      }))
      .get('/stream', (context) => {
        skipInferdiDispose(context)
        return { skipped: true }
      })

    const response = await app.handle(request('/stream'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(root.scopes[0]?.disposeCalls).toBe(0)
    expect(autoDisposeCalls).toBe(0)
  })

  it('skipInferdiDispose does not skip disposal when the request fails', async () => {
    const root = new TestRoot()
    const routeError = new Error('stream setup failed')
    const handled: { value?: unknown } = {}
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .onError(jsonError(handled, 409))
      .get('/stream', (context) => {
        skipInferdiDispose(context)
        throw routeError
      })

    const response = await app.handle(request('/stream'))
    await waitForAfterResponse()

    expect(response.status).toBe(409)
    expect(handled.value).toBe(routeError)
    expect(root.scopes[0]?.disposeCalls).toBe(1)
  })

  it('skipInferdiDispose skips every plugin instance on the request', async () => {
    const firstRoot = new TestRoot()
    const secondRoot = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: firstRoot, key: 'first' }))
      .use(inferdiElysia({ container: secondRoot, key: 'second' }))
      .get('/stream', (context) => {
        skipInferdiDispose(context)
        return {
          same: context.first === context.second
        }
      })

    const response = await app.handle(request('/stream'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ same: false })
    expect(firstRoot.scopes[0]?.disposeCalls).toBe(0)
    expect(secondRoot.scopes[0]?.disposeCalls).toBe(0)
  })

  it('root-only mode exposes the root without request scopes', async () => {
    const root = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        scopePerRequest: false
      }))
      .get('/health', ({ di }) => di.get('health').check())

    const response = await app.handle(request('/health'))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
    expect(root.createScopeCalls).toBe(0)
  })

  it('keeps differently keyed plugin instances independent', async () => {
    const firstRoot = new TestRoot()
    const secondRoot = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: firstRoot, key: 'first' }))
      .use(inferdiElysia({ container: secondRoot, key: 'second' }))
      .get('/both', ({ first, second }) => ({
        same: first === second
      }))

    const response = await app.handle(request('/both'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ same: false })
    expect(firstRoot.createScopeCalls).toBe(1)
    expect(secondRoot.createScopeCalls).toBe(1)
    expect(firstRoot.scopes[0]?.disposeCalls).toBe(1)
    expect(secondRoot.scopes[0]?.disposeCalls).toBe(1)
  })

  it('does not deduplicate separate same-key plugin factory calls', async () => {
    const firstRoot = new TestRoot()
    const secondRoot = new TestRoot()
    const app = new Elysia()
      .use(inferdiElysia({ container: firstRoot }))
      .use(inferdiElysia({ container: secondRoot }))
      .get('/same-key', ({ di }) => ({
        fromSecondPlugin: di === secondRoot.scopes[0]
      }))

    const response = await app.handle(request('/same-key'))
    await waitForAfterResponse()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ fromSecondPlugin: true })
    expect(firstRoot.createScopeCalls).toBe(1)
    expect(secondRoot.createScopeCalls).toBe(1)
    expect(firstRoot.scopes[0]?.disposeCalls).toBe(1)
    expect(secondRoot.scopes[0]?.disposeCalls).toBe(1)
  })

  it('adds no request-time parsing inference to routes in scope', async () => {
    /*
     * Elysia's Sucrose statically analyzes every lifecycle handler; the moment
     * one passes the whole `context` to another function it marks body/query/
     * cookie/header parsing as needed for every request in scope. The plugin's
     * hooks must touch only `request`, so they add no parsing a route did not
     * ask for. Assert the plugin leaves Elysia's inference identical to a bare
     * app with the same no-op route (robust against Elysia changing defaults)
     */
    const readInference = (app: unknown) =>
      (app as { inference: Record<string, boolean> }).inference
    const buildApp = (plugin?: Elysia) => {
      const base = new Elysia()
      return (plugin ? base.use(plugin) : base).get('/noop', () => 'ok')
    }

    const bare = buildApp()
    await bare.modules
    const withPlugin = buildApp(inferdiElysia({ container: new TestRoot() }))
    await withPlugin.modules

    const bareInference = readInference(bare)
    const pluginInference = readInference(withPlugin)
    for (const field of ['body', 'query', 'cookie', 'headers'] as const) {
      expect(pluginInference[field]).toBe(bareInference[field])
    }
  })
})
