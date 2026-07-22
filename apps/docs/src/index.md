---
layout: home

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
  - icon:
      src: /puzzle.png
      alt: Framework-agnostic core
    title: Framework-agnostic core
    details: "InferDI has zero runtime dependencies and runs in Node, Bun, Deno, browsers, and workers. Adapters add optional request-scope lifecycle glue."
    link: /adapters/
    linkText: How adapters work
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "WebSite"
      "@id": "https://inferdi.com/#website"
      "url": "https://inferdi.com/"
      "name": "InferDI"
      "description": "Decorator-free, strongly typed dependency injection for modern TypeScript."
      "inLanguage": "en-US"
      "publisher":
        "@id": "https://inferdi.com/#organization"
      "potentialAction":
        "@type": "SearchAction"
        "target":
          "@type": "EntryPoint"
          "urlTemplate": "https://inferdi.com/?q={search_term_string}"
        "query-input": "required name=search_term_string"
    - "@type": "Organization"
      "@id": "https://inferdi.com/#organization"
      "name": "InferDI"
      "url": "https://inferdi.com/"
      "logo":
        "@type": "ImageObject"
        "url": "https://inferdi.com/logo.png"
      "sameAs":
        - "https://github.com/inferdi/inferdi"
        - "https://twitter.com/inferdi_ts"
    - "@type": "SoftwareApplication"
      "@id": "https://inferdi.com/#software"
      "name": "InferDI"
      "applicationCategory": "DeveloperApplication"
      "operatingSystem": "Node.js, Bun, Deno, Browser, Edge runtimes"
      "softwareVersion": "5.0.5"
      "programmingLanguage": "TypeScript"
      "url": "https://inferdi.com/"
      "downloadUrl": "https://www.npmjs.com/package/@inferdi/inferdi"
      "description": "Zero-dependency, decorator-free, strongly typed DI container for TypeScript. TypeScript rejects misordered arguments, missing keys, and invalid lifetime dependencies at registration."
      "license": "https://github.com/inferdi/inferdi/blob/main/LICENSE"
      "author":
        "@id": "https://inferdi.com/#organization"
---
