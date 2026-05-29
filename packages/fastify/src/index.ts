/**
 * Fastify v5 request-scope adapter for InferDI.
 *
 * Registers a plugin that decorates `app.di` with your root container and, by
 * default, opens one InferDI scope per request on `request.di`, disposing it
 * after the response is sent. The published types stay structural — you supply
 * your own concrete container types via module augmentation.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify'
 * import { inferdiFastify } from '@inferdi/fastify'
 *
 * const app = Fastify()
 * app.register(inferdiFastify, { container: root })
 * ```
 *
 * @module
 */

import fp from 'fastify-plugin'
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

/**
 * A value of type `T` or a promise resolving to it. Used by the scope hooks
 * ({@link InferdiFastifyOptions}'s `createScope` / `setupScope`) so they accept
 * both synchronous and asynchronous implementations.
 *
 * @template T - The resolved value type.
 */
export type MaybePromise<T> = T | Promise<T>

/**
 * Minimal structural contract for a disposable InferDI scope. The adapter only
 * needs a `dispose()` method; any `Container` instance satisfies it. Kept
 * intentionally narrow so the plugin never depends on the concrete container
 * type carried by your application.
 */
export interface InferdiScope {
  /**
   * Releases everything the scope owns. Must be idempotent: the adapter relies
   * on calling it at most once per request, but a no-op second call must not
   * throw or double-release. InferDI's `Container.dispose()` already satisfies
   * this; custom implementations must preserve it.
   */
  dispose(): Promise<void>
}

/**
 * Structural contract for the root container handed to the plugin. Extends
 * {@link InferdiScope} (so the root can itself be disposed via
 * `disposeRootOnClose`) and adds `createScope()`, which the plugin calls once
 * per request to open a child scope.
 *
 * @template Scope - The per-request scope type produced by `createScope()`.
 */
export interface InferdiRoot<Scope extends InferdiScope> extends InferdiScope {
  /** Opens a fresh child scope. Called once per request in scoped mode. */
  createScope(): Scope
}

/**
 * Options for the default (scoped) mode: one request scope per request,
 * decorated on `request.di` and disposed in `onResponse`.
 *
 * @template Root  - The root container type.
 * @template Scope - The per-request scope type.
 */
export type ScopedOptions<
  Root extends InferdiRoot<Scope>,
  Scope extends InferdiScope,
> = {
  /** The root container. Decorated on `app.di`. */
  readonly container: Root
  /** Scoped mode marker. Omit or set `true` to keep per-request scopes. */
  readonly scopePerRequest?: true
  /**
   * Overrides how a per-request scope is created. Defaults to
   * `root.createScope()`. May be async.
   */
  readonly createScope?: (
    root: Root,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<Scope>
  /**
   * Optional hook to populate the freshly created scope (e.g. seed request
   * context) before it is exposed on `request.di`. Runs in `onRequest`; a
   * throw disposes the half-built scope and propagates the error.
   */
  readonly setupScope?: (
    scope: Scope,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<void>
  /** Dispose the root container on `fastify.close()`. Defaults to `false`. */
  readonly disposeRootOnClose?: boolean
  /**
   * Custom sink for request-scope disposal errors. Disposal failures in
   * `onResponse` are logged and swallowed (the response is already sent).
   * Defaults to `request.log.error(...)`.
   */
  readonly logDisposeError?: (
    error: unknown,
    request: FastifyRequest,
  ) => void
}

/**
 * Options for root-only mode (`scopePerRequest: false`): the plugin decorates
 * only `app.di` and installs no request/response hooks, so per-request scope
 * options are forbidden.
 *
 * @template Root  - The root container type.
 * @template Scope - The scope type (unused in this mode; kept for the union).
 */
export type RootOnlyOptions<
  Root extends InferdiRoot<Scope>,
  Scope extends InferdiScope,
> = {
  /** The root container. Decorated on `app.di`. */
  readonly container: Root
  /** Root-only mode marker. */
  readonly scopePerRequest: false
  /** Forbidden in root-only mode. */
  readonly createScope?: never
  /** Forbidden in root-only mode. */
  readonly setupScope?: never
  /** Forbidden in root-only mode. */
  readonly logDisposeError?: never
  /** Dispose the root container on `fastify.close()`. Defaults to `false`. */
  readonly disposeRootOnClose?: boolean
}

/**
 * Plugin options. A discriminated union on `scopePerRequest`:
 * - omitted / `true` → {@link ScopedOptions} (per-request scopes on `request.di`).
 * - `false` → {@link RootOnlyOptions} (only `app.di`, no request hooks). The
 *   per-request hooks (`createScope`, `setupScope`, `logDisposeError`) are
 *   statically forbidden in this branch.
 *
 * @template Root  - The root container type.
 * @template Scope - The per-request scope type.
 *
 * @example
 * ```ts
 * // Scoped (default):
 * app.register(inferdiFastify, { container: root })
 *
 * // Root-only:
 * app.register(inferdiFastify, { container: root, scopePerRequest: false })
 * ```
 */
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

/**
 * Public call signature of {@link inferdiFastify}. A generic Fastify plugin:
 * the `Scope` and `Root` type parameters are inferred from the
 * {@link InferdiFastifyOptions} you pass to `app.register(...)`, so the option
 * shape (scoped vs root-only) is checked at the call site.
 *
 * @template Scope - The per-request scope type.
 * @template Root  - The root container type.
 */
export type InferdiFastifyPlugin = <
  Scope extends InferdiScope,
  Root extends InferdiRoot<Scope>,
>(
  fastify: FastifyInstance,
  options: InferdiFastifyOptions<Root, Scope>,
) => Promise<void>

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

/**
 * Fastify v5 plugin that wires an InferDI container into the request lifecycle.
 *
 * Decorates `app.di` with the root container. In the default scoped mode it
 * decorates `request.di` with a fresh scope created in `onRequest` and disposed
 * in `onResponse`; disposal errors are logged and swallowed. With
 * `scopePerRequest: false` it installs no request/response hooks and exposes
 * only `app.di`. Wrapped with `fastify-plugin`, so the decorators are visible to
 * the surrounding encapsulation context.
 *
 * Publish your own concrete container types via module augmentation of
 * `FastifyRequest.di` / `FastifyInstance.di` — the plugin keeps its public
 * types structural and never declares them globally.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify'
 * import { inferdiFastify } from '@inferdi/fastify'
 *
 * declare module 'fastify' {
 *   interface FastifyInstance { di: typeof root }
 *   interface FastifyRequest { di: ReturnType<typeof root.createScope> }
 * }
 *
 * const app = Fastify()
 * app.register(inferdiFastify, { container: root })
 *
 * app.get('/me', async (req) => req.di.get('userService').current())
 * ```
 */
export const inferdiFastify = fp(
  inferdiFastifyPlugin as FastifyPluginAsync<BaseOptions>,
  {
    name: '@inferdi/fastify',
    fastify: '5.x',
  },
) as InferdiFastifyPlugin
