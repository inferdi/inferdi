---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples/api-layers#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "指南"
          "item": "https://inferdi.com/zh/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "示例"
          "item": "https://inferdi.com/zh/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "API 层"
          "item": "https://inferdi.com/zh/guide/examples/api-layers"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples/api-layers#article"
      "headline": "在 tRPC 和 GraphQL 层中作用域化 InferDI"
      "name": "API 层"
      "description": "在 tRPC fetchRequestHandler、Apollo Server 和 GraphQL Yoga 中，为每个 HTTP 请求（而非每个过程或解析器）创建一个 InferDI 作用域，并了解由哪个边界负责释放。"
      "url": "https://inferdi.com/zh/guide/examples/api-layers"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples/api-layers"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, tRPC, Apollo Server, GraphQL Yoga, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, tRPC, GraphQL, Apollo Server, GraphQL Yoga, 请求作用域, 依赖注入"
      "articleSection": "示例"
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

# API 层

RPC 和 GraphQL 集成应该为每个 HTTP 请求创建一个 InferDI 作用域，而不是为每个过程（procedure）或每个解析器（resolver）创建。

这些示例共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。请对比每种集成在何处创建作用域，以及由哪个边界负责释放。

| 示例 | 展示内容 |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` 围绕整个 HTTP 请求设置作用域 |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | 针对非流式执行的 Apollo Server context 作用域 |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | 针对非流式执行的 GraphQL Yoga context 作用域 |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

仓库文件：[`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

仓库文件：[`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

仓库文件：[`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
