---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/api-layers#breadcrumb"
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
          "name": "Capas de API"
          "item": "https://inferdi.com/es/guide/examples/api-layers"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/api-layers#article"
      "headline": "Scopes de InferDI en capas de tRPC y GraphQL"
      "name": "Capas de API"
      "description": "Crea un scope de InferDI por cada petición HTTP — no por cada procedimiento ni por cada resolver — en tRPC fetchRequestHandler, Apollo Server y GraphQL Yoga, y descubre qué límite es dueño de la liberación."
      "url": "https://inferdi.com/es/guide/examples/api-layers"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/api-layers"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, tRPC, Apollo Server, GraphQL Yoga, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, tRPC, GraphQL, Apollo Server, GraphQL Yoga, scope de petición, inyección de dependencias"
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

# Capas de API

Las integraciones con RPC y GraphQL deberían crear un scope de InferDI por cada petición HTTP, no por cada procedimiento ni por cada resolver.

Estos ejemplos comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compara dónde crea el scope cada integración y qué límite es responsable de su liberación.

| Ejemplo | Muestra |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | `fetchRequestHandler` de tRPC con scope alrededor de toda una petición HTTP |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | Scope en el context de Apollo Server para ejecución no en streaming |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | Scope en el context de GraphQL Yoga para ejecución no en streaming |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Archivo del repositorio: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Archivo del repositorio: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Archivo del repositorio: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
