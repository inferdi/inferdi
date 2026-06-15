---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/backend#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guide"
          "item": "https://inferdi.com/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Examples"
          "item": "https://inferdi.com/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Backend Frameworks"
          "item": "https://inferdi.com/guide/examples/backend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/backend#article"
      "headline": "InferDI request scopes in backend frameworks"
      "name": "Backend Frameworks"
      "description": "Build the root container once, create one request scope per HTTP request, expose it through the framework-native request object, and dispose it from the response lifecycle — compared across Fastify, Hono, Koa, Express, and Elysia."
      "url": "https://inferdi.com/guide/examples/backend"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/backend"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify, Hono, Koa, Express, Elysia, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, backend, request scope, Fastify, Hono, Koa, Express, Elysia, dependency injection"
      "articleSection": "Examples"
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

# Backend Frameworks

Each backend example builds the root container once, creates one request scope per HTTP request, exposes the scope through the framework-native request object, and disposes it from the response lifecycle.

They share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts), so the differences below are the framework lifecycle hooks and adapter APIs.

| Example | Adapter |
| --- | --- |
| [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) | [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) |
| [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts) | [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) |
| [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts) | [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) |
| [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) | [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) |
| [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts) | [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) |

## Fastify

<<< ../../../../../examples/backend/fastify.ts

Repository file: [`examples/backend/fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts)

## Hono

<<< ../../../../../examples/backend/hono.ts

Repository file: [`examples/backend/hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)

## Koa

<<< ../../../../../examples/backend/koa.ts

Repository file: [`examples/backend/koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)

## Express

<<< ../../../../../examples/backend/express.ts

Repository file: [`examples/backend/express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts)

## Elysia

<<< ../../../../../examples/backend/elysia.ts

Repository file: [`examples/backend/elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)
