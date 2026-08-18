# Backend Frameworks

These adapters share [`../_shared/container.ts`](../_shared/container.ts), so each file contains framework-specific wiring. The shared module demonstrates `registerAsyncFactory()`, propagated async dependencies, `Symbol.asyncDispose`, a `Lazy<Clock>` singleton companion and `Module<TRequirements, TProvides>` composition.

The wiring pattern is the same everywhere, with Fastify, Hono, Koa, Express, and Elysia using
the published `@inferdi/fastify`, `@inferdi/hono`, `@inferdi/koa`, `@inferdi/express`, and `@inferdi/elysia`
adapters for lifecycle hooks:

1. Build the root container once when the server starts (`buildRootContainer()`).
2. For each HTTP request, create a scope with `createRequestScope(root, {...})` through an adapter scope hook.
3. Attach the scope to the framework request/context object.
4. Dispose the scope from the framework's response-completion lifecycle. `dispose()` is idempotent, so Koa and Express can safely listen to both Node `finish` and `close`. In Fastify, use `onResponse` only; `onError` runs before the error handler finishes. In Elysia, use the adapter's guarded `onError` + `onAfterResponse` cleanup so validation failures after `derive` do not leak scopes.

The application still owns the root. The Fastify example enables `disposeRootOnClose`; applications using the other adapters should call `await root.dispose()` from their server shutdown hook. Request-scope disposal never cascades to root singletons such as `Database`.

Avoid `await using` inside normal HTTP route handlers. Many frameworks can stream or defer response work after the handler returns, so scope disposal must be tied to the actual response lifecycle. Hono streaming handlers should call `skipInferdiDispose(c)` and own cleanup in the stream or `executionCtx.waitUntil`; Koa and Express stream bodies normally stay covered by `finish` / `close`, so call `skipInferdiDispose(...)` only for background ownership transfer.

Do not use `override()` for request context in production code. It is a test API. The production pattern is `createRequestScope(root, input)`, which passes a declared scope input to `root.createScope({ request: input })`.
