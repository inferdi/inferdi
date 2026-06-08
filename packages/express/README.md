# @inferdi/express

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

[![JSR](https://jsr.io/badges/@inferdi/express)](https://jsr.io/@inferdi/express)
[![npm version](https://img.shields.io/npm/v/@inferdi/express)](https://www.npmjs.com/package/@inferdi/express)
![License](https://img.shields.io/npm/l/@inferdi/express.svg)

Express request-scope middleware for [InferDI](https://github.com/inferdi/inferdi).
</div>

> **Part of the [InferDI](https://github.com/inferdi/inferdi) project** — a
> zero-dependency, decorator-free, strongly typed DI container for TypeScript.
> Core package: [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi)
> ([JSR](https://jsr.io/@inferdi/inferdi)).

This middleware wires InferDI into Express 5 without decorators, reflection,
controller scanning, router patching, `AsyncLocalStorage`, or handler parameter
injection. Your application still builds an explicit InferDI graph and resolves
services with `.get(key)` — the adapter only manages the per-request scope.

## Table of Contents

- [Install](#install)
- [Request Scope](#request-scope)
- [Options](#options)
- [Streaming](#streaming)
- [API](#api)
- [Related](#related)

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
# or
deno add jsr:@inferdi/inferdi jsr:@inferdi/express npm:express
```

```ts
import express from 'express'
import { inferdiExpress } from '@inferdi/express'
```

Express publishes JavaScript and keeps TypeScript declarations in
`@types/express`. `@inferdi/express` lists that package as an optional peer so
TypeScript consumers can keep Express request and response types in their
application dependency graph.

## Request Scope

The middleware creates one InferDI scope per request, exposes it as `req.di`,
and disposes it after the underlying Node response finishes or the connection
closes.

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
import { buildRootContainer } from './container.js'

const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  setupScope: (scope, req) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = req.get('x-user-id') || undefined
    request.ip = req.ip
  },
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

The package does not globally augment `Express.Request` with `any`, `unknown`,
or a base container. You own the concrete request type through declaration
merging.

Install body parsers, cookie/session middleware, auth, Helmet, CORS, and
validation before or after `inferdiExpress(...)` according to what your
`setupScope` hook needs. The adapter passes `req` and `res` to your hooks but
does not read or trust request data itself.

## Options

```ts
app.use(inferdiExpress({
  container: root,
  createScope: (root, req, res) => root.createScope(),
  setupScope: (scope, req, res) => {},
  disposeScope: (scope, req, res) => scope.dispose(),
  autoDispose: true,
  onDisposeError: (error, req, res) => {
    logger.error({ err: error, path: req.path }, 'DI cleanup failed')
  },
}))
```

| Option | Default | Description |
| --- | --- | --- |
| `container` | — | **Required.** The root container. Must structurally provide `createScope()`. The root is never disposed by this middleware. |
| `createScope` | `root.createScope()` | Overrides how a request scope is created. May be async. |
| `setupScope` | — | Hydrates the scope before it is exposed to route handlers. May be async. |
| `disposeScope` | `scope.dispose()` | Overrides request-scope disposal. May be async. |
| `autoDispose` | `true` | Set to `false`, or return `false`, when application code owns disposal. |
| `onDisposeError` | — | Optional per-error sink for cleanup failures — during setup teardown and after response completion alike. Returning normally marks the error handled. |

If `setupScope` fails after a scope has been created, the middleware disposes
that half-built scope before calling `next(error)`. **Only** the original setup
error is passed to `next`; a disposal failure during that teardown is routed to
`onDisposeError`, or logged with `console.error` when no handler is set — it is
never aggregated into the error passed to `next`.

Response-completion cleanup failures happen after Express has already sent or
closed the response. By default they are logged with `console.error` and
swallowed. If `onDisposeError` throws or rejects, the adapter logs an
`AggregateError` containing both the original cleanup error and the handler
error.

### `skipInferdiDispose` and failed requests

The other InferDI adapters force-dispose a scope when the request fails, so
`skipInferdiDispose` suppresses cleanup only for a successful response. Express
**cannot** match that on a handled route error. Its middleware is callback-style:
`next()` returns no downstream-completion promise, so the middleware never
observes a route exception, and cleanup runs from the Node response
`finish`/`close` event, where a handled error (the error handler produced a
response) is indistinguishable from a normal one. As a result, if a route calls
`skipInferdiDispose(req)` and then fails, the scope is **not** auto-disposed —
application code owns it. Only an already-destroyed connection at activation time
bypasses the skip. Dispose such scopes from your own error path, or avoid
combining `skipInferdiDispose` with routes that may throw.

## Streaming

Normal Express stream responses do not need a special skip. The middleware waits
for the underlying Node response `finish` or `close` event before disposing the
scope.

Use `skipInferdiDispose(req)` when application code intentionally keeps the
scope beyond the HTTP response boundary:

```ts
import { skipInferdiDispose } from '@inferdi/express'

app.get('/background', (req, res) => {
  skipInferdiDispose(req)
  const scope = req.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  res.status(202).json({ status: 'queued' })
})
```

For Server-Sent Events, WebSocket handoff, or background work, call
`skipInferdiDispose(req)` before returning control to Express, then dispose the
scope from the application-owned terminal path.

## API

```ts
export type MaybePromise<T> = T | Promise<T>

export interface InferdiScope {
  dispose(): MaybePromise<void>
}

export interface InferdiRoot<Scope extends InferdiScope = InferdiScope> {
  createScope(): Scope
}

export type InferdiScopeOf<Root extends InferdiRoot> =
  ReturnType<Root['createScope']>

export interface InferdiExpressOptions<Root, Scope> {
  /* ... */
}

export function inferdiExpress(options: InferdiExpressOptions): RequestHandler
export function skipInferdiDispose(req: Request): void
```

## Related

| Package | JSR | npm | Description |
| --- | --- | --- | --- |
| [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) | [JSR](https://jsr.io/@inferdi/inferdi) | [npm](https://www.npmjs.com/package/@inferdi/inferdi) | Core DI container — zero-dependency, decorator-free, strongly typed |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | [JSR](https://jsr.io/@inferdi/fastify) | [npm](https://www.npmjs.com/package/@inferdi/fastify) | Fastify v5 request-scope adapter |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | [JSR](https://jsr.io/@inferdi/hono) | [npm](https://www.npmjs.com/package/@inferdi/hono) | Hono request-scope middleware |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | [JSR](https://jsr.io/@inferdi/koa) | [npm](https://www.npmjs.com/package/@inferdi/koa) | Koa v3 request-scope middleware |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | [JSR](https://jsr.io/@inferdi/express) | [npm](https://www.npmjs.com/package/@inferdi/express) | Express 5 request-scope middleware |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | [JSR](https://jsr.io/@inferdi/elysia) | [npm](https://www.npmjs.com/package/@inferdi/elysia) | Elysia request-scope plugin |

The project repository lives at [inferdi/inferdi](https://github.com/inferdi/inferdi). This adapter targets [Express](https://expressjs.com) 5.
