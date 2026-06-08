/**
 * Koa v3 request-scope middleware for InferDI.
 *
 * Creates one InferDI scope per Koa request, exposes it through `ctx.state`,
 * and disposes it from the underlying Node response completion events. The
 * package is lifecycle glue only: no decorators, reflection, route scanning,
 * controller layer, or handler parameter injection.
 *
 * @example
 * ```ts
 * import Koa from 'koa'
 * import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
 *
 * const root = buildRootContainer()
 *
 * declare module 'koa' {
 *   interface DefaultState {
 *     di: InferdiScopeOf<typeof root>
 *   }
 * }
 *
 * const app = new Koa()
 * app.use(inferdiKoa({ container: root }))
 *
 * app.use(async (ctx) => {
 *   ctx.body = await ctx.state.di.get('users').profile('42')
 * })
 * ```
 *
 * @module
 */

import type {
  Context,
  DefaultContext,
  DefaultState,
  Middleware,
  ParameterizedContext,
} from 'koa'

/**
 * A value of type `T` or a promise resolving to it. Used by scope hooks so they
 * accept both synchronous and asynchronous implementations.
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
 * Structural contract for the root container handed to the middleware.
 *
 * @template Scope - The per-request scope type produced by `createScope()`.
 */
export interface InferdiRoot<Scope extends InferdiScope = InferdiScope> {
  /** Opens a fresh request scope. Called once per request. */
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
 * Koa state fragment that exposes a concrete scope under a state key.
 *
 * @template Scope - The scope exposed on `ctx.state`.
 * @template Key   - The Koa state key. Defaults to `'di'`.
 */
export type InferdiKoaState<
  Scope extends InferdiScope,
  Key extends string = 'di',
> = {
  [P in Key]: Scope
}

/**
 * Koa context with a concrete InferDI request scope present on `ctx.state`.
 *
 * @template StateT  - Existing Koa state type.
 * @template ContextT - Existing Koa context extension type.
 * @template Scope   - The scope exposed on `ctx.state`.
 * @template Key     - The Koa state key. Defaults to `'di'`.
 */
export type InferdiKoaContext<
  StateT,
  ContextT,
  Scope extends InferdiScope,
  Key extends string = 'di',
> = ParameterizedContext<
  StateT & InferdiKoaState<Scope, Key>,
  ContextT
>

/**
 * Options for {@link inferdiKoa}.
 *
 * @template Root    - The root container type.
 * @template StateT  - Existing Koa state available to setup hooks.
 * @template ContextT - Existing Koa context extensions available to hooks.
 * @template Key     - The `ctx.state` key.
 * @template Scope   - The per-request scope type.
 */
export interface InferdiKoaOptions<
  Root extends InferdiRoot,
  StateT = DefaultState,
  ContextT = DefaultContext,
  Key extends string = 'di',
  Scope extends InferdiScope = InferdiScopeOf<Root>,
> {
  /** The root container. It is never disposed by this middleware. */
  readonly container: Root
  /** Koa `ctx.state` key. Defaults to `'di'`. */
  readonly key?: Key
  /**
   * Overrides how a request scope is created. Defaults to
   * `root.createScope()`. May be async.
   */
  readonly createScope?: (
    root: Root,
    context: ParameterizedContext<StateT, ContextT>,
  ) => MaybePromise<Scope>
  /**
   * Optional hook to hydrate the freshly created scope before downstream
   * middleware can read it from `ctx.state`.
   */
  readonly setupScope?: (
    scope: Scope,
    context: ParameterizedContext<StateT, ContextT>,
  ) => MaybePromise<void>
  /**
   * Overrides request-scope disposal. Defaults to `scope.dispose()`.
   */
  readonly disposeScope?: (
    scope: Scope,
    context: InferdiKoaContext<StateT, ContextT, Scope, Key>,
  ) => MaybePromise<void>
  /**
   * Controls whether the middleware disposes the request scope after response
   * completion. Returning `false` transfers disposal responsibility to
   * application code.
   */
  readonly autoDispose?:
    | boolean
    | ((
        context: InferdiKoaContext<StateT, ContextT, Scope, Key>,
      ) => MaybePromise<boolean>)
  /**
   * Optional sink for cleanup failures. Returning normally marks the cleanup
   * error as handled; omitted failures are emitted through `ctx.app`.
   */
  readonly onDisposeError?: (
    error: unknown,
    context: InferdiKoaContext<StateT, ContextT, Scope, Key>,
  ) => MaybePromise<void>
}

type TypedContext<
  StateT,
  ContextT,
  Scope extends InferdiScope,
  Key extends string,
> = InferdiKoaContext<StateT, ContextT, Scope, Key>

const skippedContexts = new WeakSet<Context>()

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function cleanupError(errors: unknown[]): unknown {
  if (errors.length === 1) return errors[0]

  return new AggregateError(errors, 'InferDI Koa request cleanup failed')
}

function normalizeError(error: unknown): Error {
  if (
    Object.prototype.toString.call(error) === '[object Error]' ||
    error instanceof Error
  ) {
    return error as Error
  }

  return new Error(`non-error thrown: ${String(error)}`)
}

function emitAppError(error: unknown, context: Context): void {
  try {
    context.app.emit('error', normalizeError(error), context)
  } catch {
    // Response cleanup must not fail because application error reporting failed.
  }
}

function emitUnhandledCleanupErrors(
  errors: unknown[],
  context: Context,
): void {
  if (errors.length === 0) return

  emitAppError(cleanupError(errors), context)
}

function handleDisposeError<
  StateT,
  ContextT,
  Scope extends InferdiScope,
  Key extends string,
>(
  error: unknown,
  context: TypedContext<StateT, ContextT, Scope, Key>,
  onDisposeError:
    | ((
        error: unknown,
        context: TypedContext<StateT, ContextT, Scope, Key>,
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
  StateT,
  ContextT,
  Scope extends InferdiScope,
  Key extends string,
>(
  scope: Scope,
  context: TypedContext<StateT, ContextT, Scope, Key>,
  disposeScope: (
    scope: Scope,
    context: TypedContext<StateT, ContextT, Scope, Key>,
  ) => MaybePromise<void>,
  onDisposeError:
    | ((
        error: unknown,
        context: TypedContext<StateT, ContextT, Scope, Key>,
      ) => MaybePromise<void>)
    | undefined,
  errors: unknown[],
): void | PromiseLike<void> {
  try {
    const disposing = disposeScope(scope, context)
    if (isPromiseLike(disposing)) {
      return disposing.then(
        undefined,
        (error) => handleDisposeError(
          error,
          context,
          onDisposeError,
          errors,
        ),
      )
    }
  } catch (error) {
    return handleDisposeError(error, context, onDisposeError, errors)
  }
}

async function disposeAfterSetupFailure<
  StateT,
  ContextT,
  Scope extends InferdiScope,
  Key extends string,
>(
  scope: Scope,
  context: TypedContext<StateT, ContextT, Scope, Key>,
  setupError: unknown,
  disposeScope: (
    scope: Scope,
    context: TypedContext<StateT, ContextT, Scope, Key>,
  ) => MaybePromise<void>,
  onDisposeError:
    | ((
        error: unknown,
        context: TypedContext<StateT, ContextT, Scope, Key>,
      ) => MaybePromise<void>)
    | undefined,
  clearScope: () => void,
): Promise<never> {
  // Finding 2: surface only the original setup error. Cleanup failures during
  // teardown go to `onDisposeError`, else are emitted through the app sink —
  // never aggregated into the thrown error.
  const errors: unknown[] = []
  const disposing = disposeWithErrors(
    scope,
    context,
    disposeScope,
    onDisposeError,
    errors,
  )

  try {
    await disposing
  } finally {
    clearScope()
  }
  emitUnhandledCleanupErrors(errors, context)
  throw setupError
}

/**
 * Marks the current Koa request scope as manually owned by application code.
 *
 * Koa stream responses normally do not need this: the middleware waits for the
 * underlying Node response `finish` / `close` events. Use this only when a
 * route intentionally keeps the scope beyond the HTTP response boundary, such
 * as background work that will dispose the scope later.
 *
 * @param context - The current Koa context.
 */
export function skipInferdiDispose(context: Context): void {
  skippedContexts.add(context)
}

/**
 * Creates Koa middleware that opens one InferDI request scope per request and
 * exposes it as `ctx.state.di`.
 *
 * @template Root    - The root container type.
 * @template StateT  - Existing Koa state visible in setup hooks.
 * @template ContextT - Existing Koa context extensions visible in hooks.
 * @template Scope   - The request scope type.
 */
export function inferdiKoa<
  Root extends InferdiRoot,
  StateT = DefaultState,
  ContextT = DefaultContext,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: Omit<
    InferdiKoaOptions<Root, StateT, ContextT, 'di', Scope>,
    'key'
  > & {
    readonly key?: 'di'
  },
): Middleware<StateT & InferdiKoaState<Scope, 'di'>, ContextT>

/**
 * Creates Koa middleware that opens one InferDI request scope per request and
 * exposes it under a custom `ctx.state` key.
 *
 * @template Root    - The root container type.
 * @template StateT  - Existing Koa state visible in setup hooks.
 * @template ContextT - Existing Koa context extensions visible in hooks.
 * @template Key     - The Koa state key.
 * @template Scope   - The request scope type.
 */
export function inferdiKoa<
  Root extends InferdiRoot,
  StateT = DefaultState,
  ContextT = DefaultContext,
  // `const Key` makes an inferred custom key behave like a literal here. Without
  // it, `StateT & InferdiKoaState<Scope, Key>` does not survive Koa's `.use()`
  // state inference for a non-default key, collapsing `ctx.state[key]` to `any`.
  const Key extends string = string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: InferdiKoaOptions<Root, StateT, ContextT, Key, Scope> & {
    readonly key: Key
  },
): Middleware<StateT & InferdiKoaState<Scope, Key>, ContextT>

export function inferdiKoa<
  Root extends InferdiRoot,
  StateT = DefaultState,
  ContextT = DefaultContext,
  Key extends string = string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: InferdiKoaOptions<Root, StateT, ContextT, Key, Scope>,
): Middleware<StateT & InferdiKoaState<Scope, Key>, ContextT> {
  const root = options.container
  const key = (options.key ?? 'di') as Key
  const createScope = options.createScope
  const setupScope = options.setupScope
  const disposeScope =
    options.disposeScope ??
    ((scope: Scope) => scope.dispose())
  const autoDispose = options.autoDispose
  const onDisposeError = options.onDisposeError

  return async function inferdiKoaMiddleware(context, next) {
    const setupContext = context as ParameterizedContext<StateT, ContextT>
    const typedContext = context as TypedContext<
      StateT,
      ContextT,
      Scope,
      Key
    >
    // No-hook fast path: the default scope factory is synchronous, so skip the
    // wrapper indirection and the `isPromiseLike` probe a custom factory needs.
    let scope: Scope
    if (createScope === undefined) {
      scope = root.createScope() as Scope
    } else {
      const scopeResult = createScope(root, setupContext)
      scope = isPromiseLike(scopeResult) ? await scopeResult : scopeResult
    }
    const state = typedContext.state as Record<Key, unknown>
    const hadStateKey = Object.prototype.hasOwnProperty.call(state, key)
    const previousStateValue = state[key]
    const clearScope = () => {
      if (hadStateKey) {
        state[key] = previousStateValue
        return
      }

      Reflect.deleteProperty(state, key)
    }

    // Expose the scope before `setupScope` so the setup-failure disposal hooks
    // (`disposeScope` / `onDisposeError`) see the same `ctx.state[key]` their
    // typed context promises. Nothing downstream runs until `next()`, so a
    // half-built scope is never observable outside cleanup.
    try {
      state[key] = scope
    } catch (error) {
      skippedContexts.delete(context)
      await disposeAfterSetupFailure(
        scope,
        typedContext,
        error,
        disposeScope,
        onDisposeError,
        clearScope,
      )
    }

    if (setupScope !== undefined) {
      try {
        const setupResult = setupScope(scope, setupContext)
        if (isPromiseLike(setupResult)) {
          await setupResult
        }
      } catch (error) {
        skippedContexts.delete(context)
        await disposeAfterSetupFailure(
          scope,
          typedContext,
          error,
          disposeScope,
          onDisposeError,
          clearScope,
        )
      }
    }

    if (autoDispose === false && !context.res.destroyed) {
      await next()
      return
    }

    let disposed = false
    // Finding 3: set when downstream throws so the completion cleanup disposes
    // even if `skipInferdiDispose` was called — skip suppresses only successful
    // cleanup. `autoDispose` is still honored (an explicit `false` keeps the
    // app's ownership even on error, matching the other adapters).
    let routeFailed = false
    const response = context.res

    const runCleanup = async (force: boolean) => {
      if (disposed) return

      disposed = true
      const skipped = skippedContexts.delete(context)
      if (!force && !routeFailed && skipped) return

      const errors: unknown[] = []
      let shouldDispose = force || autoDispose !== false

      if (!force && typeof autoDispose === 'function') {
        try {
          const autoDisposeResult = autoDispose(typedContext)
          shouldDispose = isPromiseLike(autoDisposeResult)
            ? await autoDisposeResult !== false
            : autoDisposeResult !== false
        } catch (error) {
          shouldDispose = true
          const handling = handleDisposeError(
            error,
            typedContext,
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
          typedContext,
          disposeScope,
          onDisposeError,
          errors,
        )
        if (isPromiseLike(disposing)) {
          await disposing
        }
      }

      emitUnhandledCleanupErrors(errors, context)
    }

    // One shared completion handler, attached with `on` rather than `once`: it
    // removes both listeners on the first event, so each request avoids the two
    // per-listener `once` wrapper allocations, while `runCleanup`'s `disposed`
    // flag keeps it idempotent. `finish` = response written; `close` =
    // connection closed before completion.
    const onComplete = () => {
      response.removeListener('finish', onComplete)
      response.removeListener('close', onComplete)
      // `runCleanup` handles lifecycle errors itself; this is a final bug guard.
      /* v8 ignore next 3 */
      void runCleanup(false).then(undefined, (error) => {
        emitAppError(error, context)
      })
    }

    try {
      response.on('finish', onComplete)
      response.on('close', onComplete)
    } catch (error) {
      response.removeListener('finish', onComplete)
      response.removeListener('close', onComplete)
      skippedContexts.delete(context)
      await disposeAfterSetupFailure(
        scope,
        typedContext,
        error,
        disposeScope,
        onDisposeError,
        clearScope,
      )
    }

    // An async `createScope` / `setupScope` can yield the event loop long enough
    // for the client to disconnect. If `close` already fired during that await,
    // the listeners above missed it; `destroyed` is true iff that already
    // happened, so dispose now instead of leaking the scope.
    if (response.destroyed) {
      response.removeListener('finish', onComplete)
      response.removeListener('close', onComplete)
      try {
        await runCleanup(true)
      } catch (error) {
        /* v8 ignore next -- runCleanup sinks its own errors; final bug guard */
        emitAppError(error, context)
      }
      return
    }

    try {
      await next()
    } catch (error) {
      routeFailed = true
      throw error
    }
  }
}
