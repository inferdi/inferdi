---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/adapters/elysia#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Adapters"
          "item": "https://inferdi.com/adapters/"
        - "@type": "ListItem"
          "position": 3
          "name": "Elysia"
          "item": "https://inferdi.com/adapters/elysia"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/adapters/elysia#article"
      "headline": "InferDI Elysia Adapter — @inferdi/elysia"
      "name": "Elysia Adapter"
      "description": "@inferdi/elysia is an Elysia v1 plugin: in scoped mode it creates one request scope, exposes it on Elysia context, keeps it available for error handlers, and disposes it from onAfterResponse — with a root-only mode for Bun apps."
      "url": "https://inferdi.com/adapters/elysia"
      "mainEntityOfPage": "https://inferdi.com/adapters/elysia"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Elysia v1, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Elysia, Elysia v1, plugin, Bun, scoped derive, onAfterResponse, root-only, dependency injection"
      "articleSection": "Adapters"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/elysia"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=20, Bun"
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

# Elysia Adapter

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) is an Elysia v1 plugin. In scoped mode it creates one request scope, exposes it on Elysia context, keeps it available for user error handlers, and disposes it from `onAfterResponse`.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
```

## Request Scope

```ts
const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    setupScope: (scope, { request }) => {
      const ctx = scope.get('request')
      ctx.requestId = crypto.randomUUID()
      ctx.userId = request.headers.get('x-user-id') ?? undefined
    },
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

For a custom context key:

```ts
const app = new Elysia()
  .use(inferdiElysia({ container: root, key: 'container' }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

Routes must be registered after `.use(inferdiElysia(...))` in the typed Elysia chain.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | required | Root container. |
| `key` | `'di'` | Elysia context key. |
| `scopePerRequest` | `true` | Set `false` for root-only mode. |
| `createScope` | `root.createScope()` | Custom request scope creation. |
| `setupScope` | none | Hydrates before validation and route handlers. |
| `setupValidatedScope` | none | Hydrates after Elysia validation. |
| `disposeScope` | `scope.dispose()` | Custom disposal. |
| `autoDispose` | `true` | `false` or predicate `false` transfers ownership. |
| `onDisposeError` | `console.error` | Cleanup failure sink. |

## Root-Only Mode

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

Root-only mode exposes the root container and installs no request-scope lifecycle hooks. Scoped-only options are statically rejected.

## Lifecycle Notes

Cleanup is lifecycle-bound to `onAfterResponse`. If Elysia never reaches that hook, the adapter cannot release resources held by the request scope. The per-request bookkeeping is weakly held, but resource disposal requires the lifecycle hook to run.

Use `setupScope` for values needed before validation. Use `setupValidatedScope` for values derived from validated body, query, params, headers, or cookies.

## Streaming

Elysia can produce a streaming `Response` before the stream drains. If scoped services are used after the route returns, call `skipInferdiDispose(context)` and dispose the scope yourself.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` suppresses only successful cleanup. Error paths still dispose.
