---
layout: home
description: "DI-контейнер без runtime-зависимостей и декораторов: TypeScript проверяет граф, время жизни и границы скоупов."

hero:
  name: InferDI
  text: Типизированный DI для современного TypeScript
  tagline: Явно регистрируйте сервисы, проверяйте граф зависимостей через TypeScript и сохраняйте короткий путь resolve.
  image:
    src: /logo.png
    alt: InferDI
  actions:
    - theme: brand
      text: Быстрый старт
      link: /ru/guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/inferdi/inferdi

features:
  - icon:
      src: /fastify.png
      alt: Fastify
    title: Fastify
    details: >-
      Fastify выбирают за скорость и строгие схемы, DI не должен ломать этот профиль. Адаптер для Fastify v5 встраивается в плагины и хуки, создаёт типизированный scope в `onRequest` и освобождает его в `onResponse`.
    link: /ru/adapters/fastify
    linkText: Адаптер Fastify
  - icon:
      src: /hono.png
      alt: Hono
    title: Hono
    details: >-
      Edge-приложениям нужна тонкая обвязка и быстрый старт. Адаптер для Hono v4 кладёт scope запроса в переменные контекста, хорошо ложится на Cloudflare Workers и Bun и сохраняет строгие типы прямо на границе сети.
    link: /ru/adapters/hono
    linkText: Адаптер Hono
  - icon:
      src: /koa.png
      alt: Koa
    title: Koa
    details: >-
      Koa силён своей тонкой middleware-цепочкой на async-функциях. Адаптер для Koa v3 связывает контекст запроса с вашими сервисами через типизированный scope, не пряча управление асинхронным потоком.
    link: /ru/adapters/koa
    linkText: Адаптер Koa
  - icon:
      src: /express.png
      alt: Express
    title: Express
    details: >-
      Express 5 остаётся рабочей классикой Node.js. Адаптер добавляет в привычные middleware и роуты типизированный scope запроса, чтобы сервисы не расползались по глобалам, самописным фабрикам и случайным импортам.
    link: /ru/adapters/express
    linkText: Адаптер Express
  - icon:
      src: /elysia.png
      alt: Elysia
    title: Elysia
    details: >-
      Elysia v1 уже даёт Bun-приложениям строгие типы маршрутов. Адаптер переносит эту типизацию в сервисный слой: каждый запрос получает DI scope, а автодополнение ведёт от обработчика к бизнес-логике.
    link: /ru/adapters/elysia
    linkText: Адаптер Elysia
  - icon:
      src: /puzzle.png
      alt: Ядро без привязки к фреймворку
    title: Ядро без привязки к фреймворку
    details: "У InferDI нет runtime-зависимостей. Ядро работает в Node, Bun, Deno, браузерах и воркерах; адаптеры добавляют lifecycle для request scope."
    link: /ru/adapters/
    linkText: Как работают адаптеры
---
