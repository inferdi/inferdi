/**
 * Elysia request-scope plugin for InferDI.
 *
 * Creates one InferDI scope per Elysia request, exposes it on the request
 * context, and disposes it through guarded success/error lifecycle hooks. The
 * package is lifecycle glue only: no decorators, reflection, route scanning, or
 * handler parameter injection.
 *
 * Cleanup is lifecycle-bound: the scope is disposed from `onAfterResponse`. If
 * the runtime never reaches that hook (a connection aborts before the response
 * is produced, or the process exits mid-request), `dispose()` is not called.
 * The per-request scope is tracked in a `WeakMap`, so the bookkeeping itself is
 * collected once the `Request` is unreachable, but resources the scope holds
 * (connections, handles) are released only when `dispose()` actually runs.
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { inferdiElysia } from '@inferdi/elysia'
 *
 * const root = buildRootContainer()
 *
 * const app = new Elysia()
 *   .use(inferdiElysia({ container: root }))
 *   .get('/users/:id', ({ di, params }) =>
 *     di.get('users').profile(params.id),
 *   )
 * ```
 *
 * @module
 */

import { Elysia, type Context } from 'elysia'
import type {
  DefinitionBase,
  MetadataBase,
  RouteBase,
} from 'elysia'

/**
 * A value of type `T` or a promise resolving to it. Used by the scope hooks so
 * they accept both synchronous and asynchronous implementations.
 *
 * @template T - The resolved value type.
 */
export type MaybePromise<T> = T | Promise<T>

/**
 * Minimal structural contract for a disposable InferDI request scope. Any
 * `Container` instance satisfies it.
 */
export interface InferdiScope {
  /**
   * Releases everything the scope owns. InferDI's `Container.dispose()` is
   * idempotent; custom scope implementations should preserve that behavior.
   */
  dispose(): MaybePromise<void>
}

/**
 * Structural contract for the root container handed to the plugin.
 *
 * @template Scope - The per-request scope type produced by `createScope()`.
 */
export interface InferdiRoot<Scope extends InferdiScope = InferdiScope> {
  /** Opens a fresh request scope. Called once per request in scoped mode. */
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
 * Elysia context fragment that exposes a concrete scope under a context key.
 *
 * @template Scope - The scope exposed on Elysia request context.
 * @template Key   - The Elysia context key. Defaults to `'di'`.
 */
export type InferdiElysiaContext<
  Scope extends InferdiScope,
  Key extends string = 'di',
> = {
  [P in Key]: Scope
}

/**
 * Elysia context fragment that exposes a root container under a context key.
 *
 * @template Root - The root container exposed in root-only mode.
 * @template Key  - The Elysia context key. Defaults to `'di'`.
 */
export type InferdiElysiaRootContext<
  Root extends InferdiRoot,
  Key extends string = 'di',
> = {
  [P in Key]: Root
}

/** Lifecycle phase that triggered request-scope cleanup. */
export type InferdiElysiaLifecyclePhase = 'setup' | 'error' | 'afterResponse'

/**
 * Request-time Elysia context passed to scope creation and setup hooks. The
 * unknown route shape matches Elysia's `scoped` plugin visibility, where params
 * can be unavailable for some lifecycle phases.
 *
 * The schema is pinned deliberately rather than widened to `Context<any, any>`:
 * it gives the hooks a stable, typed surface (`request`, `headers`, `query`,
 * `params`) independent of any concrete route's generics, instead of collapsing
 * everything to `any`. The trade-off is coupling to Elysia's `Context` arity —
 * a future major that changes `Context`'s generic parameters may require an
 * update here, but `Context<any, any>` would carry the same exposure with worse
 * type safety.
 *
 * `body`, `cookie`, and `response` are intentionally `unknown`: at the
 * scoped-plugin level the route's body/response types are not known, and `cookie`
 * is left untyped to avoid coupling to Elysia's internal `Cookie<T>` shape. To
 * read them inside `setupValidatedScope`, cast to your own route schema.
 */
export type InferdiElysiaRequestContext = Context<{
  body: unknown
  headers: Record<string, string | undefined>
  query: Record<string, string>
  params: Record<string, string | undefined>
  cookie: unknown
  response: unknown
}>

/**
 * Narrow cleanup context passed to `disposeScope`, `autoDispose`, and
 * `onDisposeError`. It intentionally exposes only stable fields shared by
 * Elysia success and error hooks.
 *
 * @template Scope - The request scope type.
 * @template Key   - The context key carrying the scope.
 */
export type InferdiElysiaLifecycleContext<
  Scope extends InferdiScope,
  Key extends string = 'di',
> = {
  readonly request: Request
  readonly phase: InferdiElysiaLifecyclePhase
  readonly error?: unknown
} & Partial<InferdiElysiaContext<Scope, Key>>

/**
 * Context passed to `setupValidatedScope`. It runs through Elysia `resolve`,
 * after validation has completed, and includes the already-created request
 * scope under the configured context key.
 *
 * @template Scope - The request scope type.
 * @template Key   - The context key carrying the scope.
 */
export type InferdiElysiaValidatedContext<
  Scope extends InferdiScope,
  Key extends string = 'di',
> = InferdiElysiaRequestContext & InferdiElysiaContext<Scope, Key>

/**
 * Context fragment accepted by {@link skipInferdiDispose}. Any Elysia context
 * object satisfies this contract.
 */
export type InferdiElysiaSkipContext = {
  readonly request: Request
}

/**
 * Options for the default scoped mode: one request scope per request, exposed
 * on Elysia context and disposed after bounded request work.
 *
 * @template Root  - The root container type.
 * @template Key   - The context key.
 * @template Scope - The per-request scope type.
 */
export type ScopedOptions<
  Root extends InferdiRoot,
  Key extends string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
> = {
  /** The root container. */
  readonly container: Root
  /** Elysia context key. Defaults to `'di'`. */
  readonly key?: Key
  /** Scoped mode marker. Omit or set `true` to keep per-request scopes. */
  readonly scopePerRequest?: true
  /**
   * Overrides how a request scope is created. Defaults to
   * `root.createScope()`. May be async.
   */
  readonly createScope?: (
    root: Root,
    context: InferdiElysiaRequestContext,
  ) => MaybePromise<Scope>
  /**
   * Optional hook to hydrate the freshly created scope before route handlers
   * can read it from Elysia context.
   */
  readonly setupScope?: (
    scope: Scope,
    context: InferdiElysiaRequestContext,
  ) => MaybePromise<void>
  /**
   * Optional hook to hydrate the scope from validated request data. Runs after
   * Elysia validation and before route handlers.
   */
  readonly setupValidatedScope?: (
    scope: Scope,
    context: InferdiElysiaValidatedContext<Scope, Key>,
  ) => MaybePromise<void>
  /** Overrides request-scope disposal. Defaults to `scope.dispose()`. */
  readonly disposeScope?: (
    scope: Scope,
    context: InferdiElysiaLifecycleContext<Scope, Key>,
  ) => MaybePromise<void>
  /**
   * Controls whether the plugin disposes the request scope. Returning `false`
   * transfers disposal responsibility to application code.
   */
  readonly autoDispose?:
    | boolean
    | ((
        context: InferdiElysiaLifecycleContext<Scope, Key>,
      ) => MaybePromise<boolean>)
  /**
   * Optional sink for cleanup failures. Returning normally marks the cleanup
   * error as handled; omitted failures are logged with `console.error`.
   */
  readonly onDisposeError?: (
    error: unknown,
    context: InferdiElysiaLifecycleContext<Scope, Key>,
  ) => MaybePromise<void>
}

/**
 * Options for root-only mode (`scopePerRequest: false`): exposes the root
 * container through Elysia context and installs no request-scope hooks.
 *
 * @template Root - The root container type.
 * @template Key  - The context key.
 */
export type RootOnlyOptions<
  Root extends InferdiRoot,
  Key extends string,
> = {
  /** The root container. */
  readonly container: Root
  /** Elysia context key. Defaults to `'di'`. */
  readonly key?: Key
  /** Root-only mode marker. */
  readonly scopePerRequest: false
  /** Forbidden in root-only mode. */
  readonly createScope?: never
  /** Forbidden in root-only mode. */
  readonly setupScope?: never
  /** Forbidden in root-only mode. */
  readonly setupValidatedScope?: never
  /** Forbidden in root-only mode. */
  readonly disposeScope?: never
  /** Forbidden in root-only mode. */
  readonly autoDispose?: never
  /** Forbidden in root-only mode. */
  readonly onDisposeError?: never
}

/**
 * Plugin options. A discriminated union on `scopePerRequest`:
 * - omitted / `true` -> {@link ScopedOptions}.
 * - `false` -> {@link RootOnlyOptions}.
 *
 * @template Root  - The root container type.
 * @template Key   - The context key.
 * @template Scope - The per-request scope type.
 */
export type InferdiElysiaOptions<
  Root extends InferdiRoot,
  Key extends string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
> =
  | ScopedOptions<Root, Key, Scope>
  | RootOnlyOptions<Root, Key>

/**
 * Elysia plugin type returned by scoped InferDI mode.
 *
 * @template Scope - The request scope exposed on Elysia context.
 * @template Key   - The context key carrying the request scope.
 */
export type InferdiElysiaScopedPlugin<
  Scope extends InferdiScope,
  Key extends string,
> = Elysia<
  '',
  {
    decorator: {}
    store: {}
    derive: {}
    resolve: {}
  },
  DefinitionBase,
  MetadataBase,
  RouteBase,
  {
    derive: InferdiElysiaContext<Scope, Key>
    resolve: {}
    schema: {}
    standaloneSchema: {}
    response: {}
  },
  {
    derive: {}
    resolve: {}
    schema: {}
    standaloneSchema: {}
    response: {}
  }
>

/**
 * Elysia plugin type returned by root-only InferDI mode.
 *
 * @template Root - The root container exposed on Elysia context.
 * @template Key  - The context key carrying the root container.
 */
export type InferdiElysiaRootPlugin<
  Root extends InferdiRoot,
  Key extends string,
> = Elysia<
  '',
  {
    decorator: InferdiElysiaRootContext<Root, Key>
    store: {}
    derive: {}
    resolve: {}
  },
  DefinitionBase,
  MetadataBase,
  RouteBase,
  {
    derive: {}
    resolve: {}
    schema: {}
    standaloneSchema: {}
    response: {}
  },
  {
    derive: {}
    resolve: {}
    schema: {}
    standaloneSchema: {}
    response: {}
  }
>

type BaseScope = InferdiScope
type BaseRoot = InferdiRoot<BaseScope>
type BaseOptions = InferdiElysiaOptions<BaseRoot, string, BaseScope>

/**
 * Per-request bookkeeping. One record is created in `derive` when the scope is
 * opened and mutated in `onError` if the request fails. `hasError` distinguishes
 * "no error" from "the error value happened to be `undefined`".
 */
type RequestState = {
  readonly scope: BaseScope
  hasError: boolean
  error?: unknown
}

// Process-global on purpose: keyed by the unique `Request` identity, so it
// never confuses requests, and a single `skipInferdiDispose(context)` call
// suppresses disposal for every plugin instance on that request (see the
// `skipInferdiDispose` docs). A per-factory `WeakSet` would make the skip
// per-instance and force one call per mounted plugin.
const skippedRequests = new WeakSet<Request>()
let pluginInstanceId = 0

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function lifecycleContext<
  Scope extends InferdiScope,
  Key extends string,
>(
  key: Key,
  scope: Scope,
  request: Request,
  phase: InferdiElysiaLifecyclePhase,
  error?: unknown,
): InferdiElysiaLifecycleContext<Scope, Key> {
  const result = {
    request,
    phase,
    [key]: scope,
  } as InferdiElysiaLifecycleContext<Scope, Key>

  if (error !== undefined) {
    ;(result as { error?: unknown }).error = error
  }

  return result
}

function handleDisposeError<
  Scope extends InferdiScope,
  Key extends string,
>(
  error: unknown,
  context: InferdiElysiaLifecycleContext<Scope, Key>,
  onDisposeError:
    | ((
        error: unknown,
        context: InferdiElysiaLifecycleContext<Scope, Key>,
      ) => MaybePromise<void>)
    | undefined,
  errors: unknown[],
): void | PromiseLike<void> {
  if (onDisposeError === undefined) {
    errors.push(error)
    return
  }

  try {
    const handling = onDisposeError(error, context)
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

function disposeWithErrors<
  Scope extends InferdiScope,
  Key extends string,
>(
  scope: Scope,
  context: InferdiElysiaLifecycleContext<Scope, Key>,
  disposeScope: (
    scope: Scope,
    context: InferdiElysiaLifecycleContext<Scope, Key>,
  ) => MaybePromise<void>,
  onDisposeError:
    | ((
        error: unknown,
        context: InferdiElysiaLifecycleContext<Scope, Key>,
      ) => MaybePromise<void>)
    | undefined,
  errors: unknown[],
): void | PromiseLike<void> {
  try {
    const disposing = disposeScope(scope, context)
    if (isPromiseLike(disposing)) {
      return disposing.then(
        undefined,
        (error) => handleDisposeError(error, context, onDisposeError, errors),
      )
    }
  } catch (error) {
    return handleDisposeError(error, context, onDisposeError, errors)
  }
}

function logUnhandledDisposeErrors<
  Scope extends InferdiScope,
  Key extends string,
>(
  errors: unknown[],
  context: InferdiElysiaLifecycleContext<Scope, Key>,
): void {
  if (errors.length === 0) return

  const err = errors.length === 1
    ? errors[0]
    : new AggregateError(errors, 'InferDI Elysia request cleanup failed')

  try {
    console.error('Failed to dispose InferDI Elysia request scope', {
      err,
      phase: context.phase,
    })
  } catch {
    // Response cleanup must not fail because the fallback logger failed.
  }
}

async function disposeAfterSetupFailure<
  Scope extends InferdiScope,
  Key extends string,
>(
  scope: Scope,
  request: Request,
  setupError: unknown,
  key: Key,
  disposeScope: (
    scope: Scope,
    context: InferdiElysiaLifecycleContext<Scope, Key>,
  ) => MaybePromise<void>,
  onDisposeError:
    | ((
        error: unknown,
        context: InferdiElysiaLifecycleContext<Scope, Key>,
      ) => MaybePromise<void>)
    | undefined,
): Promise<never> {
  // Finding 2: surface only the original setup error; cleanup failures go to
  // `onDisposeError`, else are logged — never aggregated into the thrown error.
  const errors: unknown[] = []
  const disposeContext = lifecycleContext(
    key,
    scope,
    request,
    'setup',
    setupError,
  )
  const disposing = disposeWithErrors(
    scope,
    disposeContext,
    disposeScope,
    onDisposeError,
    errors,
  )

  await disposing

  logUnhandledDisposeErrors(errors, disposeContext)
  throw setupError
}

/**
 * Marks the current Elysia request as manually disposed by application code.
 *
 * The plugin disposes the request scope from `onAfterResponse`, which Elysia
 * runs once the response is produced — for a user-created streaming `Response`
 * or `ReadableStream`, that is after the headers and first chunk are sent, not
 * after the stream drains. Any route that keeps using scoped services past its
 * `return` (a `ReadableStream`, server-sent events, a WebSocket handoff, or
 * background work) MUST call this first and dispose the scope itself when that
 * work ends; otherwise the scope is torn down mid-stream. Calling it on a
 * normal request leaks the scope, since the plugin no longer owns disposal.
 *
 * The skip applies only to the successful `afterResponse` path: if the request
 * fails, the recorded error forces disposal regardless, so a half-finished
 * stream still releases its scope.
 *
 * The skip is tracked by `Request` identity in a process-global set, so a single
 * call suppresses disposal for every InferDI plugin instance mounted on that
 * request — and only that request. This is intentional: it keeps the call to one
 * regardless of how many plugins are mounted, without polluting Elysia context.
 *
 * @param context - The current Elysia context.
 */
export function skipInferdiDispose(
  context: InferdiElysiaSkipContext,
): void {
  skippedRequests.add(context.request)
}

/**
 * Creates an Elysia plugin that opens one InferDI request scope per request and
 * exposes it as `di`.
 *
 * @template Root  - The root container type.
 * @template Scope - The request scope type.
 */
export function inferdiElysia<
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: Omit<ScopedOptions<Root, 'di', Scope>, 'key'> & {
    readonly key?: 'di'
  },
): InferdiElysiaScopedPlugin<Scope, 'di'>

/**
 * Creates an Elysia plugin that opens one InferDI request scope per request and
 * exposes it under a custom context key.
 *
 * @template Root  - The root container type.
 * @template Key   - The Elysia context key.
 * @template Scope - The request scope type.
 */
export function inferdiElysia<
  Root extends InferdiRoot,
  Key extends string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: ScopedOptions<Root, Key, Scope> & {
    readonly key: Key
  },
): InferdiElysiaScopedPlugin<Scope, Key>

/**
 * Creates a root-only Elysia plugin that exposes the root container as `di` and
 * installs no request-scope lifecycle hooks.
 *
 * @template Root - The root container type.
 */
export function inferdiElysia<
  Root extends InferdiRoot,
>(
  options: Omit<RootOnlyOptions<Root, 'di'>, 'key'> & {
    readonly key?: 'di'
  },
): InferdiElysiaRootPlugin<Root, 'di'>

/**
 * Creates a root-only Elysia plugin that exposes the root container under a
 * custom context key and installs no request-scope lifecycle hooks.
 *
 * @template Root - The root container type.
 * @template Key  - The Elysia context key.
 */
export function inferdiElysia<
  Root extends InferdiRoot,
  Key extends string,
>(
  options: RootOnlyOptions<Root, Key> & {
    readonly key: Key
  },
): InferdiElysiaRootPlugin<Root, Key>

export function inferdiElysia(options: unknown): unknown {
  const typedOptions = options as BaseOptions
  const root = typedOptions.container
  const key = typedOptions.key ?? 'di'
  const scoped = typedOptions.scopePerRequest !== false
  const instanceId = ++pluginInstanceId
  const seed = {
    key,
    scopePerRequest: scoped,
    instanceId,
  }

  if (!scoped) {
    return new Elysia({
      name: '@inferdi/elysia',
      seed,
    }).decorate(key, root)
  }

  const requestState = new WeakMap<Request, RequestState>()
  const hasCustomCreateScope = typedOptions.createScope !== undefined
  const hasSetupScope = typedOptions.setupScope !== undefined
  const hasCustomDisposeScope = typedOptions.disposeScope !== undefined
  const hasDisposeErrorHandler = typedOptions.onDisposeError !== undefined
  // `autoDispose: true` is the default-disposal semantics, so it stays on the
  // synchronous default path alongside an omitted `autoDispose`, matching
  // Fastify/Hono. Only a `false` value, a predicate, a custom `disposeScope`, or
  // an `onDisposeError` sink require the `disposeOnce` path.
  const useDefaultDisposePath =
    !hasCustomDisposeScope &&
    (typedOptions.autoDispose === undefined ||
      typedOptions.autoDispose === true) &&
    !hasDisposeErrorHandler
  const createScope =
    typedOptions.createScope ??
    ((root: BaseRoot) => root.createScope())
  const setupScope = typedOptions.setupScope
  const setupValidatedScope = typedOptions.setupValidatedScope
  const disposeScope =
    typedOptions.disposeScope ??
    ((scope: BaseScope) => scope.dispose())
  const autoDispose = typedOptions.autoDispose
  const onDisposeError = typedOptions.onDisposeError

  function disposeDefaultOnce(
    request: Request,
  ): void | PromiseLike<void> {
    const state = requestState.get(request)

    if (state === undefined) return

    const scope = state.scope
    const phase = state.hasError ? 'error' as const : 'afterResponse' as const
    const error = state.error
    requestState.delete(request)

    if (phase === 'afterResponse' && skippedRequests.has(request)) return

    // Stay synchronous when dispose() is synchronous: no `async`, so a sync
    // teardown finishes in the same tick without scheduling a microtask. Only
    // an actually-async dispose returns a promise for Elysia to await.
    try {
      const disposing = scope.dispose()
      if (isPromiseLike(disposing)) {
        return disposing.then(undefined, (disposeError) => {
          logUnhandledDisposeErrors(
            [disposeError],
            lifecycleContext(key, scope, request, phase, error),
          )
        })
      }
    } catch (disposeError) {
      logUnhandledDisposeErrors(
        [disposeError],
        lifecycleContext(key, scope, request, phase, error),
      )
    }
  }

  async function disposeOnce(request: Request) {
    const state = requestState.get(request)

    if (state === undefined) return

    const scope = state.scope
    const phase = state.hasError ? 'error' as const : 'afterResponse' as const
    const error = state.error
    requestState.delete(request)

    if (phase === 'afterResponse' && skippedRequests.has(request)) return

    const disposeContext = lifecycleContext(
      key,
      scope,
      request,
      phase,
      error,
    )
    const errors: unknown[] = []
    let shouldDispose = autoDispose !== false

    if (typeof autoDispose === 'function') {
      try {
        const autoDisposeResult = autoDispose(disposeContext)
        shouldDispose = isPromiseLike(autoDisposeResult)
          ? await autoDisposeResult !== false
          : autoDisposeResult !== false
      } catch (autoDisposeError) {
        shouldDispose = true
        const handling = handleDisposeError(
          autoDisposeError,
          disposeContext,
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
        disposeContext,
        disposeScope,
        onDisposeError,
        errors,
      )
      if (isPromiseLike(disposing)) {
        await disposing
      }
    }

    // Elysia schedules `onAfterResponse` after the response has been produced;
    // cleanup failures must stay observable without corrupting the response.
    logUnhandledDisposeErrors(errors, disposeContext)
  }

  const plugin = new Elysia({
    name: '@inferdi/elysia',
    seed,
  })

  const withScope = !hasCustomCreateScope && !hasSetupScope
    ? plugin.derive({ as: 'scoped' }, (context) => {
        const scope = root.createScope()

        requestState.set(context.request, { scope, hasError: false })

        return {
          [key]: scope,
        }
      })
    : plugin.derive({ as: 'scoped' }, async (context) => {
        const scope = await createScope(root, context)

        try {
          requestState.set(context.request, { scope, hasError: false })

          if (setupScope !== undefined) {
            await setupScope(scope, context)
          }

          return {
            [key]: scope,
          }
        } catch (error) {
          requestState.delete(context.request)
          skippedRequests.delete(context.request)
          await disposeAfterSetupFailure(
            scope,
            context.request,
            error,
            key,
            disposeScope,
            onDisposeError,
          )
        }
      })

  let withValidatedScope = withScope as Elysia

  if (setupValidatedScope !== undefined) {
    const setupValidatedScopeHook = setupValidatedScope

    withValidatedScope = withValidatedScope.resolve(
      { as: 'scoped' },
      async (context) => {
        const state = requestState.get(context.request)

        /* v8 ignore start -- invariant: resolve runs only after derive opened
           the scope; unreachable unless Elysia changes hook ordering */
        if (state === undefined) {
          throw new Error(
            '@inferdi/elysia: request scope is unavailable in ' +
              'setupValidatedScope; the derive hook did not open a scope ' +
              'before resolve ran',
          )
        }
        /* v8 ignore stop */

        await setupValidatedScopeHook(
          state.scope,
          context as InferdiElysiaValidatedContext<BaseScope, string>,
        )

        return {}
      },
    )
  }

  // The disposal hooks read only `request` (destructured), never the whole
  // context. Elysia's Sucrose statically analyzes every lifecycle handler and,
  // the moment a handler passes the full `context` to another function, marks
  // *all* of `body`/`query`/`cookie`/`headers` as needed — forcing Elysia to
  // parse them on every request in this plugin's scope. Touching only `request`
  // keeps that inference empty, so the adapter adds no request-time parsing for
  // routes that do not ask for it. `request` is not an inference-gated field.
  return withValidatedScope
    .onError({ as: 'scoped' }, ({ request, error }) => {
      const state = requestState.get(request)
      if (state !== undefined) {
        state.hasError = true
        state.error = error
      }
    })
    .onAfterResponse({ as: 'scoped' }, ({ request }) =>
      useDefaultDisposePath
        ? disposeDefaultOnce(request)
        : disposeOnce(request),
    )
}
