---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/adapters/hono#breadcrumb"
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
          "name": "Hono"
          "item": "https://inferdi.com/adapters/hono"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/adapters/hono#article"
      "headline": "InferDI Hono Adapter — @inferdi/hono"
      "name": "Hono Adapter"
      "description": "@inferdi/hono is Hono v4 middleware: it creates one request scope per invocation, exposes it through Hono context variables, and disposes it after the bounded route pipeline completes — fit for Cloudflare Workers and Bun at the edge."
      "url": "https://inferdi.com/adapters/hono"
      "mainEntityOfPage": "https://inferdi.com/adapters/hono"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Hono v4, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Hono, Hono v4, middleware, context variables, edge, Cloudflare Workers, Bun, dependency injection"
      "articleSection": "Adapters"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/hono"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=16, Bun, Cloudflare Workers"
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

# Hono Adapter

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) is Hono v4 middleware. It creates one request scope per middleware invocation, exposes it through Hono context variables, and disposes it after the bounded route pipeline completes.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
```

## Request Scope

```ts
const root = buildRootContainer()
type AppEnv = InferdiHonoEnv<typeof root>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  setupScope: (scope, c) => {
    const ctx = scope.get('request')
    ctx.requestId = crypto.randomUUID()
    ctx.userId = c.req.header('x-user-id')
  },
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` is equivalent to `c.var.di`.

## Custom Key

```ts
type AppEnv = InferdiHonoEnv<typeof root, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({ container: root, key: 'container' }))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

The adapter does not globally augment Hono's `ContextVariableMap`, so missing middleware remains visible to TypeScript.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | required | Root container. Never disposed by this middleware. |
| `key` | `'di'` | Context variable key. |
| `createScope` | `root.createScope()` | Custom request scope creation. |
| `setupScope` | none | Hydrates the scope before route handlers. |
| `disposeScope` | `scope.dispose()` | Custom disposal. |
| `autoDispose` | `true` | `false` or predicate `false` transfers ownership. |
| `onDisposeError` | `console.error` | Cleanup failure sink. |

## Streaming

Hono streaming helpers can return a `Response` before the stream callback finishes. Call `skipInferdiDispose(c)` and dispose the scope from the stream lifecycle.

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

`skipInferdiDispose` suppresses cleanup only for a successful response. Error paths still dispose.
