---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/workers-cli#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guía"
          "item": "https://inferdi.com/es/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Ejemplos"
          "item": "https://inferdi.com/es/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Bots, colas y CLI"
          "item": "https://inferdi.com/es/guide/examples/workers-cli"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/workers-cli#article"
      "headline": "Scopes de InferDI para bots, colas y comandos de CLI"
      "name": "Bots, colas y CLI"
      "description": "Crea un scope de InferDI por cada actualización de bot, trabajo en cola o comando de CLI y hazte dueño de la liberación con await using — comparado entre Telegraf, grammY y BullMQ."
      "url": "https://inferdi.com/es/guide/examples/workers-cli"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/workers-cli"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Telegraf, grammY, BullMQ, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, bots, colas, CLI, Telegraf, grammY, BullMQ, await using, inyección de dependencias"
      "articleSection": "Ejemplos"
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

# Bots, colas y CLI

Las actualizaciones de bots, los trabajos en cola y los comandos de CLI son operaciones asíncronas acotadas. Los ejemplos crean un scope por cada actualización, trabajo o comando y usan `await using` cuando la función es dueña de toda la operación.

Comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compara la unidad de trabajo que cada biblioteca entrega al código de la aplicación.

| Ejemplo | Muestra |
| --- | --- |
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | Scope de actualización de Telegraf |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | Scope de actualización de Grammy |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | Scope de trabajo de BullMQ |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | Scope de comando de Commander |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | Scope de comando de Yargs |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

Archivo del repositorio: [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

Archivo del repositorio: [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

Archivo del repositorio: [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

Archivo del repositorio: [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

Archivo del repositorio: [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)
