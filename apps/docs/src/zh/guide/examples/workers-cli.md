---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples/workers-cli#breadcrumb"
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
          "name": "机器人、队列与 CLI"
          "item": "https://inferdi.com/zh/guide/examples/workers-cli"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples/workers-cli#article"
      "headline": "用于机器人、队列和 CLI 命令的 InferDI 作用域"
      "name": "机器人、队列与 CLI"
      "description": "为每个机器人更新、队列任务或 CLI 命令创建一个 InferDI 作用域，并使用 await using 负责释放 —— 在 Telegraf、grammY 和 BullMQ 之间进行对比。"
      "url": "https://inferdi.com/zh/guide/examples/workers-cli"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples/workers-cli"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Telegraf, grammY, BullMQ, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 机器人, 队列, CLI, Telegraf, grammY, BullMQ, await using, 依赖注入"
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

# 机器人、队列与 CLI

机器人更新、队列任务和 CLI 命令都是有界限的异步操作。这些示例为每个更新、任务或命令创建一个作用域，并在函数拥有整个操作时使用 `await using`。

它们共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。请对比每个库交给应用代码的工作单元。

| 示例 | 展示内容 |
| --- | --- |
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | Telegraf 更新作用域 |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | Grammy 更新作用域 |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | BullMQ 任务作用域 |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | Commander 命令作用域 |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | Yargs 命令作用域 |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

仓库文件：[`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

仓库文件：[`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

仓库文件：[`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

仓库文件：[`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

仓库文件：[`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)
