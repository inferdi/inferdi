---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/adapters/fastify#breadcrumb"
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
          "name": "Adaptador de Fastify"
          "item": "https://inferdi.com/es/adapters/fastify"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/adapters/fastify#article"
      "headline": "Adaptador de Fastify de InferDI — @inferdi/fastify"
      "name": "Adaptador de Fastify"
      "description": "@inferdi/fastify es un plugin de Fastify v5: en modo con scope expone la raíz como app.di, crea un scope de petición en onRequest, lo expone como request.di y lo libera en onResponse, con hooks de limpieza tipados y gestión del aborto del cliente."
      "url": "https://inferdi.com/es/adapters/fastify"
      "mainEntityOfPage": "https://inferdi.com/es/adapters/fastify"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify v5, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Fastify, Fastify v5, plugin, scope de petición, request.di, onRequest, onResponse, inyección de dependencias"
      "articleSection": "Adaptadores"
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

# Adaptador de Fastify

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) es un plugin de Fastify v5. En modo con scope, expone la raíz como `app.di`, crea un scope de petición en `onRequest`, lo expone como `request.di` y lo libera en `onResponse`.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
```

## Scope de petición

Publica los tipos concretos de tu contenedor mediante module augmentation:

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

El `app.register` de Fastify no puede inferir los genéricos del plugin con suficiente profundidad para los hooks en línea, así que anota los parámetros de los hooks cuando necesites tipos de scope concretos.

## Opciones

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `container` | requerido | Contenedor raíz expuesto como `app.di`. |
| `scopePerRequest` | `true` | Establece `false` para el modo solo raíz. |
| `createScope` | `root.createScope()` | Creación personalizada del scope de petición. Puede ser asíncrona. |
| `setupScope` | ninguno | Hidrata el scope en `onRequest`. Puede ser asíncrono. |
| `disposeScope` | `scope.dispose()` | Liberación personalizada. Puede ser síncrona o asíncrona. |
| `autoDispose` | `true` | `false` o un predicado `false` transfiere la propiedad al código de la aplicación. |
| `disposeRootOnClose` | `false` | Libera la raíz durante `fastify.close()`. |
| `onDisposeError` | `request.log.error` | Sumidero para los fallos de liberación del scope de petición. |

## Modo solo raíz

Usa el modo solo raíz cuando los handlers solo necesiten servicios singleton:

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

El modo solo raíz no instala ninguna decoración de petición ni ningún hook del ciclo de vida de la petición.

## Notas del ciclo de vida

- `request.di` se expone solo después de que la configuración tiene éxito.
- Un fallo de configuración libera el scope a medio construir y expone solo el error original de configuración.
- Los hooks de limpieza observan `request.di` mientras se ejecutan.
- Una petición fallida ignora `skipInferdiDispose` y igualmente libera, sujeto a `autoDispose`.
- La limpieza por aborto del cliente se ejecuta en `onRequestAbort` después de que se haya expuesto un scope.
- Los errores de liberación de la raíz se propagan a través de `fastify.close()` solo cuando `disposeRootOnClose` está activado.
