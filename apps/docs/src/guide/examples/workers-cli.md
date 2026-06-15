---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/workers-cli#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guide"
          "item": "https://inferdi.com/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Examples"
          "item": "https://inferdi.com/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Bots, Queues, and CLI"
          "item": "https://inferdi.com/guide/examples/workers-cli"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/workers-cli#article"
      "headline": "InferDI scopes for bots, queues, and CLI commands"
      "name": "Bots, Queues, and CLI"
      "description": "Create one InferDI scope per bot update, queue job, or CLI command and own disposal with await using — compared across Telegraf, grammY, and BullMQ."
      "url": "https://inferdi.com/guide/examples/workers-cli"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/workers-cli"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Telegraf, grammY, BullMQ, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, bots, queues, CLI, Telegraf, grammY, BullMQ, await using, dependency injection"
      "articleSection": "Examples"
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

# Bots, Queues, and CLI

Bot updates, queue jobs, and CLI commands are bounded async operations. The examples create one scope per update, job, or command and use `await using` where the function owns the whole operation.

They share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compare the unit of work that each library hands to application code.

| Example | Shows |
| --- | --- |
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | Telegraf update scope |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | Grammy update scope |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | BullMQ job scope |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | Commander command scope |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | Yargs command scope |

## Telegraf

<<< ../../../../../examples/workers-cli/telegraf.ts

Repository file: [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../examples/workers-cli/grammy.ts

Repository file: [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../examples/workers-cli/bullmq.ts

Repository file: [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../examples/workers-cli/commander.ts

Repository file: [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../examples/workers-cli/yargs.ts

Repository file: [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)
