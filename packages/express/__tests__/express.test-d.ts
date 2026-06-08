import express, {
  type Request,
  type RequestHandler,
  type Response,
} from 'express'
import {describe, expectTypeOf, it} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {
  inferdiExpress,
  type InferdiExpressOptions,
  type InferdiRoot,
  type InferdiScope,
  type InferdiScopeOf,
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

declare global {
  namespace Express {
    interface Request {
      di: RequestContainer
    }
  }
}

describe('@inferdi/express types', () => {
  it('accepts InferDI containers through structural root and scope types', () => {
    expectTypeOf<RequestContainer>().toMatchTypeOf<InferdiScope>()
    expectTypeOf<RootContainer>().toMatchTypeOf<InferdiRoot<RequestContainer>>()
    expectTypeOf<InferdiScopeOf<RootContainer>>().toEqualTypeOf<RequestContainer>()
  })

  it('returns a standard Express request handler', () => {
    const middleware = inferdiExpress({ container: root })

    expectTypeOf(middleware).toMatchTypeOf<RequestHandler>()
  })

  it('preserves exact request container types through declaration merging', () => {
    const app = express()

    app.use(inferdiExpress({ container: root }))
    app.get('/users/:id', (req, res) => {
      expectTypeOf(req.di).toEqualTypeOf<RequestContainer>()
      expectTypeOf(req.di.get('users')).toEqualTypeOf<UserService>()

      // @ts-expect-error — missing DI keys remain compile errors.
      req.di.get('missing')

      res.json(req.di.get('users').profile(req.params.id))
    })
  })

  it('types scope hooks with Express request and response objects', () => {
    const options: InferdiExpressOptions<RootContainer, RequestContainer> = {
      container: root,
      createScope: (receivedRoot, req, res) => {
        expectTypeOf(receivedRoot).toEqualTypeOf<RootContainer>()
        expectTypeOf(req).toEqualTypeOf<Request>()
        expectTypeOf(res).toEqualTypeOf<Response>()
        return receivedRoot.createScope()
      },
      setupScope: (scope, req, res) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(req).toEqualTypeOf<Request>()
        expectTypeOf(res).toEqualTypeOf<Response>()
        scope.get('request').requestId = req.path
      },
      disposeScope: (scope, req, res) => {
        expectTypeOf(scope).toEqualTypeOf<RequestContainer>()
        expectTypeOf(req.di).toEqualTypeOf<RequestContainer>()
        expectTypeOf(res).toEqualTypeOf<Response>()
      },
      autoDispose: (req, res) => {
        expectTypeOf(req.di.get('users')).toEqualTypeOf<UserService>()
        expectTypeOf(res).toEqualTypeOf<Response>()
        return true
      },
      onDisposeError: (_error, req, res) => {
        expectTypeOf(req.di).toEqualTypeOf<RequestContainer>()
        expectTypeOf(res).toEqualTypeOf<Response>()
      },
    }

    void options
  })

  it('preserves custom createScope return types', () => {
    class CustomScope extends Container {
      readonly custom = true as const
    }

    const customRoot = {
      createScope: () => new CustomScope(),
    }

    inferdiExpress({ container: customRoot })

    expectTypeOf<InferdiScopeOf<typeof customRoot>>().toEqualTypeOf<CustomScope>()
  })
})
