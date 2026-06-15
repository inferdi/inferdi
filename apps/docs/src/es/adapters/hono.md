---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/adapters/hono#breadcrumb"
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
          "name": "Adaptador de Hono"
          "item": "https://inferdi.com/es/adapters/hono"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/adapters/hono#article"
      "headline": "Adaptador de Hono de InferDI — @inferdi/hono"
      "name": "Adaptador de Hono"
      "description": "@inferdi/hono es middleware de Hono v4: crea un scope de petición por invocación, lo expone a través de las variables de contexto de Hono y lo libera después de que el pipeline acotado de la ruta se completa, apto para Cloudflare Workers y Bun en el edge."
      "url": "https://inferdi.com/es/adapters/hono"
      "mainEntityOfPage": "https://inferdi.com/es/adapters/hono"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Hono v4, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Hono, Hono v4, middleware, variables de contexto, edge, Cloudflare Workers, Bun, inyección de dependencias"
      "articleSection": "Adaptadores"
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

# Adaptador de Hono

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) es middleware de Hono v4. Crea un scope de petición por cada invocación del middleware, lo expone a través de las variables de contexto de Hono y lo libera después de que el pipeline acotado de la ruta se completa.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
```

## Scope de petición

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

`c.get('di')` es equivalente a `c.var.di`.

## Clave personalizada

```ts
type AppEnv = InferdiHonoEnv<typeof root, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({ container: root, key: 'container' }))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

El adaptador no aumenta globalmente el `ContextVariableMap` de Hono, por lo que la ausencia del middleware sigue siendo visible para TypeScript.

## Opciones

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `container` | requerido | Contenedor raíz. Este middleware nunca lo libera. |
| `key` | `'di'` | Clave de la variable de contexto. |
| `createScope` | `root.createScope()` | Creación personalizada del scope de petición. |
| `setupScope` | ninguno | Hidrata el scope antes de los handlers de rutas. |
| `disposeScope` | `scope.dispose()` | Liberación personalizada. |
| `autoDispose` | `true` | `false` o un predicado `false` transfiere la propiedad. |
| `onDisposeError` | `console.error` | Sumidero de fallos de limpieza. |

## Streaming

Los helpers de streaming de Hono pueden devolver una `Response` antes de que el callback del stream termine. Llama a `skipInferdiDispose(c)` y libera el scope desde el ciclo de vida del stream.

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

`skipInferdiDispose` suprime la limpieza solo para una respuesta exitosa. Las rutas de error igualmente liberan.
