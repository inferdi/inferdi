---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/installation#breadcrumb"
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
          "name": "Установка"
          "item": "https://inferdi.com/ru/guide/installation"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/installation#article"
      "headline": "Установка InferDI из npm или JSR"
      "name": "Установка"
      "description": "Установка @inferdi/inferdi и его адаптеров для фреймворков из npm или JSR в Node.js, Bun и Deno. Совпадающие имена пакетов и версии, ноль рантайм-зависимостей, без шага сборки и без reflect-metadata."
      "url": "https://inferdi.com/ru/guide/installation"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/installation"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16, Bun, Deno"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, установка, npm, JSR, Node.js, Bun, Deno, внедрение зависимостей в TypeScript"
      "articleSection": "Руководство"
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

# Установка

InferDI публикуется в npm и JSR с одинаковыми именами пакетов и версиями. Для Node и Bun используйте npm-совместимую установку, для Deno и сред, которым удобнее исходники TypeScript, используйте JSR.

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

Можно импортировать напрямую:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Требования

| Среда | Требование |
| --- | --- |
| Node.js | 16 или новее для основного пакета |
| Bun | 1.0 или новее |
| Deno | 1.40 или новее |
| TypeScript | 5.6 или новее |

На версиях Node без нативных `Symbol.dispose` и `Symbol.asyncDispose` InferDI при импорте устанавливает полифил символов, чтобы `using` и `await using` продолжали работать.

Опубликованные декларации сами подключают библиотеку типов для Explicit Resource Management. Если проект нацелен на ES2022, добавлять `ESNext.Disposable` в настройку TypeScript `lib` не нужно.

## Установка адаптеров

Установите основной пакет, пакет адаптера и peer-зависимость фреймворка:

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

У каждого адаптера есть отдельная страница с правилами жизненного цикла и настройкой типов.
