---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/backend#breadcrumb"
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
          "name": "Бэкенд-фреймворки"
          "item": "https://inferdi.com/ru/guide/examples/backend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/backend#article"
      "headline": "Scope запроса InferDI в бэкенд-фреймворках"
      "name": "Бэкенд-фреймворки"
      "description": "Постройте корневой контейнер один раз, создавайте один scope на каждый HTTP-запрос, выставляйте его через нативный объект request фреймворка и очищайте в жизненном цикле ответа — сравнение для Fastify, Hono, Koa, Express и Elysia."
      "url": "https://inferdi.com/ru/guide/examples/backend"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/backend"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify, Hono, Koa, Express, Elysia, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, бэкенд, scope запроса, Fastify, Hono, Koa, Express, Elysia, внедрение зависимостей"
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

# Бэкенд-фреймворки

Каждый бэкенд-пример один раз строит корневой контейнер, создаёт scope на каждый HTTP-запрос, выставляет его через объект request/context фреймворка и очищает в жизненном цикле ответа.

Все они используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts), поэтому ниже отличаются только hooks жизненного цикла фреймворка и API адаптера.

| Пример | Адаптер |
| --- | --- |
| [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) | [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) |
| [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts) | [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) |
| [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts) | [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) |
| [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) | [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) |
| [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts) | [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) |

## Fastify

<<< ../../../../../../examples/backend/fastify.ts

Файл в репозитории: [`examples/backend/fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts)

## Hono

<<< ../../../../../../examples/backend/hono.ts

Файл в репозитории: [`examples/backend/hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)

## Koa

<<< ../../../../../../examples/backend/koa.ts

Файл в репозитории: [`examples/backend/koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)

## Express

<<< ../../../../../../examples/backend/express.ts

Файл в репозитории: [`examples/backend/express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts)

## Elysia

<<< ../../../../../../examples/backend/elysia.ts

Файл в репозитории: [`examples/backend/elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)
