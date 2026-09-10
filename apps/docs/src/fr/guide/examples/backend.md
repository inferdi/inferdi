# Frameworks backend

Chaque exemple construit une seule fois la racine, crée un scope par requête HTTP et l’expose via l’objet de requête natif du framework. La libération suit le cycle de vie de la réponse.

Tous utilisent le même graphe. Les différences concernent les hooks de cycle de vie et les API des adaptateurs. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Exemple | Adaptateur |
|---|---|
| [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) | [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) |
| [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)       | [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)       |
| [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)         | [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)         |
| [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) | [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) |
| [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)   | [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)   |

## Fastify

<<< ../../../../../../examples/backend/fastify.ts

Fichier du dépôt : [`examples/backend/fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts)

## Hono

<<< ../../../../../../examples/backend/hono.ts

Fichier du dépôt : [`examples/backend/hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts)

## Koa

<<< ../../../../../../examples/backend/koa.ts

Fichier du dépôt : [`examples/backend/koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts)

## Express

<<< ../../../../../../examples/backend/express.ts

Fichier du dépôt : [`examples/backend/express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts)

## Elysia

<<< ../../../../../../examples/backend/elysia.ts

Fichier du dépôt : [`examples/backend/elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts)

