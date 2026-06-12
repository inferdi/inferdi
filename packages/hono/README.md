# @inferdi/hono

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

[![JSR](https://jsr.io/badges/@inferdi/hono)](https://jsr.io/@inferdi/hono)
[![npm version](https://img.shields.io/npm/v/@inferdi/hono)](https://www.npmjs.com/package/@inferdi/hono)
![License](https://img.shields.io/npm/l/@inferdi/hono.svg)
[![Docs](https://img.shields.io/badge/docs-inferdi.com-5b5ff5)](https://inferdi.com/adapters/hono)

Hono request-scope middleware for [InferDI](https://github.com/inferdi/inferdi).
</div>

> **Part of the [InferDI](https://github.com/inferdi/inferdi) project** — a
> zero-dependency, decorator-free, strongly typed DI container for TypeScript.
> Core package: [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi)
> ([JSR](https://jsr.io/@inferdi/inferdi)).

This middleware wires InferDI into Hono's request pipeline **without** adding
decorators, reflection, controller scanning, or handler parameter injection.
Your application still builds an explicit InferDI graph and resolves services
with `.get(key)` — the adapter only manages the per-request scope.

## Table of Contents

- [Install](#install)
- [Request Scope](#request-scope)
- [Options](#options)
- [Streaming](#streaming)
- [API](#api)
- [Related](#related)

## Install

For the full multilingual guide, adapter docs, API reference, and migration notes, see [inferdi.com](https://inferdi.com).

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
# or
deno add jsr:@inferdi/inferdi jsr:@inferdi/hono npm:hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono } from '@inferdi/hono'
```

## Request Scope

The middleware creates one InferDI scope per request, exposes it as `c.var.di`,
and disposes it after Hono's bounded route pipeline completes.

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
import { buildRootContainer } from './container.js'

const root = buildRootContainer()
type AppEnv = InferdiHonoEnv<typeof root>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  setupScope: (scope, c) => {
    const ctx = scope.get('request')
    ctx.requestId = crypto.randomUUID()
    ctx.userId = c.req.header('x-user-id')
  },
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` is equivalent to `c.var.di` and remains fully typed. For a custom
context variable key, pass `key` and include it in the app Env:

```ts
type AppEnv = InferdiHonoEnv<typeof root, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({ container: root, key: 'container' }))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

The package does not globally augment Hono's `ContextVariableMap`; this keeps
missing middleware visible to TypeScript.

## Options

```ts
app.use('*', inferdiHono({
  container: root,
  createScope: (root, c) => root.createScope(),
  setupScope: (scope, c) => {},
  disposeScope: (scope, c) => scope.dispose(),
  autoDispose: true,
  onDisposeError: (error, c) => {
    console.error('Failed to dispose request scope', error)
  },
}))
```

| Option | Default | Description |
| --- | --- | --- |
| `container` | — | **Required.** The root container. Must structurally provide `createScope()`. The root is never disposed by this middleware. |
| `key` | `'di'` | Hono context variable key used with `c.var[key]` / `c.get(key)`. |
| `createScope` | `root.createScope()` | Overrides how a request scope is created. May be async. |
| `setupScope` | — | Hydrates the scope before it is exposed to route handlers. May be async. |
| `disposeScope` | `scope.dispose()` | Overrides request-scope disposal. May be async. |
| `autoDispose` | `true` | Set to `false`, or return `false`, when application code owns disposal. |
| `onDisposeError` | `console.error(...)` | Optional sink for post-response disposal failures. Returning normally marks the error handled; omitted failures are logged. |

If `setupScope` fails after a scope has been created, the middleware disposes
that scope and rethrows **only** the original setup error (the response has not
been produced yet, so Hono routes it to `onError`). A disposal failure during
that teardown is routed to `onDisposeError`, or logged via `console.error` when
no handler is set — it is never aggregated into the rethrown error.

After `next()`, the response has already been produced. A `disposeScope` or
`autoDispose` failure at that point is logged via `console.error` (or routed to
`onDisposeError`) and **never replaces the response** — it cannot turn a
successful response into an error one. A route error from the handler still flows
through Hono's normal `onError` handling, and it always disposes the scope:
`skipInferdiDispose` only suppresses cleanup for a **successful** response.

## Streaming

Hono `stream(...)`, `streamText(...)`, and `streamSSE(...)` can return a
`Response` before the stream callback finishes. In those routes, call
`skipInferdiDispose(c)` and dispose the scope when stream work ends.

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

On Cloudflare Workers, cleanup can be scheduled through the execution context:

```ts
app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di

  return stream(c, async (s) => {
    try {
      await s.write('data: ready\n\n')
    } finally {
      c.executionCtx.waitUntil(Promise.resolve(scope.dispose()))
    }
  })
})
```

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

export type InferdiHonoScopeEnv<Scope, Key extends string = 'di'> = {
  Variables: { [P in Key]: Scope }
}

export type InferdiHonoEnv<Root, Key extends string = 'di'> =
  InferdiHonoScopeEnv<InferdiScopeOf<Root>, Key>

export interface InferdiHonoOptions<Root, E, Key, Scope> { /* ... */ }

export function inferdiHono(options: InferdiHonoOptions): MiddlewareHandler
export function skipInferdiDispose(context: Context): void
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

The project repository lives at [inferdi/inferdi](https://github.com/inferdi/inferdi). This adapter targets [Hono](https://hono.dev).
