---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/workers-cli#breadcrumb"
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
          "name": "ボット、キュー、CLI"
          "item": "https://inferdi.com/ja/guide/examples/workers-cli"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/workers-cli#article"
      "headline": "ボット、キュー、CLI コマンドのための InferDI スコープ"
      "name": "ボット、キュー、CLI"
      "description": "ボットの更新、キューのジョブ、CLI コマンドごとに 1 つの InferDI スコープを作成し、await using で破棄を管理します。Telegraf、grammY、BullMQ で比較します。"
      "url": "https://inferdi.com/ja/guide/examples/workers-cli"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/workers-cli"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Telegraf, grammY, BullMQ, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, ボット, キュー, CLI, Telegraf, grammY, BullMQ, await using, 依存性注入"
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

# ボット、キュー、CLI

ボットの更新、キューのジョブ、CLI コマンドは、境界が明確な非同期処理です。これらの例では、更新、ジョブ、コマンドごとに 1 つのスコープを作成し、関数が処理全体を所有する場合は `await using` を使用します。

これらは [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。各ライブラリがアプリケーションコードに渡す作業単位を比較してください。

| 例 | 内容 |
| --- | --- |
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | Telegraf の更新スコープ |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | Grammy の更新スコープ |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | BullMQ のジョブスコープ |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | Commander のコマンドスコープ |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | Yargs のコマンドスコープ |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

リポジトリのファイル: [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

リポジトリのファイル: [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

リポジトリのファイル: [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

リポジトリのファイル: [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

リポジトリのファイル: [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)
