import fp from 'fastify-plugin'
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

export type MaybePromise<T> = T | Promise<T>

export interface InferdiScope {
  /**
   * Releases everything the scope owns. Must be idempotent: the adapter relies
   * on calling it at most once per request, but a no-op second call must not
   * throw or double-release. InferDI's `Container.dispose()` already satisfies
   * this; custom implementations must preserve it.
   */
  dispose(): Promise<void>
}

export interface InferdiRoot<Scope extends InferdiScope> extends InferdiScope {
  createScope(): Scope
}

type ScopedOptions<
  Root extends InferdiRoot<Scope>,
  Scope extends InferdiScope,
> = {
  readonly container: Root
  readonly scopePerRequest?: true
  readonly createScope?: (
    root: Root,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<Scope>
  readonly setupScope?: (
    scope: Scope,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<void>
  readonly disposeRootOnClose?: boolean
  readonly logDisposeError?: (
    error: unknown,
    request: FastifyRequest,
  ) => void
}

type RootOnlyOptions<
  Root extends InferdiRoot<Scope>,
  Scope extends InferdiScope,
> = {
  readonly container: Root
  readonly scopePerRequest: false
  readonly createScope?: never
  readonly setupScope?: never
  readonly logDisposeError?: never
  readonly disposeRootOnClose?: boolean
}

export type InferdiFastifyOptions<
  Root extends InferdiRoot<Scope>,
  Scope extends InferdiScope,
> = ScopedOptions<Root, Scope> | RootOnlyOptions<Root, Scope>

type DecoratedRequest<Scope extends InferdiScope> = FastifyRequest & {
  di: Scope | null
}

type BaseScope = InferdiScope
type BaseRoot = InferdiRoot<BaseScope>
type BaseOptions = InferdiFastifyOptions<BaseRoot, BaseScope>

function defaultLogDisposeError(error: unknown, request: FastifyRequest) {
  request.log.error({ err: error }, 'Failed to dispose InferDI request scope')
}

async function inferdiFastifyPlugin<
  Scope extends InferdiScope,
  Root extends InferdiRoot<Scope>,
>(
  fastify: FastifyInstance,
  options: InferdiFastifyOptions<Root, Scope>,
) {
  const root = options.container

  fastify.decorate('di', root as never)

  if (options.disposeRootOnClose === true) {
    fastify.addHook('onClose', async () => {
      await root.dispose()
    })
  }

  if (options.scopePerRequest === false) return

  const logDisposeError = options.logDisposeError ?? defaultLogDisposeError

  fastify.decorateRequest('di', null)

  if (options.createScope === undefined && options.setupScope === undefined) {
    fastify.addHook('onRequest', (request, _reply, done) => {
      try {
        ;(request as DecoratedRequest<Scope>).di = root.createScope()
      } catch (error) {
        done(error as Error)
        return
      }
      done()
    })
  } else {
    const createScope =
      options.createScope ??
      ((root: Root) => root.createScope())
    const setupScope = options.setupScope

    fastify.addHook('onRequest', async (request, reply) => {
      const scope = await createScope(root, request, reply)

      try {
        if (setupScope !== undefined) {
          await setupScope(scope, request, reply)
        }
        const decorated = request as DecoratedRequest<Scope>
        decorated.di = scope
      } catch (error) {
        try {
          await scope.dispose()
        } catch (disposeError) {
          logDisposeError(disposeError, request)
        }
        throw error
      }
    })
  }

  fastify.addHook('onResponse', (request, _reply, done) => {
    const scope = (request as DecoratedRequest<Scope>).di
    if (scope === null) {
      done()
      return
    }

    let disposing: Promise<void>
    try {
      disposing = scope.dispose()
    } catch (error) {
      logDisposeError(error, request)
      done()
      return
    }

    disposing.then(
      () => done(),
      (error) => {
        logDisposeError(error, request)
        done()
      },
    )
  })
}

export const inferdiFastify = fp(
  inferdiFastifyPlugin as FastifyPluginAsync<BaseOptions>,
  {
    name: '@inferdi/fastify',
    fastify: '5.x',
  },
) as typeof inferdiFastifyPlugin
