---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/runtimes-edge#breadcrumb"
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
          "name": "Рантаймы и edge-платформы"
          "item": "https://inferdi.com/ru/guide/examples/runtimes-edge"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/runtimes-edge#article"
      "headline": "InferDI на Node, Bun, Deno и edge-рантаймах"
      "name": "Рантаймы и edge-платформы"
      "description": "Корневой контейнер на уровне модуля и один scope на запрос в низкоуровневом Node HTTP, Bun serve, Deno HTTP и edge-функциях — с await using для ограниченных обработчиков и явным dispose для стриминга или фоновой работы."
      "url": "https://inferdi.com/ru/guide/examples/runtimes-edge"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/runtimes-edge"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Node.js, Bun, Deno, Supabase Edge Functions, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, рантаймы, edge, Node HTTP, Bun, Deno, Supabase Edge Functions, await using, scope запроса"
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

# Рантаймы и edge-платформы

Примеры для рантаймов держат корневой контейнер на уровне модуля и создают один scope на запрос. Ограниченные по времени обработчики могут использовать `await using`; стриминг и фоновая работа должны очищать scope после своего завершения.

Большинство примеров используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Supabase Edge Functions делает локальную замену фабрики, но сохраняет ту же дисциплину scope на запрос.

| Пример | Что показывает |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | низкоуровневый жизненный цикл Node HTTP с очисткой после ответа |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | scope на запрос в Bun `serve` |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | scope на запрос в Deno HTTP |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | scope на запрос в Cloudflare Workers и порядок `ctx.waitUntil` |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | scope на запрос в Vercel Edge и фоновая очистка |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | scope на запрос в Deno Deploy и очистка через `info.waitUntil` |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions с локальной заменой фабрики |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

Файл в репозитории: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun `serve`

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

Файл в репозитории: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

Файл в репозитории: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

Файл в репозитории: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

Файл в репозитории: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

Файл в репозитории: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Файл в репозитории: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
