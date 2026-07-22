---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/installation#breadcrumb"
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
          "name": "インストール"
          "item": "https://inferdi.com/ja/guide/installation"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/installation#article"
      "headline": "npm または JSR から InferDI をインストールする"
      "name": "インストール"
      "description": "@inferdi/inferdi とそのフレームワークアダプターを、Node.js、Bun、Deno を通じて npm または JSR からインストールします。一致するパッケージ名とバージョン、ランタイム依存ゼロ、ビルドステップや reflect-metadata は不要です。"
      "url": "https://inferdi.com/ja/guide/installation"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/installation"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16, Bun, Deno"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, インストール, npm, JSR, Node.js, Bun, Deno, TypeScript 依存性注入"
      "articleSection": "ガイド"
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

# インストール

InferDI は、一致するパッケージ名と一致するバージョンで npm および JSR に公開されています。Node と Bun には npm 互換のインストールを、Deno や TypeScript ソースを好むランタイムには JSR を使用してください。

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

直接インポートすることもできます。

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## 要件

| ランタイム | 要件 |
| --- | --- |
| Node.js | コアパッケージには 16 以降 |
| Bun | 1.0 以降 |
| Deno | 1.40 以降 |
| TypeScript | 5.6 以降 |

ネイティブの `Symbol.dispose` および `Symbol.asyncDispose` より前の Node バージョンでは、InferDI はインポート時にシンボルのポリフィルをインストールするため、Explicit Resource Management の相互運用が引き続き機能します。

公開される型宣言は Explicit Resource Management の型ライブラリを自身で参照します。ES2022 をターゲットにする利用側が TypeScript の `lib` 設定へ `ESNext.Disposable` を追加する必要はありません。

## アダプターのインストール

コアパッケージ、アダプターパッケージ、そしてフレームワークの peer をインストールします。

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

各アダプターには、そのライフサイクルのルールと型のセットアップを解説した専用ページがあります。
