/**
 * Hono request-scope middleware for InferDI.
 *
 * Creates one InferDI scope per Hono request, exposes it through Hono context
 * variables, and disposes it when the bounded route pipeline completes. The
 * package is lifecycle glue only: no decorators, reflection, route scanning, or
 * handler parameter injection.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
 *
 * const root = buildRootContainer()
 * type AppEnv = InferdiHonoEnv<typeof root>
 *
 * const app = new Hono<AppEnv>()
 * app.use('*', inferdiHono({ container: root }))
 *
 * app.get('/users/:id', async (c) => {
 *   return c.json(await c.var.di.get('users').profile(c.req.param('id')))
 * })
 * ```
 *
 * @module
 */

import type { Context, Env, MiddlewareHandler } from 'hono'

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
 * Hono `Env` fragment that exposes a concrete scope under a context variable
 * key.
 *
 * @template Scope - The scope exposed on Hono context variables.
 * @template Key   - The Hono variable key. Defaults to `'di'`.
 */
export type InferdiHonoScopeEnv<
  Scope extends InferdiScope,
  Key extends string = 'di',
> = {
  Variables: {
    [P in Key]: Scope
  }
}

/**
 * Hono `Env` fragment that exposes the scope returned by `Root#createScope()`.
 *
 * @template Root - The root container type.
 * @template Key  - The Hono variable key. Defaults to `'di'`.
 */
export type InferdiHonoEnv<
  Root extends InferdiRoot,
  Key extends string = 'di',
> = InferdiHonoScopeEnv<InferdiScopeOf<Root>, Key>

/**
 * Options for {@link inferdiHono}.
 *
 * @template Root  - The root container type.
 * @template E     - Existing Hono environment available to setup hooks.
 * @template Key   - The context variable key.
 * @template Scope - The per-request scope type.
 */
export interface InferdiHonoOptions<
  Root extends InferdiRoot,
  E extends Env,
  Key extends string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
> {
  /** The root container. It is never disposed by this middleware. */
  readonly container: Root
  /** Hono context variable key. Defaults to `'di'`. */
  readonly key?: Key
  /**
   * Overrides how a request scope is created. Defaults to
   * `root.createScope()`. May be async.
   */
  readonly createScope?: (
    root: Root,
    context: Context<E>,
  ) => MaybePromise<Scope>
  /**
   * Optional hook to hydrate the freshly created scope before route handlers
   * can read it from `c.var`.
   */
  readonly setupScope?: (
    scope: Scope,
    context: Context<E>,
  ) => MaybePromise<void>
  /**
   * Overrides request-scope disposal. Defaults to `scope.dispose()`.
   */
  readonly disposeScope?: (
    scope: Scope,
    context: Context<E & InferdiHonoScopeEnv<Scope, Key>>,
  ) => MaybePromise<void>
  /**
   * Controls whether the middleware disposes the request scope after `next()`.
   * Returning `false` transfers disposal responsibility to application code.
   */
  readonly autoDispose?:
    | boolean
    | ((
        context: Context<E & InferdiHonoScopeEnv<Scope, Key>>,
      ) => MaybePromise<boolean>)
  /**
   * Optional sink for disposal failures. If it returns normally, the disposal
   * error is considered handled; if omitted, disposal errors propagate.
   */
  readonly onDisposeError?: (
    error: unknown,
    context: Context<E & InferdiHonoScopeEnv<Scope, Key>>,
  ) => MaybePromise<void>
}

type TypedContext<
  E extends Env,
  Scope extends InferdiScope,
  Key extends string,
> = Context<E & InferdiHonoScopeEnv<Scope, Key>>

const skippedContexts = new WeakSet<any>()

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function throwCollected(errors: unknown[]): void {
  if (errors.length === 0) return

  if (errors.length === 1) {
    throw errors[0]
  }

  throw new AggregateError(errors, 'InferDI Hono request lifecycle failed')
}

function prependContextError(errors: unknown[], context: Context): void {
  if (errors.length === 0) return

  const error = context.error
  if (error !== undefined && !errors.includes(error)) {
    errors.unshift(error)
  }
}

function disposeWithErrors<
  E extends Env,
  Scope extends InferdiScope,
  Key extends string,
>(
  scope: Scope,
  context: TypedContext<E, Scope, Key>,
  disposeScope: (
    scope: Scope,
    context: TypedContext<E, Scope, Key>,
  ) => MaybePromise<void>,
  onDisposeError:
    | ((
        error: unknown,
        context: TypedContext<E, Scope, Key>,
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

function handleDisposeError<
  E extends Env,
  Scope extends InferdiScope,
  Key extends string,
>(
  error: unknown,
  context: TypedContext<E, Scope, Key>,
  onDisposeError:
    | ((
        error: unknown,
        context: TypedContext<E, Scope, Key>,
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
        errors.push(handlerError)
      })
    }
  } catch (handlerError) {
    errors.push(handlerError)
  }
}

/**
 * Marks the current Hono request as manually disposed by application code.
 * Streaming routes should call this before returning a streaming `Response`,
 * then dispose the scope in the stream callback's own `finally` block.
 *
 * @param context - The current Hono context.
 */
export function skipInferdiDispose(context: Context): void {
  skippedContexts.add(context)
}

/**
 * Creates Hono middleware that opens one InferDI request scope per request and
 * exposes it as `c.var.di`.
 *
 * @template Root  - The root container type.
 * @template E     - Existing Hono environment visible in setup hooks.
 * @template Scope - The request scope type.
 */
export function inferdiHono<
  Root extends InferdiRoot,
  E extends Env = Env,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: Omit<InferdiHonoOptions<Root, E, 'di', Scope>, 'key'> & {
    readonly key?: 'di'
  },
): MiddlewareHandler<E & InferdiHonoScopeEnv<Scope, 'di'>>

/**
 * Creates Hono middleware that opens one InferDI request scope per request and
 * exposes it under a custom Hono context variable key.
 *
 * @template Root  - The root container type.
 * @template E     - Existing Hono environment visible in setup hooks.
 * @template Key   - The Hono context variable key.
 * @template Scope - The request scope type.
 */
export function inferdiHono<
  Root extends InferdiRoot,
  E extends Env = Env,
  Key extends string = string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: InferdiHonoOptions<Root, E, Key, Scope> & {
    readonly key: Key
  },
): MiddlewareHandler<E & InferdiHonoScopeEnv<Scope, Key>>

export function inferdiHono<
  Root extends InferdiRoot,
  E extends Env = Env,
  Key extends string = string,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: InferdiHonoOptions<Root, E, Key, Scope>,
): MiddlewareHandler<E & InferdiHonoScopeEnv<Scope, Key>> {
  const root = options.container
  const key = (options.key ?? 'di') as Key
  const createScope =
    options.createScope ??
    ((root: Root) => root.createScope() as Scope)
  const disposeScope =
    options.disposeScope ??
    ((scope: Scope) => scope.dispose())
  const setupScope = options.setupScope
  const autoDispose = options.autoDispose
  const onDisposeError = options.onDisposeError

  return async (context, next) => {
    const typedContext = context as TypedContext<E, Scope, Key>
    const scopeOrPromise = createScope(root, context as Context<E>)
    const scope = isPromiseLike(scopeOrPromise)
      ? await scopeOrPromise
      : scopeOrPromise

    try {
      if (setupScope !== undefined) {
        const setupResult = setupScope(scope, context as Context<E>)
        if (isPromiseLike(setupResult)) {
          await setupResult
        }
      }
      ;(typedContext.set as unknown as (key: Key, value: Scope) => void)(
        key,
        scope,
      )
    } catch (error) {
      const errors = [error]
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
      throwCollected(errors)
    }

    const errors: unknown[] = []

    try {
      await next()
    } catch (error) {
      errors.push(error)
    }

    const skipped = skippedContexts.delete(context)

    if (!skipped) {
      let shouldDispose = autoDispose !== false

      if (typeof autoDispose === 'function') {
        try {
          const autoDisposeResult = autoDispose(typedContext)
          shouldDispose = isPromiseLike(autoDisposeResult)
            ? await autoDisposeResult !== false
            : autoDisposeResult !== false
        } catch (error) {
          errors.push(error)
          shouldDispose = true
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
    }

    prependContextError(errors, context)
    throwCollected(errors)
  }
}
