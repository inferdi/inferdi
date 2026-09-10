# Backend-Frameworks

Jedes Beispiel baut den Root-Container einmal auf, erstellt einen Scope je HTTP-Anfrage und stellt ihn über das native Request-Objekt bereit. Die Freigabe folgt dem Lebenszyklus der Antwort.

Alle verwenden denselben Graphen. Die Unterschiede liegen in den Lebenszyklushooks und Adapter-APIs. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Beispiel | Adapter |
|---|---|
| [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) | [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) |
| [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)       | [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)       |
| [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)         | [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)         |
| [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) | [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) |
| [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)   | [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)   |

## Fastify

<<< ../../../../../../examples/backend/fastify.ts

Datei im Repository: [`examples/backend/fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts)

## Hono

<<< ../../../../../../examples/backend/hono.ts

Datei im Repository: [`examples/backend/hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)

## Koa

<<< ../../../../../../examples/backend/koa.ts

Datei im Repository: [`examples/backend/koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)

## Express

<<< ../../../../../../examples/backend/express.ts

Datei im Repository: [`examples/backend/express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts)

## Elysia

<<< ../../../../../../examples/backend/elysia.ts

Datei im Repository: [`examples/backend/elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)

