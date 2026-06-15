---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/adapters/#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Adapters"
          "item": "https://inferdi.com/adapters/"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/adapters/#article"
      "headline": "InferDI Framework Adapters — overview"
      "name": "Framework Adapters"
      "description": "Each InferDI adapter creates one request scope per request, exposes it at the framework-native location, and disposes it at the framework's safe completion point — while preserving the concrete, fully typed container your application owns. Thin lifecycle glue, never an IoC framework."
      "url": "https://inferdi.com/adapters/"
      "mainEntityOfPage": "https://inferdi.com/adapters/"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, @inferdi/inferdi, Fastify, Hono, Koa, Express, Elysia"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, adapters, request scope, Fastify, Hono, Koa, Express, Elysia, middleware, dependency injection"
      "articleSection": "Adapters"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

# Framework Adapters

Each adapter creates exactly one request scope per request, exposes it at the framework-native location, and disposes it at the framework's safe completion point — while preserving the concrete container type your application owns, so `request.di` is fully typed, not `any` or a base container.

That is the entire job. Adapters are thin lifecycle glue: the same design that keeps [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) zero-dependency also keeps decorators, controller scanning, handler parameter injection, and route discovery out of the core. You opt into a framework's request lifecycle, not into a framework's idea of dependency injection.

## Packages

| Package | Framework | Scope location | Root-only mode |
| --- | --- | --- | --- |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di` | yes |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Hono v4 | `c.var.di` | no |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | Koa v3 | `ctx.state.di` | no |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5 | `req.di` | no |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | Elysia v1 | `context.di` | yes |

## Common Lifecycle Contract

In scoped mode every adapter runs the same steps for each request:

1. **Create** the scope from the root container (`createScope`, default `root.createScope()`) when the request begins.
2. **Expose** it at the framework-native location (`request.di`, `ctx.state.di`, `c.var.di`, or the Elysia context key) *before* setup runs, so a setup failure and your cleanup hooks all observe the same slot.
3. **Set up** the scope with `setupScope` to hydrate request-derived state — request id, authenticated user, client IP. It may be async.
4. **Handle** the request: route handlers and the framework's error handlers resolve services from the exposed scope.
5. **Dispose** the scope at the framework's safe completion point (`disposeScope`, default `scope.dispose()`), unless ownership was transferred.

### Shared options

| Option | Default | Purpose |
| --- | --- | --- |
| `container` | required | Root container exposed to the app. Adapters never dispose it (except Fastify's opt-in `disposeRootOnClose`). |
| `createScope` | `root.createScope()` | Build the per-request scope. May be async. |
| `setupScope` | none | Hydrate the scope before handlers run. May be async. |
| `disposeScope` | `scope.dispose()` | Custom teardown. May be sync or async. |
| `autoDispose` | `true` | `false`, or a predicate returning `false`, hands disposal to your code. |
| `onDisposeError` | per-adapter sink | Receives request-scope disposal failures: Fastify `request.log.error`, Koa `ctx.app.emit('error')`, others `console.error`. |
| `skipInferdiDispose(...)` | — | Marks one request as application-owned for streaming or background work. |

### Error and ownership rules

- **Setup failure surfaces only the original error.** If `setupScope` throws, the adapter disposes the half-built scope and re-raises that error. A teardown failure during this cleanup goes to `onDisposeError` (or the sink) and is never aggregated into the surfaced error.
- **A failed request still disposes.** `skipInferdiDispose` suppresses cleanup only on a *successful* response; an error path disposes regardless. Express is the exception — its callback middleware cannot observe a handled route error, so a skipped failed Express request stays application-owned.
- **`autoDispose: false` and `skipInferdiDispose` transfer ownership.** Your code then owns disposing the scope at the correct framework boundary.
- **Cleanup errors after a response is produced are routed to the sink and swallowed.** The response is already sent, so a late teardown failure can never corrupt it.

## Important Differences

| Adapter | Difference |
| --- | --- |
| Fastify | Disposes in `onResponse`; abort cleanup uses `onRequestAbort`; root disposal can be opted into with `disposeRootOnClose`. |
| Hono | Disposes after `await next()`; streaming helpers can return before stream work finishes, so streaming routes often need `skipInferdiDispose`. |
| Koa | Waits for Node response `finish` or `close`, so normal stream bodies do not need a skip. |
| Express | Cannot detect a handled downstream route error from callback middleware; a skipped failed request remains application-owned. |
| Elysia | Cleanup is bound to `onAfterResponse`; if that hook is never reached, resources held by the scope cannot be released by the adapter. |
