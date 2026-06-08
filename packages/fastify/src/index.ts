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
 * ({@link InferdiFastifyOptions}'s `createScope` / `setupScope` /
 * `disposeScope` / `autoDispose` / `onDisposeError`) so they accept both
 * synchronous and asynchronous implementations.
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
   * this; custom implementations must preserve it. May be synchronous — a sync
   * `dispose()` finishes in the same tick without scheduling a microtask.
   */
  dispose(): MaybePromise<void>
}

/**
 * Structural contract for the root container handed to the plugin. The only
 * universal requirement is `createScope()`, which the plugin calls once per
 * request to open a child scope. The root needs a `dispose()` method *only* when
 * `disposeRootOnClose: true`; that requirement is enforced at the option level
 * (see {@link ScopedOptions}'s `disposeRootOnClose`), not by this base type, so
 * the contract matches the other adapters' `InferdiRoot`.
 *
 * @template Scope - The per-request scope type produced by `createScope()`.
 */
export interface InferdiRoot<Scope extends InferdiScope = InferdiScope> {
  /** Opens a fresh child scope. Called once per request in scoped mode. */
  createScope(): Scope
}

/**
 * Extracts the request-scope type created by a root container.
 *
 * @template Root - A structural root container with `createScope()`.
 */
export type InferdiScopeOf<Root extends InferdiRoot> =
  ReturnType<Root['createScope']>

/**
 * Options for the default (scoped) mode: one request scope per request,
 * decorated on `request.di` and disposed in `onResponse`.
 *
 * @template Root  - The root container type.
 * @template Scope - The per-request scope type.
 */
export type ScopedOptions<
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
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
   * throw disposes the half-built scope and propagates the original error.
   */
  readonly setupScope?: (
    scope: Scope,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<void>
  /** Overrides request-scope disposal. Defaults to `scope.dispose()`. */
  readonly disposeScope?: (
    scope: Scope,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<void>
  /**
   * Controls whether the plugin disposes the request scope after the response
   * is sent. Returning `false` transfers disposal responsibility to application
   * code.
   */
  readonly autoDispose?:
    | boolean
    | ((request: FastifyRequest, reply: FastifyReply) => MaybePromise<boolean>)
  /**
   * Optional sink for request-scope disposal failures. Returning normally marks
   * the cleanup error as handled; omitted failures are logged with
   * `request.log.error(...)`. Disposal runs in `onResponse` (the response is
   * already sent), so a failure here never corrupts the response.
   */
  readonly onDisposeError?: (
    error: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => MaybePromise<void>
  /**
   * Dispose the root container on `fastify.close()`. Defaults to `false`.
   * Enabling it requires the root to be disposable: when `Root` has no
   * `dispose()`, this narrows to `false` so `true` is a compile error.
   */
  readonly disposeRootOnClose?: Root extends InferdiScope ? boolean : false
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
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
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
  readonly disposeScope?: never
  /** Forbidden in root-only mode. */
  readonly autoDispose?: never
  /** Forbidden in root-only mode. */
  readonly onDisposeError?: never
  /**
   * Dispose the root container on `fastify.close()`. Defaults to `false`.
   * Enabling it requires the root to be disposable: when `Root` has no
   * `dispose()`, this narrows to `false` so `true` is a compile error.
   */
  readonly disposeRootOnClose?: Root extends InferdiScope ? boolean : false
}

/**
 * Plugin options. A discriminated union on `scopePerRequest`:
 * - omitted / `true` → {@link ScopedOptions} (per-request scopes on `request.di`).
 * - `false` → {@link RootOnlyOptions} (only `app.di`, no request hooks). The
 *   per-request hooks (`createScope`, `setupScope`, `disposeScope`,
 *   `autoDispose`, `onDisposeError`) are statically forbidden in this branch.
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
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
> = ScopedOptions<Root, Scope> | RootOnlyOptions<Root, Scope>

type DecoratedRequest<Scope extends InferdiScope> = FastifyRequest & {
  di: Scope | null
}

type RequestState = {
  readonly reply: FastifyReply
  scope: BaseScope | null
  exposed: boolean
  aborted: boolean
  routeFailed: boolean
}

type DisposeScope<Scope extends InferdiScope> = (
  scope: Scope,
  request: FastifyRequest,
  reply: FastifyReply,
) => MaybePromise<void>

type AutoDispose =
  | boolean
  | ((request: FastifyRequest, reply: FastifyReply) => MaybePromise<boolean>)

type DisposeErrorHandler = (
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => MaybePromise<void>

type BaseScope = InferdiScope
// The implementation always handles a disposable root: `disposeRootOnClose`
// calls `root.dispose()`, and the public `disposeRootOnClose` type guarantees
// the root is an `InferdiScope` whenever it can be `true`.
type BaseRoot = InferdiRoot<BaseScope> & InferdiScope
type BaseOptions = InferdiFastifyOptions<BaseRoot, BaseScope>

/**
 * Public call signature of {@link inferdiFastify}. A generic Fastify plugin:
 * `Root` is inferred from the `container` you pass to `app.register(...)`, and
 * `Scope` defaults to `InferdiScopeOf<Root>`, matching the other adapters.
 *
 * Inference caveat (Fastify-specific): the plugin is consumed by
 * `app.register(plugin, opts)`, whose own generics collapse a generic plugin's
 * type parameters to their constraints *before* the option object is checked.
 * As a result, hook callbacks written inline in `app.register(...)` do **not**
 * receive a concrete `Scope` — annotate the parameter explicitly to recover it:
 *
 * ```ts
 * app.register(inferdiFastify, {
 *   container: root,
 *   // Without the annotation the param is `any` (register cannot infer it).
 *   setupScope: (scope: InferdiScopeOf<typeof root>) => { ... },
 * })
 * ```
 *
 * The concrete-scope contract is delivered without annotation when the option
 * object is typed directly as {@link ScopedOptions} / {@link InferdiFastifyOptions}.
 *
 * @template Root  - The root container type.
 * @template Scope - The per-request scope type.
 */
export type InferdiFastifyPlugin = <
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  fastify: FastifyInstance,
  options: InferdiFastifyOptions<Root, Scope>,
) => Promise<void>

const skippedRequests = new WeakSet<FastifyRequest>()

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function handleDisposeError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  onDisposeError: DisposeErrorHandler | undefined,
  errors: unknown[],
): void | PromiseLike<void> {
  if (onDisposeError === undefined) {
    errors.push(error)
    return
  }

  try {
    const handling = onDisposeError(error, request, reply)
    if (isPromiseLike(handling)) {
      return handling.then(undefined, (handlerError) => {
        errors.push(error)
        errors.push(handlerError)
      })
    }
  } catch (handlerError) {
    errors.push(error)
    errors.push(handlerError)
  }
}

function disposeWithErrors<Scope extends InferdiScope>(
  scope: Scope,
  request: FastifyRequest,
  reply: FastifyReply,
  disposeScope: DisposeScope<Scope>,
  onDisposeError: DisposeErrorHandler | undefined,
  errors: unknown[],
): void | PromiseLike<void> {
  try {
    const disposing = disposeScope(scope, request, reply)
    if (isPromiseLike(disposing)) {
      return disposing.then(
        undefined,
        (error) => handleDisposeError(error, request, reply, onDisposeError, errors),
      )
    }
  } catch (error) {
    return handleDisposeError(error, request, reply, onDisposeError, errors)
  }
}

function logRequestCleanupErrors(
  errors: unknown[],
  request: FastifyRequest,
): void {
  if (errors.length === 0) return

  const err = errors.length === 1
    ? errors[0]
    : new AggregateError(errors, 'InferDI Fastify request cleanup failed')

  try {
    request.log.error({ err }, 'Failed to dispose InferDI request scope')
  } catch {
    // A throwing custom logger must not replace the original setup error nor
    // stall the `onResponse` hook chain. Fastify's own docs recommend wrapping
    // `onResponse` logging in try/catch for exactly this reason.
  }
}

/**
 * Marks the current Fastify request scope as manually owned by application
 * code. Use this when a route intentionally keeps the scope beyond the response
 * boundary (background work that disposes the scope itself later). The plugin
 * disposes the request scope in `onResponse`, which Fastify runs after the
 * response is sent; calling this suppresses that disposal for the current
 * request only. It also suppresses the `onRequestAbort` disposal, so a route
 * that takes ownership keeps it even if the client aborts.
 *
 * @param request - The current Fastify request.
 */
export function skipInferdiDispose(request: FastifyRequest): void {
  skippedRequests.add(request)
}

async function inferdiFastifyPlugin(
  fastify: FastifyInstance,
  options: BaseOptions,
) {
  const root = options.container

  fastify.decorate('di', root as never)

  if (options.disposeRootOnClose === true) {
    // `await` surfaces both a synchronous throw and an async rejection to
    // `fastify.close()` — root-close failures stay separate from the
    // request-scope sink. The public `disposeRootOnClose` type guarantees the
    // root is disposable whenever this branch is reachable.
    fastify.addHook('onClose', async () => {
      await root.dispose()
    })
  }

  if (options.scopePerRequest === false) return

  const disposeScope: DisposeScope<BaseScope> =
    options.disposeScope ?? ((scope) => scope.dispose())
  const autoDispose: AutoDispose | undefined = options.autoDispose
  const onDisposeError = options.onDisposeError
  // `autoDispose: true` is the default-disposal semantics, so it stays on the
  // synchronous fast path alongside an omitted `autoDispose`. Only a `false`
  // value, a predicate, a custom `disposeScope`, or an `onDisposeError` sink
  // require the `disposeCustom` path.
  const useDefaultDisposePath =
    options.disposeScope === undefined &&
    (options.autoDispose === undefined || options.autoDispose === true) &&
    options.onDisposeError === undefined

  const requestStates = new WeakMap<FastifyRequest, RequestState>()

  function createRequestState(
    request: FastifyRequest,
    reply: FastifyReply,
  ): RequestState {
    const state: RequestState = {
      reply,
      scope: null,
      exposed: false,
      aborted: false,
      routeFailed: false,
    }
    requestStates.set(request, state)
    return state
  }

  // Clears only the double-dispose guard. `onResponse` / `onRequestAbort` key on
  // `state.scope === null`, so clearing it up front makes a racing hook a no-op
  // while `request.di` stays pointing at the scope for the cleanup hooks.
  function clearScopeGuard(state: RequestState): void {
    state.scope = null
    state.exposed = false
  }

  fastify.decorateRequest('di', null)

  if (options.createScope === undefined && options.setupScope === undefined) {
    fastify.addHook('onRequest', (request, reply, done) => {
      const state = createRequestState(request, reply)
      try {
        state.scope = root.createScope()
        state.exposed = true
        ;(request as DecoratedRequest<BaseScope>).di = state.scope
      } catch (error) {
        requestStates.delete(request)
        done(error as Error)
        return
      }
      done()
    })
  } else {
    const createScope =
      options.createScope ??
      ((root: BaseRoot) => root.createScope())
    const setupScope = options.setupScope

    // The thrown error is always the original setup error; a disposal failure
    // goes to the sink (never aggregated into the thrown error), so error
    // handlers see the real cause.
    const disposeUnexposedScope = (
      state: RequestState,
      request: FastifyRequest,
      scope: BaseScope,
    ): void | PromiseLike<void> => {
      // Finding 4: expose `request.di` so setup-failure `disposeScope` /
      // `onDisposeError` see the same handle the success path exposes, then
      // clear it before the original setup error reaches Fastify's error
      // handlers — they must never observe a half-built or disposed scope.
      ;(request as DecoratedRequest<BaseScope>).di = scope
      clearScopeGuard(state)
      // Drop any manual-ownership marker: the half-built scope is always disposed
      // here regardless of `skipInferdiDispose`, matching the other adapters.
      skippedRequests.delete(request)

      const errors: unknown[] = []
      const disposing = disposeWithErrors(
        scope,
        request,
        state.reply,
        disposeScope,
        onDisposeError,
        errors,
      )
      const finalize = () => {
        ;(request as DecoratedRequest<BaseScope>).di = null
        logRequestCleanupErrors(errors, request)
        requestStates.delete(request)
      }
      if (isPromiseLike(disposing)) {
        return disposing.then(finalize)
      }

      finalize()
    }

    const finishSetupFailure = (
      state: RequestState,
      request: FastifyRequest,
      setupError: unknown,
      done: (error?: Error) => void,
    ): void => {
      const disposing = disposeUnexposedScope(state, request, state.scope!)
      if (isPromiseLike(disposing)) {
        disposing.then(() => {
          done(setupError as Error)
        })
        return
      }

      done(setupError as Error)
    }

    const finishAbortedBeforeExposure = (
      state: RequestState,
      request: FastifyRequest,
      done: (error?: Error) => void,
    ): void => {
      const disposing = disposeUnexposedScope(state, request, state.scope!)
      const error = new Error(
        'InferDI Fastify request aborted before the request scope was exposed',
      )

      if (isPromiseLike(disposing)) {
        disposing.then(() => {
          done(error)
        })
        return
      }

      done(error)
    }

    const finishSetup = (
      scope: BaseScope,
      state: RequestState,
      request: FastifyRequest,
      reply: FastifyReply,
      done: (error?: Error) => void,
    ): void => {
      state.scope = scope

      if (state.aborted) {
        finishAbortedBeforeExposure(state, request, done)
        return
      }

      if (setupScope === undefined) {
        state.exposed = true
        ;(request as DecoratedRequest<BaseScope>).di = scope
        done()
        return
      }

      let setupResult: MaybePromise<void>
      try {
        setupResult = setupScope(scope, request, reply)
      } catch (error) {
        finishSetupFailure(state, request, error, done)
        return
      }

      if (isPromiseLike(setupResult)) {
        setupResult.then(
          () => {
            if (state.aborted) {
              finishAbortedBeforeExposure(state, request, done)
              return
            }
            state.exposed = true
            ;(request as DecoratedRequest<BaseScope>).di = scope
            done()
          },
          (error) => finishSetupFailure(state, request, error, done),
        )
        return
      }

      state.exposed = true
      ;(request as DecoratedRequest<BaseScope>).di = scope
      done()
    }

    // Stay synchronous when `createScope` / `setupScope` are synchronous: a
    // microtask is scheduled only when one of them actually returns a promise,
    // mirroring the disposal fast path.
    fastify.addHook('onRequest', (request, reply, done) => {
      const state = createRequestState(request, reply)
      let scopeResult: MaybePromise<BaseScope>
      try {
        scopeResult = createScope(root, request, reply)
      } catch (error) {
        requestStates.delete(request)
        done(error as Error)
        return
      }

      if (isPromiseLike(scopeResult)) {
        scopeResult.then(
          (scope) => finishSetup(scope, state, request, reply, done),
          (error) => {
            requestStates.delete(request)
            done(error as Error)
          },
        )
        return
      }

      finishSetup(scopeResult, state, request, reply, done)
    })
  }

  // Stay synchronous when no scope hooks are configured: a sync `dispose()`
  // finishes in the same tick and `done()` is called without scheduling a
  // microtask.
  function disposeDefault(
    scope: BaseScope,
    request: FastifyRequest,
  ): void | PromiseLike<void> {
    try {
      const disposing = scope.dispose()
      if (isPromiseLike(disposing)) {
        return disposing.then(undefined, (error) => {
          logRequestCleanupErrors([error], request)
        })
      }
    } catch (error) {
      logRequestCleanupErrors([error], request)
    }
  }

  async function disposeCustom(
    scope: BaseScope,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const errors: unknown[] = []
    let shouldDispose = autoDispose !== false

    if (typeof autoDispose === 'function') {
      try {
        const autoDisposeResult = autoDispose(request, reply)
        shouldDispose = isPromiseLike(autoDisposeResult)
          ? await autoDisposeResult !== false
          : autoDisposeResult !== false
      } catch (error) {
        shouldDispose = true
        const handling = handleDisposeError(
          error,
          request,
          reply,
          onDisposeError,
          errors,
        )
        if (isPromiseLike(handling)) {
          await handling
        }
      }
    }

    if (shouldDispose) {
      const disposing = disposeWithErrors(
        scope,
        request,
        reply,
        disposeScope,
        onDisposeError,
        errors,
      )
      if (isPromiseLike(disposing)) {
        await disposing
      }
    }

    logRequestCleanupErrors(errors, request)
  }

  function disposeExposedScope(
    state: RequestState,
    request: FastifyRequest,
    scope: BaseScope,
  ): void | PromiseLike<void> {
    // Clear the double-dispose guard up front, but keep `request.di` pointing at
    // the scope so the cleanup hooks observe the same handle the request did
    // (Finding 1). It is cleared once cleanup completes.
    clearScopeGuard(state)

    const skipped = skippedRequests.delete(request)
    // Finding 3: a failed request always disposes — `skipInferdiDispose` only
    // suppresses successful response cleanup. On abort `routeFailed` stays
    // `false`, so manual ownership is preserved there.
    if (!state.routeFailed && skipped) {
      // Manual ownership over a successful response: leave `request.di` set so
      // application-owned cleanup can keep using it.
      requestStates.delete(request)
      return
    }

    const finalize = () => {
      ;(request as DecoratedRequest<BaseScope>).di = null
      requestStates.delete(request)
    }

    const cleanup = useDefaultDisposePath
      ? disposeDefault(scope, request)
      : disposeCustom(scope, request, state.reply)

    if (isPromiseLike(cleanup)) {
      return cleanup.then(
        finalize,
        /* v8 ignore next 4 -- disposeDefault/disposeCustom sink their own
           errors; this is a final bug guard that never runs */
        (error) => {
          logRequestCleanupErrors([error], request)
          finalize()
        },
      )
    }

    finalize()
  }

  // Finding 3: a route/hook error marks the request failed so `onResponse`
  // disposes even when `skipInferdiDispose` was called. Fastify runs `onError`
  // before `onResponse`. The state is absent when the failure originated in the
  // `onRequest` scope hooks (which already deleted it); there is nothing to flag.
  fastify.addHook('onError', (request, _reply, _error, done) => {
    const state = requestStates.get(request)
    if (state !== undefined) {
      state.routeFailed = true
    }
    done()
  })

  fastify.addHook('onResponse', (request, _reply, done) => {
    const state = requestStates.get(request)
    if (state === undefined || state.scope === null) {
      done()
      return
    }

    const cleanup = disposeExposedScope(state, request, state.scope)
    if (isPromiseLike(cleanup)) {
      cleanup.then(() => done())
      return
    }

    done()
  })

  // `onResponse` does not run when a client aborts the connection before the
  // response is sent, which would leak the request scope. `onRequestAbort`
  // releases exposed scopes through the same disposal contract as `onResponse`.
  // If abort happens while async `createScope` / `setupScope` is still in
  // flight, the later continuation sees `state.aborted` and disposes the
  // unexposed scope before completing the hook.
  fastify.addHook('onRequestAbort', (request, done) => {
    const state = requestStates.get(request)
    /* v8 ignore next 4 -- Fastify runs onRequest before onRequestAbort, so the
       state is absent only if the framework violates hook ordering */
    if (state === undefined) {
      done()
      return
    }

    if (state.scope === null) {
      state.aborted = true
      done()
      return
    }

    state.aborted = true
    if (!state.exposed) {
      done()
      return
    }

    const cleanup = disposeExposedScope(state, request, state.scope)
    if (isPromiseLike(cleanup)) {
      cleanup.then(() => done())
      return
    }

    done()
  })
}

/**
 * Fastify v5 plugin that wires an InferDI container into the request lifecycle.
 *
 * Decorates `app.di` with the root container. In the default scoped mode it
 * decorates `request.di` with a fresh scope created in `onRequest` and disposed
 * in `onResponse`; disposal errors are routed to `onDisposeError` or logged via
 * `request.log.error` and swallowed (the response is already sent). If the
 * client aborts before the response is sent — when `onResponse` never runs —
 * the scope is released in `onRequestAbort` instead. With `scopePerRequest:
 * false` it installs no request/response hooks and exposes only `app.di`.
 * Wrapped with `fastify-plugin`, so the decorators are visible to the
 * surrounding encapsulation context.
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
