# Бэкенд-фреймворки

Каждый серверный пример один раз собирает корневой контейнер и создаёт отдельный скоуп на HTTP-запрос. Скоуп доступен через объект запроса или контекста фреймворка; его ресурсы освобождаются при завершении ответа.

Все они используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts), поэтому ниже отличаются только хуки жизненного цикла фреймворка и API адаптера.

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
