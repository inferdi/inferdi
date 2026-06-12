---
layout: home

hero:
  name: InferDI
  text: The only ultra-fast DI for modern TypeScript
  tagline: Build apps with next-gen DI for any modern runtime with ultra-fast architecture, clean domain logic, and first-class testability.
  image:
    src: /logo.png
    alt: InferDI
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/inferdi/inferdi

features:
  - icon:
      src: /fastify.png
      alt: Fastify
    title: Fastify
    details: >-
      Fastify is built for speed, the DI layer should stay out of its way. The Fastify v5 adapter plugs into plugins and hooks, creates a typed request scope in onRequest, and cleans it up in onResponse.
    link: /adapters/fastify
    linkText: Fastify adapter
  - icon:
      src: /hono.png
      alt: Hono
    title: Hono
    details: >-
      Edge apps need thin glue and quick starts. The Hono v4 adapter stores the request scope in context variables, fits Workers and Bun deployments, and keeps strict types at the network boundary.
    link: /adapters/hono
    linkText: Hono adapter
  - icon:
      src: /koa.png
      alt: Koa
    title: Koa
    details: >-
      Koa works best when the middleware chain stays small and explicit. The Koa v3 adapter binds request context to your services through a typed scope without hiding the async control flow.
    link: /adapters/koa
    linkText: Koa adapter
  - icon:
      src: /express.png
      alt: Express
    title: Express
    details: >-
      Express 5 is still the familiar default for many Node apps. This adapter gives those middleware chains a typed request scope, so services stop leaking through globals, hand-rolled factories, and scattered imports.
    link: /adapters/express
    linkText: Express adapter
  - icon:
      src: /elysia.png
      alt: Elysia
    title: Elysia
    details: >-
      Elysia v1 already gives Bun apps sharp route types. The adapter carries that type chain into your services, wiring each request to a DI scope so autocomplete follows the path from handler to business logic.
    link: /adapters/elysia
    linkText: Elysia adapter
  - icon:
      src: /puzzle.png
      alt: Framework-agnostic core
    title: Framework-agnostic core
    details: "InferDI has zero dependencies and runs anywhere — Node, Bun, Deno, browsers, workers. Adapters are optional request-scope glue, never a requirement."
    link: /adapters/
    linkText: How adapters work
---
