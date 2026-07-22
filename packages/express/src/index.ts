/**
 * Express 5 request-scope middleware for InferDI.
 *
 * Creates one InferDI scope per Express request, exposes it as `req.di`, and
 * disposes it from the underlying Node response completion events. The package
 * is lifecycle glue only: no decorators, reflection, route scanning,
 * controller layer, or handler parameter injection.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
 *
 * const root = buildRootContainer()
 *
 * declare global {
 *   namespace Express {
 *     interface Request {
 *       di: InferdiScopeOf<typeof root>
 *     }
 *   }
 * }
 *
 * const app = express()
 * app.use(inferdiExpress({ container: root }))
 *
 * app.get('/users/:id', async (req, res, next) => {
 *   try {
 *     res.json(await req.di.get('users').profile(req.params.id))
 *   } catch (error) {
 *     next(error)
 *   }
 * })
 * ```
 *
 * @module
 */

import type { Request, RequestHandler, Response } from 'express'

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
 * Options for {@link inferdiExpress}.
 *
 * @template Root  - The root container type.
 * @template Scope - The per-request scope type.
 */
export interface InferdiExpressOptions<
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
> {
  /** The root container. It is never disposed by this middleware. */
  readonly container: Root
  /**
   * Overrides how a request scope is created. Defaults to
   * `root.createScope()`. May be async.
   */
  readonly createScope?: (
    root: Root,
    req: Request,
    res: Response
  ) => MaybePromise<Scope>
  /**
   * Optional hook to hydrate the freshly created scope before route handlers
   * can read it from `req.di`.
   */
  readonly setupScope?: (
    scope: Scope,
    req: Request,
    res: Response
  ) => MaybePromise<void>
  /**
   * Overrides request-scope disposal. Defaults to `scope.dispose()`.
   */
  readonly disposeScope?: (
    scope: Scope,
    req: Request,
    res: Response
  ) => MaybePromise<void>
  /**
   * Controls whether the middleware disposes the request scope after response
   * completion. Returning `false` transfers disposal responsibility to
   * application code.
   */
  readonly autoDispose?:
    | boolean
    | ((req: Request, res: Response) => MaybePromise<boolean>)
  /**
   * Optional sink for response-completion cleanup failures. Returning normally
   * marks the cleanup error as handled; omitted failures are logged.
   */
  readonly onDisposeError?: (
    error: unknown,
    req: Request,
    res: Response
  ) => MaybePromise<void>
}

type RequestWithDi<Scope extends InferdiScope> = Request & {
  di: Scope
}

type DisposeScope<Scope extends InferdiScope> = (
  scope: Scope,
  req: Request,
  res: Response
) => MaybePromise<void>

type AutoDispose = InferdiExpressOptions<InferdiRoot>['autoDispose']

type DisposeErrorHandler =
  InferdiExpressOptions<InferdiRoot>['onDisposeError']

const skippedRequests = new WeakSet<Request>()

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function handleDisposeError(
  error: unknown,
  req: Request,
  res: Response,
  onDisposeError: DisposeErrorHandler,
  errors: unknown[]
): void | PromiseLike<void> {
  if (onDisposeError === undefined) {
    errors.push(error)
    return
  }

  try {
    const handling = onDisposeError(error, req, res)
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
  req: Request,
  res: Response,
  disposeScope: DisposeScope<Scope>,
  onDisposeError: DisposeErrorHandler,
  errors: unknown[]
): void | PromiseLike<void> {
  try {
    const disposing = disposeScope(scope, req, res)
    if (isPromiseLike(disposing)) {
      return disposing.then(
        undefined,
        (error) => handleDisposeError(error, req, res, onDisposeError, errors)
      )
    }
  } catch (error) {
    return handleDisposeError(error, req, res, onDisposeError, errors)
  }
}

function logCleanupErrors(errors: unknown[]): void {
  if (errors.length === 0) return

  const err = errors.length === 1
    ? errors[0]
    : new AggregateError(errors, 'InferDI Express request cleanup failed')

  try {
    console.error('Failed to dispose InferDI Express request scope', err)
  } catch {
    // Response cleanup must not fail because fallback logging failed
  }
}

function clearRequestScope<Scope extends InferdiScope>(
  req: RequestWithDi<Scope>
): void {
  delete (req as { di?: Scope }).di
}

function nextSetupFailure<Scope extends InferdiScope>(
  req: RequestWithDi<Scope>,
  next: (error?: unknown) => void,
  error: unknown
): void {
  clearRequestScope(req)
  next(error)
}

/*
 * Setup / activation failures happen before the response is produced, so the
 * error is surfaced through `next(err)`. The disposal teardown still runs
 * through the shared `disposeWithErrors`, so a custom `onDisposeError` sees
 * setup-cleanup failures exactly as it sees post-response ones. Finding 2:
 * only the original lifecycle error is surfaced; any cleanup error
 * `onDisposeError` does not handle is logged, never aggregated into it. `req.di`
 * is cleared so downstream error handlers never observe a half-built scope
 */
function handleOwnedScopeFailure<Scope extends InferdiScope>(
  scope: Scope,
  req: RequestWithDi<Scope>,
  res: Response,
  lifecycleError: unknown,
  disposeScope: DisposeScope<Scope>,
  onDisposeError: DisposeErrorHandler,
  next: (error?: unknown) => void
): void {
  skippedRequests.delete(req)

  const errors: unknown[] = []
  const disposing = disposeWithErrors(
    scope,
    req,
    res,
    disposeScope,
    onDisposeError,
    errors
  )

  if (isPromiseLike(disposing)) {
    void Promise.resolve(disposing).then(() => {
      logCleanupErrors(errors)
      nextSetupFailure(req, next, lifecycleError)
    })
    return
  }

  logCleanupErrors(errors)
  nextSetupFailure(req, next, lifecycleError)
}

/*
 * Response-completion disposal, shaped like the Koa adapter: a single
 * `onComplete` handler attached to `finish`/`close` removes both listeners and
 * is made idempotent by the `disposed` flag. Normal completion (`fire(false)`)
 * honors `autoDispose` and `skipInferdiDispose` — including a client abort that
 * fires `close` after the handler ran, which is the manual-ownership contract
 * (the route owns that scope's disposal). `force` is used only when the response
 * is *already* destroyed at activation: the handler never ran, so no
 * application-owned cleanup will, and force bypasses `autoDispose` /
 * `skipInferdiDispose` so an already-dead connection cannot leak its scope
 */
function activate<Scope extends InferdiScope>(
  scope: Scope,
  req: RequestWithDi<Scope>,
  res: Response,
  next: (error?: unknown) => void,
  disposeScope: DisposeScope<Scope>,
  autoDispose: AutoDispose,
  onDisposeError: DisposeErrorHandler
): void {
  /*
   * Manual ownership over a live connection is the cheap fast path: no
   * completion listeners and no cleanup closures
   */
  if (autoDispose === false && !res.destroyed) {
    next()
    return
  }

  let disposed = false

  const runCleanup = async (force: boolean): Promise<void> => {
    if (disposed) return
    disposed = true

    const skipped = skippedRequests.delete(req)
    if (!force && skipped) return

    const errors: unknown[] = []
    let shouldDispose = force || autoDispose !== false

    if (!force && typeof autoDispose === 'function') {
      try {
        const autoDisposeResult = autoDispose(req, res)
        shouldDispose = isPromiseLike(autoDisposeResult)
          ? await autoDisposeResult !== false
          : autoDisposeResult !== false
      } catch (error) {
        shouldDispose = true
        const handling = handleDisposeError(
          error,
          req,
          res,
          onDisposeError,
          errors
        )
        if (isPromiseLike(handling)) {
          await handling
        }
      }
    }

    if (shouldDispose) {
      const disposing = disposeWithErrors(
        scope,
        req,
        res,
        disposeScope,
        onDisposeError,
        errors
      )
      if (isPromiseLike(disposing)) {
        await disposing
      }
    }

    logCleanupErrors(errors)
  }

  const fire = (force: boolean): void => {
    void runCleanup(force).then(
      undefined,
      /* v8 ignore next 3 -- runCleanup sinks its own errors; final bug guard */
      (error) => {
        logCleanupErrors([error])
      }
    )
  }

  const onComplete = () => {
    res.removeListener('finish', onComplete)
    res.removeListener('close', onComplete)
    fire(false)
  }

  /*
   * Already destroyed (e.g. client disconnected during async setup, or manual
   * ownership over a dead connection): force a cleanup and never call next() —
   * the request will not complete normally
   */
  if (res.destroyed) {
    fire(true)
    return
  }

  try {
    res.on('finish', onComplete)
    res.on('close', onComplete)
  } catch (error) {
    /*
     * A partial attach (`finish` on, `close` threw) would leave a live listener
     * that fires after the error handler ends the response and dispose the scope
     * a second time. Match the Koa adapter and drop both before owned cleanup
     */
    res.removeListener('finish', onComplete)
    res.removeListener('close', onComplete)
    handleOwnedScopeFailure(
      scope,
      req,
      res,
      error,
      disposeScope,
      onDisposeError,
      next
    )
    return
  }

  // The connection may have been destroyed while the listeners were attaching
  if (res.destroyed) {
    res.removeListener('finish', onComplete)
    res.removeListener('close', onComplete)
    fire(true)
    return
  }

  next()
}

function runExposeScope<Scope extends InferdiScope>(
  scope: Scope,
  req: Request,
  res: Response,
  next: (error?: unknown) => void,
  setupScope:
    | ((
        scope: Scope,
        req: Request,
        res: Response
      ) => MaybePromise<void>)
    | undefined,
  disposeScope: DisposeScope<Scope>,
  autoDispose: AutoDispose,
  onDisposeError: DisposeErrorHandler
): void {
  const typedReq = req as RequestWithDi<Scope>

  try {
    typedReq.di = scope
  } catch (error) {
    handleOwnedScopeFailure(
      scope,
      typedReq,
      res,
      error,
      disposeScope,
      onDisposeError,
      next
    )
    return
  }

  if (setupScope !== undefined) {
    try {
      const setupResult = setupScope(scope, req, res)
      if (isPromiseLike(setupResult)) {
        void Promise.resolve(setupResult).then(
          () => activate(
            scope,
            typedReq,
            res,
            next,
            disposeScope,
            autoDispose,
            onDisposeError
          ),
          (error) => handleOwnedScopeFailure(
            scope,
            typedReq,
            res,
            error,
            disposeScope,
            onDisposeError,
            next
          )
        )
        return
      }
    } catch (error) {
      handleOwnedScopeFailure(
        scope,
        typedReq,
        res,
        error,
        disposeScope,
        onDisposeError,
        next
      )
      return
    }
  }

  activate(
    scope,
    typedReq,
    res,
    next,
    disposeScope,
    autoDispose,
    onDisposeError
  )
}

/**
 * Marks the current Express request scope as manually owned by application
 * code. Use this when a route intentionally keeps the scope beyond the HTTP
 * response boundary, such as background work that will dispose the scope
 * later.
 *
 * @param req - The current Express request.
 */
export function skipInferdiDispose(req: Request): void {
  skippedRequests.add(req)
}

/**
 * Creates Express middleware that opens one InferDI request scope per request
 * and exposes it as `req.di`.
 *
 * @template Root  - The root container type.
 * @template Scope - The request scope type.
 */
export function inferdiExpress<
  Root extends InferdiRoot,
  Scope extends InferdiScope = InferdiScopeOf<Root>,
>(
  options: InferdiExpressOptions<Root, Scope>
): RequestHandler {
  const root = options.container
  const createScope = options.createScope
  const setupScope = options.setupScope
  const disposeScope =
    options.disposeScope ??
    ((scope: Scope) => scope.dispose())
  const autoDispose = options.autoDispose
  const onDisposeError = options.onDisposeError

  if (createScope === undefined && setupScope === undefined) {
    return function inferdiExpressMiddleware(req, res, next) {
      let scope: Scope

      try {
        scope = root.createScope() as Scope
      } catch (error) {
        next(error)
        return
      }

      runExposeScope(
        scope,
        req,
        res,
        next,
        undefined,
        disposeScope,
        autoDispose,
        onDisposeError
      )
    }
  }

  return function inferdiExpressMiddleware(req, res, next) {
    if (createScope === undefined) {
      let scope: Scope

      try {
        scope = root.createScope() as Scope
      } catch (error) {
        next(error)
        return
      }

      runExposeScope(
        scope,
        req,
        res,
        next,
        setupScope,
        disposeScope,
        autoDispose,
        onDisposeError
      )
      return
    }

    let scopeResult: MaybePromise<Scope>

    try {
      scopeResult = createScope(root, req, res)
    } catch (error) {
      next(error)
      return
    }

    if (isPromiseLike(scopeResult)) {
      void Promise.resolve(scopeResult).then(
        (scope) => runExposeScope(
          scope,
          req,
          res,
          next,
          setupScope,
          disposeScope,
          autoDispose,
          onDisposeError
        ),
        next
      )
      return
    }

    runExposeScope(
      scopeResult,
      req,
      res,
      next,
      setupScope,
      disposeScope,
      autoDispose,
      onDisposeError
    )
  }
}
