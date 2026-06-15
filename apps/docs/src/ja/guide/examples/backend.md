---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/backend#breadcrumb"
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
          "name": "バックエンドフレームワーク"
          "item": "https://inferdi.com/ja/guide/examples/backend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/backend#article"
      "headline": "バックエンドフレームワークにおける InferDI のリクエストスコープ"
      "name": "バックエンドフレームワーク"
      "description": "ルートコンテナを一度だけ構築し、HTTP リクエストごとに 1 つのリクエストスコープを作成し、フレームワークネイティブなリクエストオブジェクトを通じて公開し、レスポンスのライフサイクルから破棄します — Fastify、Hono、Koa、Express、Elysia にわたって比較します。"
      "url": "https://inferdi.com/ja/guide/examples/backend"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/backend"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify, Hono, Koa, Express, Elysia, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, バックエンド, リクエストスコープ, Fastify, Hono, Koa, Express, Elysia, 依存性注入"
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

# バックエンドフレームワーク

各バックエンドの例では、ルートコンテナを一度だけ構築し、HTTP リクエストごとに 1 つのリクエストスコープを作成し、フレームワークネイティブなリクエストオブジェクトを通じてスコープを公開し、レスポンスのライフサイクルの中でそれを破棄します。

これらは [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しているため、以下の違いはフレームワークのライフサイクルフックとアダプターの API にあります。

| 例 | アダプター |
| --- | --- |
| [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) | [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) |
| [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts) | [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) |
| [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts) | [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) |
| [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) | [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) |
| [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts) | [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) |

## Fastify

<<< ../../../../../../examples/backend/fastify.ts

リポジトリのファイル: [`examples/backend/fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts)

## Hono

<<< ../../../../../../examples/backend/hono.ts

リポジトリのファイル: [`examples/backend/hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)

## Koa

<<< ../../../../../../examples/backend/koa.ts

リポジトリのファイル: [`examples/backend/koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)

## Express

<<< ../../../../../../examples/backend/express.ts

リポジトリのファイル: [`examples/backend/express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts)

## Elysia

<<< ../../../../../../examples/backend/elysia.ts

リポジトリのファイル: [`examples/backend/elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)
