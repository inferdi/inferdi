import Fastify, {
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import {describe, expectTypeOf, it} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {
  inferdiFastify,
  type InferdiFastifyOptions,
  type InferdiRoot,
  type InferdiScope,
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
  })

  it('infers concrete request-scope types in plugin options', () => {
    const app = Fastify()

    app.register(inferdiFastify, {
      container: root,
      setupScope: (scope, request, reply) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(request).toEqualTypeOf<FastifyRequest>()
        expectTypeOf(reply).toEqualTypeOf<FastifyReply>()
        scope.get('request').requestId = request.id

        // @ts-expect-error — missing DI keys remain compile errors.
        scope.get('missing')
      },
    })
  })

  it('preserves concrete Fastify app and request decoration types after module augmentation', () => {
    const app = Fastify()

    app.register(inferdiFastify, { container: root })
    app.get('/users/:id', async (request) => {
      expectTypeOf(request.di).toEqualTypeOf<RequestContainer>()
      expectTypeOf(request.di.get('users')).toEqualTypeOf<UserService>()

      // @ts-expect-error — missing DI keys remain compile errors through request.di.
      request.di.get('missing')

      return request.di.get('users').profile('1')
    })
  })

  it('types root-only handlers through the Fastify instance decoration', () => {
    const app = Fastify()

    app.register(inferdiFastify, {
      container: root,
      scopePerRequest: false,
    })
    app.get('/health', async function (request) {
      expectTypeOf(this.di).toEqualTypeOf<RootContainer>()
      expectTypeOf(request.server.di).toEqualTypeOf<RootContainer>()
      expectTypeOf(this.di.get('health').check()).toEqualTypeOf<true>()
      return request.server.di.get('health').check()
    })
  })

  it('rejects request-scope options in root-only mode', () => {
    const validRootOnly: InferdiFastifyOptions<RootContainer, RequestContainer> = {
      container: root,
      scopePerRequest: false,
    }
    void validRootOnly

    const invalidCreateScope: InferdiFastifyOptions<RootContainer, RequestContainer> = {
      container: root,
      scopePerRequest: false,
      // @ts-expect-error — createScope is scoped-mode behavior.
      createScope: () => root.createScope(),
    }
    void invalidCreateScope

    const invalidSetupScope: InferdiFastifyOptions<RootContainer, RequestContainer> = {
      container: root,
      scopePerRequest: false,
      // @ts-expect-error — setupScope is scoped-mode behavior.
      setupScope: () => {},
    }
    void invalidSetupScope

    const invalidDisposeLogger: InferdiFastifyOptions<RootContainer, RequestContainer> = {
      container: root,
      scopePerRequest: false,
      // @ts-expect-error — logDisposeError is scoped-mode behavior.
      logDisposeError: () => {},
    }
    void invalidDisposeLogger
  })
})
