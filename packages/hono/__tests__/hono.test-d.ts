import { Hono, type Context } from 'hono'
import {describe, expectTypeOf, it} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {
  inferdiHono,
  type InferdiHonoEnv,
  type InferdiHonoOptions,
  type InferdiHonoScopeEnv,
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

describe('@inferdi/hono types', () => {
  it('accepts InferDI containers through structural root and scope types', () => {
    expectTypeOf<RequestContainer>().toMatchTypeOf<InferdiScope>()
    expectTypeOf<RootContainer>().toMatchTypeOf<InferdiRoot<RequestContainer>>()
    expectTypeOf<InferdiScopeOf<RootContainer>>().toEqualTypeOf<RequestContainer>()
  })

  it('exposes the default di variable through c.var and c.get', () => {
    const app = new Hono()
      .use('*', inferdiHono({ container: root }))
      .get('/users/:id', (c) => {
        expectTypeOf(c.var.di).toEqualTypeOf<RequestContainer>()
        expectTypeOf(c.get('di')).toEqualTypeOf<RequestContainer>()
        expectTypeOf(c.var.di.get('users')).toEqualTypeOf<UserService>()

        // @ts-expect-error — missing DI keys remain compile errors
        c.var.di.get('missing')

        return c.json(c.var.di.get('users').profile(c.req.param('id')))
      })

    void app
  })

  it('preserves the default key as the literal di key', () => {
    type Env = InferdiHonoEnv<RootContainer>
    expectTypeOf<keyof Env['Variables']>().toEqualTypeOf<'di'>()

    /*
     * An explicit `key: 'di'` produces the same middleware type as omitting the
     * key entirely (both take the default-key overload)
     */
    const explicit = inferdiHono({ container: root, key: 'di' })
    const implicit = inferdiHono({ container: root })
    expectTypeOf(explicit).toEqualTypeOf<typeof implicit>()
  })

  it('supports custom context variable keys', () => {
    const app = new Hono()
      .use('*', inferdiHono({ container: root, key: 'container' }))
      .get('/users/:id', (c) => {
        expectTypeOf(c.var.container).toEqualTypeOf<RequestContainer>()
        expectTypeOf(c.get('container')).toEqualTypeOf<RequestContainer>()
        return c.json(c.var.container.get('users').profile(c.req.param('id')))
      })

    type Env = InferdiHonoEnv<RootContainer, 'container'>
    expectTypeOf<keyof Env['Variables']>().toEqualTypeOf<'container'>()
    void app
  })

  it('preserves custom createScope return types', () => {
    class CustomScope extends Container {
      readonly custom = true as const
    }

    const customRoot = {
      createScope: () => new CustomScope()
    }

    const app = new Hono()
      .use('*', inferdiHono({ container: customRoot }))
      .get('/custom', (c) => {
        expectTypeOf(c.var.di).toEqualTypeOf<CustomScope>()
        expectTypeOf(c.var.di.custom).toEqualTypeOf<true>()
        return c.text('ok')
      })

    void app
  })

  it('types setup hooks with existing Hono Bindings and Variables', () => {
    type UpstreamEnv = {
      Bindings: {
        DATABASE_URL: string
      }
      Variables: {
        authUser: { id: string }
      }
    }

    const middleware = inferdiHono<RootContainer, UpstreamEnv>({
      container: root,
      createScope: (_root, c) => {
        expectTypeOf(c).toEqualTypeOf<Context<UpstreamEnv>>()
        expectTypeOf(c.env.DATABASE_URL).toEqualTypeOf<string>()
        expectTypeOf(c.var.authUser.id).toEqualTypeOf<string>()
        return root.createScope()
      },
      setupScope: (scope, c) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(c.env.DATABASE_URL).toEqualTypeOf<string>()
        scope.get('request').requestId = c.var.authUser.id
      }
    })

    expectTypeOf(middleware).toMatchTypeOf<
      (c: Context<UpstreamEnv & InferdiHonoEnv<RootContainer>>, next: () => Promise<void>) => unknown
    >()
  })

  it('allows explicit option typing', () => {
    const options: InferdiHonoOptions<
      RootContainer,
      {},
      'container',
      RequestContainer
    > = {
      container: root,
      key: 'container',
      autoDispose: (c) => {
        expectTypeOf(c.var.container).toEqualTypeOf<RequestContainer>()
        return true
      },
      onDisposeError: (_error, c) => {
        expectTypeOf(c.var.container.get('users')).toEqualTypeOf<UserService>()
      }
    }

    void options
  })

  it('can expose a scope env directly', () => {
    type Env = InferdiHonoScopeEnv<RequestContainer, 'scope'>
    expectTypeOf<Env['Variables']['scope']>().toEqualTypeOf<RequestContainer>()
  })

  it('does not expose di before middleware or app env typing', () => {
    const app = new Hono()

    app.get('/before', (c) => {
      // @ts-expect-error — the di variable is not globally augmented
      c.var.di
      return c.text('ok')
    })
  })
})
