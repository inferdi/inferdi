import Fastify, {
  type FastifyReply,
  type FastifyRequest
} from 'fastify'
import {describe, expectTypeOf, it} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {
  inferdiFastify,
  type InferdiFastifyOptions,
  type InferdiRoot,
  type InferdiScope,
  type InferdiScopeOf,
  type ScopedOptions
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

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

describe('@inferdi/fastify types', () => {
  it('accepts InferDI containers through the structural root and scope types', () => {
    expectTypeOf<RequestContainer>().toMatchTypeOf<InferdiScope>()
    expectTypeOf<RootContainer>().toMatchTypeOf<InferdiRoot<RequestContainer>>()
    expectTypeOf<InferdiScopeOf<RootContainer>>().toEqualTypeOf<RequestContainer>()
  })

  it('types scoped hooks with the concrete request scope when options are typed directly', () => {
    /*
     * When the option object is typed as ScopedOptions/InferdiFastifyOptions,
     * `Scope` resolves to `InferdiScopeOf<Root>` and every hook param is
     * concrete without an annotation
     */
    const options: ScopedOptions<RootContainer> = {
      container: root,
      setupScope: (scope, request, reply) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(request).toEqualTypeOf<FastifyRequest>()
        expectTypeOf(reply).toEqualTypeOf<FastifyReply>()
        scope.get('request').requestId = request.id

        // @ts-expect-error — missing DI keys remain compile errors
        scope.get('missing')
      },
      disposeScope: (scope, request, reply) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(request).toEqualTypeOf<FastifyRequest>()
        expectTypeOf(reply).toEqualTypeOf<FastifyReply>()
      },
      autoDispose: (request, reply) => {
        expectTypeOf(request).toEqualTypeOf<FastifyRequest>()
        expectTypeOf(reply).toEqualTypeOf<FastifyReply>()
        return true
      },
      onDisposeError: (error, request, reply) => {
        expectTypeOf(error).toEqualTypeOf<unknown>()
        expectTypeOf(request).toEqualTypeOf<FastifyRequest>()
        expectTypeOf(reply).toEqualTypeOf<FastifyReply>()
      }
    }
    void options
  })

  it('recovers the concrete scope in register hooks via an explicit annotation', () => {
    const app = Fastify()

    /*
     * `app.register` cannot infer the plugin's generics (it collapses them to
     * their constraints before checking the options), so inline hook params are
     * annotated explicitly to recover the concrete scope
     */
    app.register(inferdiFastify, {
      container: root,
      setupScope: (scope: InferdiScopeOf<typeof root>) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        scope.get('request').requestId = 'x'

        // @ts-expect-error — missing DI keys remain compile errors
        scope.get('missing')
      }
    })
  })

  it('preserves concrete Fastify app and request decoration types after module augmentation', () => {
    const app = Fastify()

    app.register(inferdiFastify, { container: root })
    app.get('/users/:id', async (request) => {
      expectTypeOf(request.di).toEqualTypeOf<RequestContainer>()
      expectTypeOf(request.di.get('users')).toEqualTypeOf<UserService>()

      // @ts-expect-error — missing DI keys remain compile errors through request.di
      request.di.get('missing')

      return request.di.get('users').profile('1')
    })
  })

  it('types root-only handlers through the Fastify instance decoration', () => {
    const app = Fastify()

    app.register(inferdiFastify, {
      container: root,
      scopePerRequest: false
    })
    app.get('/health', async function (request) {
      expectTypeOf(this.di).toEqualTypeOf<RootContainer>()
      expectTypeOf(request.server.di).toEqualTypeOf<RootContainer>()
      expectTypeOf(this.di.get('health').check()).toEqualTypeOf<true>()
      return request.server.di.get('health').check()
    })
  })

  it('allows disposeRootOnClose on a disposable root', () => {
    const scoped: ScopedOptions<RootContainer> = {
      container: root,
      disposeRootOnClose: true
    }
    void scoped

    const rootOnly: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false,
      disposeRootOnClose: true
    }
    void rootOnly
  })

  it('rejects disposeRootOnClose on a root without dispose()', () => {
    type BareRoot = InferdiRoot<RequestContainer>
    const bare: BareRoot = { createScope: () => root.createScope() }

    const options: ScopedOptions<BareRoot> = {
      container: bare,
      // @ts-expect-error — disposeRootOnClose requires a disposable root
      disposeRootOnClose: true
    }
    void options
  })

  it('rejects request-scope options in root-only mode', () => {
    const validRootOnly: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false
    }
    void validRootOnly

    // @ts-expect-error — createScope is scoped-mode behavior
    const invalidCreateScope: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false,
      createScope: () => root.createScope()
    }
    void invalidCreateScope

    // @ts-expect-error — setupScope is scoped-mode behavior
    const invalidSetupScope: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false,
      setupScope: () => {}
    }
    void invalidSetupScope

    // @ts-expect-error — disposeScope is scoped-mode behavior
    const invalidDisposeScope: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false,
      disposeScope: () => {}
    }
    void invalidDisposeScope

    // @ts-expect-error — autoDispose is scoped-mode behavior
    const invalidAutoDispose: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false,
      autoDispose: false
    }
    void invalidAutoDispose

    // @ts-expect-error — onDisposeError is scoped-mode behavior
    const invalidDisposeErrorHandler: InferdiFastifyOptions<RootContainer> = {
      container: root,
      scopePerRequest: false,
      onDisposeError: () => {}
    }
    void invalidDisposeErrorHandler
  })
})
