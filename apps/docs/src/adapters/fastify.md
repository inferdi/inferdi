---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/adapters/fastify#breadcrumb"
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
          "name": "Fastify"
          "item": "https://inferdi.com/adapters/fastify"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/adapters/fastify#article"
      "headline": "InferDI Fastify Adapter — @inferdi/fastify"
      "name": "Fastify Adapter"
      "description": "@inferdi/fastify is a Fastify v5 plugin: in scoped mode it exposes the root as app.di, creates one request scope in onRequest, exposes it as request.di, and disposes it in onResponse — with typed cleanup hooks and client-abort handling."
      "url": "https://inferdi.com/adapters/fastify"
      "mainEntityOfPage": "https://inferdi.com/adapters/fastify"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify v5, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Fastify, Fastify v5, plugin, request scope, request.di, onRequest, onResponse, dependency injection"
      "articleSection": "Adapters"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/fastify"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=20"
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

# Fastify Adapter

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) is a Fastify v5 plugin. In scoped mode it exposes the root as `app.di`, creates one request scope in `onRequest`, exposes it as `request.di`, and disposes it in `onResponse`.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
```

## Request Scope

Publish your concrete container types with module augmentation:

```ts
const root = buildRootContainer()
const app = Fastify()

type RootContainer = typeof root
type RequestContainer = ReturnType<RootContainer['createScope']>

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

await app.register(inferdiFastify, {
  container: root,
  setupScope: (scope: RequestContainer, request) => {
    const ctx = scope.get('request')
    ctx.requestId = request.id
    ctx.ip = request.ip
  },
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

Fastify's `app.register` cannot infer the plugin generics deeply enough for inline hooks, so annotate hook parameters when you need concrete scope types.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | required | Root container exposed as `app.di`. |
| `scopePerRequest` | `true` | Set `false` for root-only mode. |
| `createScope` | `root.createScope()` | Custom request scope creation. May be async. |
| `setupScope` | none | Hydrates the scope in `onRequest`. May be async. |
| `disposeScope` | `scope.dispose()` | Custom disposal. May be sync or async. |
| `autoDispose` | `true` | `false` or predicate `false` transfers ownership to application code. |
| `disposeRootOnClose` | `false` | Dispose root during `fastify.close()`. |
| `onDisposeError` | `request.log.error` | Sink for request-scope disposal failures. |

## Root-Only Mode

Use root-only mode when handlers only need singleton services:

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

Root-only mode installs no request decoration and no request lifecycle hooks.

## Lifecycle Notes

- `request.di` is exposed only after setup succeeds.
- Setup failure disposes the half-built scope and surfaces only the original setup error.
- Cleanup hooks observe `request.di` while they run.
- A failed request ignores `skipInferdiDispose` and still disposes, subject to `autoDispose`.
- Client abort cleanup runs in `onRequestAbort` after a scope has been exposed.
- Root disposal errors propagate through `fastify.close()` only when `disposeRootOnClose` is enabled.
