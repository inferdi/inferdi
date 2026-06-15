---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/fullstack#breadcrumb"
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
          "name": "フルスタックフレームワーク"
          "item": "https://inferdi.com/ja/guide/examples/fullstack"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/fullstack#article"
      "headline": "Next.js と Remix での InferDI スコープ"
      "name": "フルスタックフレームワーク"
      "description": "Next.js App Router と Remix のローダー、アクション、ルートハンドラー、サーバーアクションで InferDI スコープを使用し、開発時の HMR を生き延びる globalThis にキャッシュされたルートを利用します。"
      "url": "https://inferdi.com/ja/guide/examples/fullstack"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/fullstack"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Next.js, Remix, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Next.js, Remix, App Router, サーバーアクション, ローダー, 依存性注入"
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

# フルスタックフレームワーク

フルスタックの例では、ローダー、アクション、ルートハンドラー、サーバーアクションにスコープを使用します。開発ビルドでは、HMR 中のクライアント重複を避けるためにルートを `globalThis` にキャッシュします。

どちらの例も [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。各フレームワークが await する操作の境界を比較してください。

| 例 | 内容 |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Next.js App Router のリクエストおよび Server Action のスコープ境界 |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Remix のローダーおよびアクションのスコープ境界 |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

リポジトリのファイル: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

リポジトリのファイル: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
