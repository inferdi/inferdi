---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/adapters/koa#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Adaptadores"
          "item": "https://inferdi.com/es/adapters/"
        - "@type": "ListItem"
          "position": 3
          "name": "Adaptador de Koa"
          "item": "https://inferdi.com/es/adapters/koa"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/adapters/koa#article"
      "headline": "Adaptador de Koa de InferDI — @inferdi/koa"
      "name": "Adaptador de Koa"
      "description": "@inferdi/koa es middleware de Koa v3: crea un scope de petición, lo expone como ctx.state.di y lo libera después de que la respuesta de Node finaliza o se cierra, con claves de estado tipadas y hooks de limpieza."
      "url": "https://inferdi.com/es/adapters/koa"
      "mainEntityOfPage": "https://inferdi.com/es/adapters/koa"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Koa v3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Koa, Koa v3, middleware, ctx.state.di, ciclo de vida de la respuesta, inyección de dependencias"
      "articleSection": "Adaptadores"
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

# Adaptador de Koa

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) es middleware de Koa v3. Crea un scope de petición, lo expone como `ctx.state.di` y lo libera después de que la respuesta de Node finaliza o se cierra.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
```

## Scope de petición

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

## Clave de state personalizada

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

## Opciones

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `container` | requerido | Contenedor raíz. Este middleware nunca lo libera. |
| `key` | `'di'` | Clave del state de Koa. |
| `createScope` | `root.createScope()` | Creación personalizada del scope de petición. |
| `setupScope` | ninguno | Hidrata el scope antes del middleware aguas abajo. |
| `disposeScope` | `scope.dispose()` | Liberación personalizada. |
| `autoDispose` | `true` | `false` o un predicado `false` transfiere la propiedad. |
| `onDisposeError` | `ctx.app.emit('error')` | Sumidero de fallos de limpieza. |

## Streaming

Los cuerpos de stream normales de Koa no necesitan un skip. El adaptador espera al `finish` o `close`.

Usa `skipInferdiDispose(ctx)` solo cuando el código de la aplicación mantiene el scope intencionadamente más allá del límite de la respuesta HTTP, como en el trabajo en segundo plano:

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

Un error aguas abajo siempre libera el scope; las peticiones omitidas que tienen éxito pasan a ser propiedad de la aplicación.
