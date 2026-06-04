# Backend Frameworks

These adapters share a single container builder — [`../_shared/container.ts`](../_shared/container.ts) — so each file shows only the framework-specific wiring. The shared module is the canonical InferDI example: async `Database` factory with `Symbol.asyncDispose`, `Lazy<Clock>` companion key, `Module<TIn, TOut>` composition, and the compile-time lifetime guard.

The wiring pattern is the same everywhere, with Fastify, Hono, Koa, and Elysia using
the published `@inferdi/fastify`, `@inferdi/hono`, `@inferdi/koa`, and `@inferdi/elysia`
adapters for lifecycle hooks:

1. Build the root container once when the server starts (`buildRootContainer()`).
2. For each HTTP request, create a scope with `await createRequestScope(root, {...})` through an adapter scope hook.
3. Attach the scope to the framework request/context object.
4. Dispose the scope from the framework's response-completion lifecycle. `dispose()` is idempotent, so Koa can safely listen to both Node `finish` and `close`. In Fastify, use `onResponse` only; `onError` runs before the error handler finishes. In Elysia, use the adapter's guarded `onError` + `onAfterResponse` cleanup so validation failures after `derive` do not leak scopes.

Avoid `await using` inside normal HTTP route handlers. Many frameworks can stream or defer response work after the handler returns, so scope disposal must be tied to the actual response lifecycle. Hono streaming handlers should call `skipInferdiDispose(c)` and own cleanup in the stream or `executionCtx.waitUntil`; Koa stream bodies normally stay covered by `finish` / `close`, so call `skipInferdiDispose(ctx)` only for background ownership transfer.

Do not use `override()` for request context in production code. It is a test API. The production pattern is `await createRequestScope(root, init)`, which creates the scope, hydrates the scoped context instance, and disposes the scope if hydration fails.
