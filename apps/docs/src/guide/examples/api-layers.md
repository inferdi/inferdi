---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/api-layers#breadcrumb"
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
          "name": "API Layers"
          "item": "https://inferdi.com/guide/examples/api-layers"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/api-layers#article"
      "headline": "Scoping InferDI in tRPC and GraphQL layers"
      "name": "API Layers"
      "description": "Create one InferDI scope per HTTP request — not per procedure or resolver — across tRPC fetchRequestHandler, Apollo Server, and GraphQL Yoga, and see which boundary owns disposal."
      "url": "https://inferdi.com/guide/examples/api-layers"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/api-layers"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, tRPC, Apollo Server, GraphQL Yoga, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, tRPC, GraphQL, Apollo Server, GraphQL Yoga, request scope, dependency injection"
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

# API Layers

RPC and GraphQL integrations should create one InferDI scope per HTTP request, not per procedure or per resolver.

These examples share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compare where each integration creates the scope and which boundary owns disposal.

| Example | Shows |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` scoped around a whole HTTP request |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | Apollo Server context scope for non-streaming execution |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | GraphQL Yoga context scope for non-streaming execution |

## tRPC

<<< ../../../../../examples/api-layers/trpc.ts

Repository file: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../examples/api-layers/apollo-server.ts

Repository file: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../examples/api-layers/graphql-yoga.ts

Repository file: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
