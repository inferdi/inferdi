import Koa, {
  type DefaultContext,
  type DefaultState,
  type Middleware,
  type ParameterizedContext
} from 'koa'
import {describe, expectTypeOf, it} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {
  inferdiKoa,
  type InferdiKoaContext,
  type InferdiKoaOptions,
  type InferdiKoaState,
  type InferdiRoot,
  type InferdiScope,
  type InferdiScopeOf
} from '../src/index'

class RequestContext {
  requestId = ''
}

class UserService {
  profile(id: string) {
    return { id }
  }
}

const root = new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, [], 'scoped')

type RootContainer = typeof root
type RequestContainer = ReturnType<RootContainer['createScope']>

describe('@inferdi/koa types', () => {
  it('accepts InferDI containers through structural root and scope types', () => {
    expectTypeOf<RequestContainer>().toMatchTypeOf<InferdiScope>()
    expectTypeOf<RootContainer>().toMatchTypeOf<InferdiRoot<RequestContainer>>()
    expectTypeOf<InferdiScopeOf<RootContainer>>().toEqualTypeOf<RequestContainer>()
  })

  it('exposes the default di state key', () => {
    type State = InferdiKoaState<RequestContainer>

    expectTypeOf<State['di']>().toEqualTypeOf<RequestContainer>()
    expectTypeOf<keyof State>().toEqualTypeOf<'di'>()
  })

  it('preserves custom state keys as literals', () => {
    type State = InferdiKoaState<RequestContainer, 'container'>

    expectTypeOf<State['container']>().toEqualTypeOf<RequestContainer>()
    expectTypeOf<keyof State>().toEqualTypeOf<'container'>()
  })

  it('returns middleware that augments Koa state with the default key', () => {
    type UpstreamState = { user: { id: string } }
    type UpstreamContext = { traceId: string }

    const middleware = inferdiKoa<RootContainer, UpstreamState, UpstreamContext>({
      container: root,
      createScope: (_root, ctx) => {
        expectTypeOf(ctx).toEqualTypeOf<
          ParameterizedContext<UpstreamState, UpstreamContext>
        >()
        expectTypeOf(ctx.state.user.id).toEqualTypeOf<string>()
        expectTypeOf(ctx.traceId).toEqualTypeOf<string>()
        return root.createScope()
      },
      setupScope: (scope, ctx) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        scope.get('request').requestId = ctx.state.user.id
      }
    })

    expectTypeOf(middleware).toMatchTypeOf<
      Middleware<
        UpstreamState & InferdiKoaState<RequestContainer, 'di'>,
        UpstreamContext
      >
    >()
  })

  it('types handlers through Koa use inference', () => {
    const app = new Koa<{}>()
      .use(inferdiKoa({ container: root }))
      .use((ctx) => {
        expectTypeOf(ctx.state.di).toEqualTypeOf<RequestContainer>()
        expectTypeOf(ctx.state.di.get('users')).toEqualTypeOf<UserService>()

        // @ts-expect-error — missing DI keys remain compile errors
        ctx.state.di.get('missing')

        ctx.body = ctx.state.di.get('users').profile('1')
      })

    void app
  })

  it('types handlers with custom state keys', () => {
    const app = new Koa<{}>()
      .use(inferdiKoa({ container: root, key: 'container' }))
      .use((ctx) => {
        expectTypeOf(ctx.state.container).toEqualTypeOf<RequestContainer>()
        expectTypeOf(ctx.state.container.get('users')).toEqualTypeOf<UserService>()
        ctx.body = ctx.state.container.get('users').profile('1')
      })

    void app
  })

  it('can describe local Koa contexts without global augmentation', () => {
    type State =
      & DefaultState
      & InferdiKoaState<RequestContainer, 'scope'>
    type AppContext = InferdiKoaContext<
      DefaultState,
      DefaultContext,
      RequestContainer,
      'scope'
    >

    expectTypeOf<State['scope']>().toEqualTypeOf<RequestContainer>()
    expectTypeOf<AppContext['state']['scope']>().toEqualTypeOf<RequestContainer>()
  })

  it('types disposal hooks with the concrete DI state', () => {
    const options: InferdiKoaOptions<
      RootContainer,
      {},
      {},
      'container',
      RequestContainer
    > = {
      container: root,
      key: 'container',
      disposeScope: (scope, ctx) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(ctx.state.container).toEqualTypeOf<RequestContainer>()
      },
      autoDispose: (ctx) => {
        expectTypeOf(ctx.state.container.get('users')).toEqualTypeOf<UserService>()
        return true
      },
      onDisposeError: (_error, ctx) => {
        expectTypeOf(ctx.state.container).toEqualTypeOf<RequestContainer>()
      }
    }

    void options
  })

  it('preserves custom createScope return types', () => {
    class CustomScope extends Container {
      readonly custom = true as const
    }

    const customRoot = {
      createScope: () => new CustomScope()
    }

    const app = new Koa<{}>()
      .use(inferdiKoa({ container: customRoot }))
      .use((ctx) => {
        expectTypeOf(ctx.state.di).toEqualTypeOf<CustomScope>()
        expectTypeOf(ctx.state.di.custom).toEqualTypeOf<true>()
        ctx.body = 'ok'
      })

    void app
  })

  it('does not expose di before middleware or user state typing', () => {
    const app = new Koa<{}>()

    app.use((ctx) => {
      // @ts-expect-error — the di state key is not globally augmented
      ctx.state.di
      ctx.body = 'ok'
    })
  })
})
