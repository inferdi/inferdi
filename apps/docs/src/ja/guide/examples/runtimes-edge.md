---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/runtimes-edge#breadcrumb"
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
          "name": "ランタイムとエッジプラットフォーム"
          "item": "https://inferdi.com/ja/guide/examples/runtimes-edge"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/runtimes-edge#article"
      "headline": "Node、Bun、Deno、エッジランタイムでの InferDI"
      "name": "ランタイムとエッジプラットフォーム"
      "description": "低レベルの Node HTTP、Bun serve、Deno HTTP、エッジ関数にわたってモジュールレベルのルートとリクエストごとに 1 つのスコープを使用します。境界が定まったハンドラーには await using を、ストリーミングやバックグラウンド処理には明示的な破棄を使います。"
      "url": "https://inferdi.com/ja/guide/examples/runtimes-edge"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/runtimes-edge"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Node.js, Bun, Deno, Supabase Edge Functions, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, ランタイム, エッジ, Node HTTP, Bun, Deno, Supabase Edge Functions, await using, リクエストスコープ"
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

# ランタイムとエッジプラットフォーム

ランタイムの例では、モジュールレベルのルートを使用し、リクエストごとに 1 つのスコープを作成します。境界が明確なハンドラーでは `await using` を使用できます。ストリーミングやバックグラウンドの処理では、その処理が完了した後に破棄すべきです。

ほとんどの例は [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。Supabase Edge Functions では、同じリクエストスコープの規律を保ちながら、ローカルなファクトリーの差し替えを使用します。

| 例 | 内容 |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | レスポンスのクリーンアップを伴う低レベルな Node HTTP ライフサイクル |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Bun `serve` のリクエストスコープ |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Deno HTTP のリクエストスコープ |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Cloudflare Workers のリクエストスコープと `ctx.waitUntil` の順序付け |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Vercel Edge のリクエストスコープとバックグラウンドのクリーンアップ |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Deno Deploy のリクエストスコープと `info.waitUntil` によるクリーンアップ |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | カスタムファクトリーの差し替えを用いた Supabase Edge Functions |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

リポジトリのファイル: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

リポジトリのファイル: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

リポジトリのファイル: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

リポジトリのファイル: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

リポジトリのファイル: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

リポジトリのファイル: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

リポジトリのファイル: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
