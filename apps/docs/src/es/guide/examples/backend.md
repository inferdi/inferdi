---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/backend#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guía"
          "item": "https://inferdi.com/es/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Ejemplos"
          "item": "https://inferdi.com/es/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Frameworks de backend"
          "item": "https://inferdi.com/es/guide/examples/backend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/backend#article"
      "headline": "Scopes de petición de InferDI en frameworks de backend"
      "name": "Frameworks de backend"
      "description": "Construye el contenedor raíz una sola vez, crea un scope de petición por cada petición HTTP, exponlo a través del objeto de petición nativo del framework y libéralo desde el ciclo de vida de la respuesta — comparado entre Fastify, Hono, Koa, Express y Elysia."
      "url": "https://inferdi.com/es/guide/examples/backend"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/backend"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify, Hono, Koa, Express, Elysia, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, backend, scope de petición, Fastify, Hono, Koa, Express, Elysia, inyección de dependencias"
      "articleSection": "Ejemplos"
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

# Frameworks de backend

Cada ejemplo de backend construye el contenedor raíz una sola vez, crea un scope de petición por cada petición HTTP, expone el scope a través del objeto de petición nativo del framework y lo libera desde el ciclo de vida de la respuesta.

Comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts), de modo que las diferencias que se muestran a continuación están en los hooks del ciclo de vida del framework y en las API de los adaptadores.

| Ejemplo | Adaptador |
| --- | --- |
| [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) | [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) |
| [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts) | [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) |
| [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts) | [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) |
| [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) | [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) |
| [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts) | [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) |

## Fastify

<<< ../../../../../../examples/backend/fastify.ts

Archivo del repositorio: [`examples/backend/fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts)

## Hono

<<< ../../../../../../examples/backend/hono.ts

Archivo del repositorio: [`examples/backend/hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)

## Koa

<<< ../../../../../../examples/backend/koa.ts

Archivo del repositorio: [`examples/backend/koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)

## Express

<<< ../../../../../../examples/backend/express.ts

Archivo del repositorio: [`examples/backend/express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts)

## Elysia

<<< ../../../../../../examples/backend/elysia.ts

Archivo del repositorio: [`examples/backend/elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)
