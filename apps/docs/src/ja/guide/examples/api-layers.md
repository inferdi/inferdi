---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/api-layers#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "ガイド"
          "item": "https://inferdi.com/ja/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "例"
          "item": "https://inferdi.com/ja/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "API レイヤー"
          "item": "https://inferdi.com/ja/guide/examples/api-layers"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/api-layers#article"
      "headline": "tRPC と GraphQL レイヤーにおける InferDI のスコープ設定"
      "name": "API レイヤー"
      "description": "tRPC の fetchRequestHandler、Apollo Server、GraphQL Yoga にわたって、プロシージャやリゾルバーごとではなく HTTP リクエストごとに 1 つの InferDI スコープを作成し、どの境界が破棄を所有するかを確認します。"
      "url": "https://inferdi.com/ja/guide/examples/api-layers"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/api-layers"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, tRPC, Apollo Server, GraphQL Yoga, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, tRPC, GraphQL, Apollo Server, GraphQL Yoga, リクエストスコープ, 依存性注入"
      "articleSection": "例"
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

# API レイヤー

RPC や GraphQL の統合では、プロシージャごとやリゾルバーごとではなく、HTTP リクエストごとに 1 つの InferDI スコープを作成すべきです。

これらの例は [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。各統合がどこでスコープを作成し、どの境界が破棄を所有するかを比較してください。

| 例 | 内容 |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | HTTP リクエスト全体にスコープを設定した tRPC の `fetchRequestHandler` |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | 非ストリーミング実行のための Apollo Server コンテキストスコープ |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | 非ストリーミング実行のための GraphQL Yoga コンテキストスコープ |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

リポジトリのファイル: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

リポジトリのファイル: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

リポジトリのファイル: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
