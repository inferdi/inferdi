---
layout: home
description: "A zero-dependency, decorator-free DI container with compiler-checked graphs, explicit lifetimes, and predictable disposal."

hero:
  name: InferDI
  text: Typed dependency injection for modern TypeScript
  tagline: Register services explicitly, let TypeScript check the graph, and keep runtime resolution small.
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
      src: /react.png
      alt: React
    title: React
    details: >-
      The React 19 adapter exposes exact container types through context and Suspense-aware service hooks. Managed child scopes are created after commit and disposed automatically.
    link: /adapters/react
    linkText: React adapter
  - icon:
      src: /fastify.png
      alt: Fastify
    title: Fastify
    details: >-
      The Fastify v5 adapter creates a typed request scope in `onRequest` and disposes it in `onResponse`. It works with Fastify plugins and lifecycle hooks.
    link: /adapters/fastify
    linkText: Fastify adapter
  - icon:
      src: /hono.png
      alt: Hono
    title: Hono
    details: >-
      The Hono v4 adapter stores the request scope in context variables. Use it with Workers and Bun while keeping the scope type at the handler boundary.
    link: /adapters/hono
    linkText: Hono adapter
  - icon:
      src: /koa.png
      alt: Koa
    title: Koa
    details: >-
      The Koa v3 adapter binds request context to services through a typed scope and preserves Koa's async middleware flow.
    link: /adapters/koa
    linkText: Koa adapter
  - icon:
      src: /express.png
      alt: Express
    title: Express
    details: >-
      The Express 5 adapter adds a typed request scope to middleware and routes. Keep service wiring out of globals and ad hoc request factories.
    link: /adapters/express
    linkText: Express adapter
  - icon:
      src: /elysia.png
      alt: Elysia
    title: Elysia
    details: >-
      The Elysia v1 adapter connects each request to a typed DI scope and carries route types into the service layer.
    link: /adapters/elysia
    linkText: Elysia adapter
---
