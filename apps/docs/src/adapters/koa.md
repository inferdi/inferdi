---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/adapters/koa#breadcrumb"
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
          "name": "Koa"
          "item": "https://inferdi.com/adapters/koa"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/adapters/koa#article"
      "headline": "InferDI Koa Adapter — @inferdi/koa"
      "name": "Koa Adapter"
      "description": "@inferdi/koa is Koa v3 middleware: it creates one request scope, exposes it as ctx.state.di, and disposes it after the Node response finishes or closes — with typed state keys and cleanup hooks."
      "url": "https://inferdi.com/adapters/koa"
      "mainEntityOfPage": "https://inferdi.com/adapters/koa"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Koa v3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Koa, Koa v3, middleware, ctx.state.di, response lifecycle, dependency injection"
      "articleSection": "Adapters"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/koa"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=18"
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

# Koa Adapter

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) is Koa v3 middleware. It creates one request scope, exposes it as `ctx.state.di`, and disposes it after the Node response finishes or closes.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
```

## Request Scope

```ts
const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    di: InferdiScopeOf<typeof root>
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  setupScope: (scope, ctx) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = ctx.get('x-user-id') || undefined
    request.ip = ctx.ip
  },
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## Custom State Key

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState, type InferdiScopeOf } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<InferdiScopeOf<typeof root>, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({ container: root, key: 'container' }))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | required | Root container. Never disposed by this middleware. |
| `key` | `'di'` | Koa state key. |
| `createScope` | `root.createScope()` | Custom request scope creation. |
| `setupScope` | none | Hydrates the scope before downstream middleware. |
| `disposeScope` | `scope.dispose()` | Custom disposal. |
| `autoDispose` | `true` | `false` or predicate `false` transfers ownership. |
| `onDisposeError` | `ctx.app.emit('error')` | Cleanup failure sink. |

## Streaming

Normal Koa stream bodies do not need a skip. The adapter waits for `finish` or `close`.

Use `skipInferdiDispose(ctx)` only when application code intentionally keeps the scope beyond the HTTP response boundary, such as background work:

```ts
import { skipInferdiDispose } from '@inferdi/koa'

app.use(async (ctx) => {
  skipInferdiDispose(ctx)
  const scope = ctx.state.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  ctx.body = { status: 'queued' }
})
```

A downstream error always disposes the scope; successful skipped requests become application-owned.
