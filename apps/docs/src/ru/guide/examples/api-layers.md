---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/api-layers#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Руководство"
          "item": "https://inferdi.com/ru/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Примеры"
          "item": "https://inferdi.com/ru/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "API-слои"
          "item": "https://inferdi.com/ru/guide/examples/api-layers"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/api-layers#article"
      "headline": "Scope InferDI в слоях tRPC и GraphQL"
      "name": "API-слои"
      "description": "Создавайте один scope InferDI на HTTP-запрос — а не на procedure или resolver — в tRPC fetchRequestHandler, Apollo Server и GraphQL Yoga и смотрите, какая граница отвечает за dispose."
      "url": "https://inferdi.com/ru/guide/examples/api-layers"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/api-layers"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, tRPC, Apollo Server, GraphQL Yoga, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, tRPC, GraphQL, Apollo Server, GraphQL Yoga, scope запроса, внедрение зависимостей"
      "articleSection": "Примеры"
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

# API-слои

RPC- и GraphQL-интеграции должны создавать один InferDI scope на HTTP-запрос, а не отдельный scope на procedure или resolver.

Эти примеры используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Сравнивайте, где интеграция создаёт scope и какая граница отвечает за dispose.

| Пример | Что показывает |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` со scope вокруг всего HTTP-запроса |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | scope в контексте Apollo Server для выполнения без стриминга |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | scope в контексте GraphQL Yoga для выполнения без стриминга |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Файл в репозитории: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Файл в репозитории: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Файл в репозитории: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
