import { Elysia } from 'elysia'
import {describe, expectTypeOf, it} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {
  inferdiElysia,
  type InferdiElysiaContext,
  type InferdiElysiaLifecycleContext,
  type InferdiElysiaOptions,
  type InferdiElysiaRootContext,
  type InferdiElysiaValidatedContext,
  type InferdiRoot,
  type InferdiScope,
  type InferdiScopeOf
} from '../src/index'

class HealthService {
  check() {
    return true as const
  }
}

class RequestContext {
  requestId = ''
}

class UserService {
  profile(id: string) {
    return { id }
  }
}

const root = new Container()
  .registerClass('health', HealthService, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, [], 'scoped')

type RootContainer = typeof root
type RequestContainer = ReturnType<RootContainer['createScope']>

describe('@inferdi/elysia types', () => {
  it('accepts InferDI containers through structural root and scope types', () => {
    expectTypeOf<RequestContainer>().toMatchTypeOf<InferdiScope>()
    expectTypeOf<RootContainer>().toMatchTypeOf<InferdiRoot<RequestContainer>>()
    expectTypeOf<InferdiScopeOf<RootContainer>>().toEqualTypeOf<RequestContainer>()
  })

  it('exposes the default di context value', () => {
    const app = new Elysia()
      .use(inferdiElysia({ container: root }))
      .get('/users/:id', ({ di, params }) => {
        expectTypeOf(di).toEqualTypeOf<RequestContainer>()
        expectTypeOf(di.get('users')).toEqualTypeOf<UserService>()
        expectTypeOf(params.id).toEqualTypeOf<string>()

        // @ts-expect-error — missing DI keys remain compile errors
        di.get('missing')

        return di.get('users').profile(params.id)
      })

    void app
  })

  it('preserves the default key as the literal di key', () => {
    type Ctx = InferdiElysiaContext<RequestContainer>
    expectTypeOf<keyof Ctx>().toEqualTypeOf<'di'>()

    const plugin = inferdiElysia({ container: root, key: 'di' })
    const app = new Elysia().use(plugin).get('/ok', ({ di }) => {
      expectTypeOf(di).toEqualTypeOf<RequestContainer>()
      return 'ok'
    })

    void app
  })

  it('supports custom context keys', () => {
    const app = new Elysia()
      .use(inferdiElysia({ container: root, key: 'container' }))
      .get('/users/:id', ({ container, params }) => {
        expectTypeOf(container).toEqualTypeOf<RequestContainer>()
        expectTypeOf(container.get('users')).toEqualTypeOf<UserService>()

        // @ts-expect-error — default di is not exposed for a custom key
        container.di

        return container.get('users').profile(params.id)
      })

    type Ctx = InferdiElysiaContext<RequestContainer, 'container'>
    expectTypeOf<keyof Ctx>().toEqualTypeOf<'container'>()
    void app
  })

  it('preserves custom createScope return types', () => {
    class CustomScope extends Container {
      readonly custom = true as const
    }

    const customRoot = {
      createScope: () => new CustomScope()
    }

    const app = new Elysia()
      .use(inferdiElysia({ container: customRoot }))
      .get('/custom', ({ di }) => {
        expectTypeOf(di).toEqualTypeOf<CustomScope>()
        expectTypeOf(di.custom).toEqualTypeOf<true>()
        return 'ok'
      })

    void app
  })

  it('types scoped hooks and cleanup callbacks', () => {
    const options: InferdiElysiaOptions<
      RootContainer,
      'di',
      RequestContainer
    > = {
      container: root,
      createScope: (receivedRoot, context) => {
        expectTypeOf(receivedRoot).toEqualTypeOf<RootContainer>()
        expectTypeOf(context.request).toEqualTypeOf<Request>()
        return root.createScope()
      },
      setupScope: (scope, context) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(context.request).toEqualTypeOf<Request>()
        scope.get('request').requestId = 'typed'
      },
      setupValidatedScope: (scope, context) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(context).toEqualTypeOf<
          InferdiElysiaValidatedContext<RequestContainer, 'di'>
        >()
        expectTypeOf(context.di).toEqualTypeOf<RequestContainer>()
        scope.get('request').requestId = context.request.method
      },
      disposeScope: (scope, context) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(context).toEqualTypeOf<
          InferdiElysiaLifecycleContext<RequestContainer, 'di'>
        >()
        expectTypeOf(context.di).toEqualTypeOf<RequestContainer | undefined>()
      },
      autoDispose: (context) => {
        expectTypeOf(context.phase).toEqualTypeOf<
          'setup' | 'error' | 'afterResponse'
        >()
        return context.request.method !== 'LOCK'
      },
      onDisposeError: (_error, context) => {
        expectTypeOf(context.error).toEqualTypeOf<unknown>()
      }
    }

    void options
  })

  it('exposes root types in root-only mode', () => {
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        scopePerRequest: false
      }))
      .get('/health', ({ di }) => {
        expectTypeOf(di).toEqualTypeOf<RootContainer>()
        expectTypeOf(di.get('health').check()).toEqualTypeOf<true>()
        return di.get('health').check()
      })

    type Ctx = InferdiElysiaRootContext<RootContainer>
    expectTypeOf<keyof Ctx>().toEqualTypeOf<'di'>()
    void app
  })

  it('supports custom root-only keys', () => {
    const app = new Elysia()
      .use(inferdiElysia({
        container: root,
        key: 'root',
        scopePerRequest: false
      }))
      .get('/health', ({ root: container }) => {
        expectTypeOf(container).toEqualTypeOf<RootContainer>()
        return container.get('health').check()
      })

    type Ctx = InferdiElysiaRootContext<RootContainer, 'root'>
    expectTypeOf<keyof Ctx>().toEqualTypeOf<'root'>()
    void app
  })

  it('rejects request-scope options in root-only mode', () => {
    const validRootOnly: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false
    }
    void validRootOnly

    /*
     * The forbidden property makes the object incompatible with the discriminated
     * union, and TS attributes that error to the assignment, so `@ts-expect-error`
     * goes on the `const` line rather than the property line
     */

    // @ts-expect-error — createScope is scoped-mode behavior
    const invalidCreateScope: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false,
      createScope: () => root.createScope()
    }
    void invalidCreateScope

    // @ts-expect-error — setupScope is scoped-mode behavior
    const invalidSetupScope: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false,
      setupScope: () => {}
    }
    void invalidSetupScope

    // @ts-expect-error — setupValidatedScope is scoped-mode behavior
    const invalidSetupValidatedScope: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false,
      setupValidatedScope: () => {}
    }
    void invalidSetupValidatedScope

    // @ts-expect-error — disposeScope is scoped-mode behavior
    const invalidDisposeScope: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false,
      disposeScope: () => {}
    }
    void invalidDisposeScope

    // @ts-expect-error — autoDispose is scoped-mode behavior
    const invalidAutoDispose: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false,
      autoDispose: false
    }
    void invalidAutoDispose

    // @ts-expect-error — onDisposeError is scoped-mode behavior
    const invalidDisposeHandler: InferdiElysiaOptions<RootContainer, 'di'> = {
      container: root,
      scopePerRequest: false,
      onDisposeError: () => {}
    }
    void invalidDisposeHandler
  })

  it('does not expose di before plugin installation', () => {
    const app = new Elysia().get('/before', (context) => {
      // @ts-expect-error — the di context property is not globally augmented
      context.di
      return 'ok'
    })

    void app
  })
})
