---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/workers-cli#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Руководство"
          "item": "https://inferdi.com/ru/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Примеры"
          "item": "https://inferdi.com/ru/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Боты, очереди и CLI"
          "item": "https://inferdi.com/ru/guide/examples/workers-cli"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/workers-cli#article"
      "headline": "Scope InferDI для ботов, очередей и CLI-команд"
      "name": "Боты, очереди и CLI"
      "description": "Создавайте один scope InferDI на обновление бота, задание в очереди или CLI-команду и владейте dispose через await using — на примере Telegraf, grammY и BullMQ."
      "url": "https://inferdi.com/ru/guide/examples/workers-cli"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/workers-cli"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Telegraf, grammY, BullMQ, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, боты, очереди, CLI, Telegraf, grammY, BullMQ, await using, внедрение зависимостей"
      "articleSection": "Примеры"
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

# Боты, очереди и CLI

Обновления ботов, задания в очередях и CLI-команды являются ограниченными асинхронными операциями. Примеры создают один scope на обновление, задание или команду и используют `await using`, когда функция владеет всей операцией.

Они используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Сравнивайте единицу работы, которую библиотека передаёт коду приложения.

| Пример | Что показывает |
| --- | --- |
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | scope на обновление в Telegraf |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | scope на обновление в Grammy |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | scope на задание в BullMQ |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | scope на команду в Commander |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | scope на команду в Yargs |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

Файл в репозитории: [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

Файл в репозитории: [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

Файл в репозитории: [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

Файл в репозитории: [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

Файл в репозитории: [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)
