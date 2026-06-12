# @inferdi/koa

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

[![JSR](https://jsr.io/badges/@inferdi/koa)](https://jsr.io/@inferdi/koa)
[![npm version](https://img.shields.io/npm/v/@inferdi/koa)](https://www.npmjs.com/package/@inferdi/koa)
![License](https://img.shields.io/npm/l/@inferdi/koa.svg)
[![Docs](https://img.shields.io/badge/docs-inferdi.com-5b5ff5)](https://inferdi.com/adapters/koa)

Koa request-scope middleware for [InferDI](https://github.com/inferdi/inferdi).
</div>

> **Part of the [InferDI](https://github.com/inferdi/inferdi) project** — a
> zero-dependency, decorator-free, strongly typed DI container for TypeScript.
> Core package: [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi)
> ([JSR](https://jsr.io/@inferdi/inferdi)).

This middleware wires InferDI into Koa v3 without decorators, reflection,
controller scanning, router patching, `app.context` mutation, or handler
parameter injection. Your application still builds an explicit InferDI graph and
resolves services with `.get(key)` — the adapter only manages the per-request
scope.

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
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
# or
deno add jsr:@inferdi/inferdi jsr:@inferdi/koa npm:koa
```

```ts
import Koa from 'koa'
import { inferdiKoa } from '@inferdi/koa'
```

Koa publishes JavaScript and keeps TypeScript declarations in `@types/koa`.
`@inferdi/koa` lists that package as an optional peer so TypeScript consumers
can keep Koa's own context types in their application dependency graph.

## Request Scope

The middleware creates one InferDI scope per request, exposes it as
`ctx.state.di`, and disposes it after the underlying Node response finishes or
the connection closes.

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
import { buildRootContainer } from './container.js'

const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    di: InferdiScopeOf<typeof root>
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  setupScope: (scope, ctx) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = ctx.get('x-user-id') || undefined
    request.ip = ctx.ip
  },
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

For a custom state key, pass `key` and publish that key in your Koa state type:

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import {
  inferdiKoa,
  type InferdiKoaState,
  type InferdiScopeOf,
} from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<InferdiScopeOf<typeof root>, 'container'>
type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({ container: root, key: 'container' }))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

The package does not globally augment Koa state with `any`, `unknown`, or a base
container. You own the concrete state type through declaration merging or local
Koa generics.

## Options

```ts
app.use(inferdiKoa({
  container: root,
  createScope: (root, ctx) => root.createScope(),
  setupScope: (scope, ctx) => {},
  disposeScope: (scope, ctx) => scope.dispose(),
  autoDispose: true,
  onDisposeError: (error, ctx) => {
    ctx.app.emit('error', error, ctx)
  },
}))
```

| Option | Default | Description |
| --- | --- | --- |
| `container` | — | **Required.** The root container. Must structurally provide `createScope()`. The root is never disposed by this middleware. |
| `key` | `'di'` | Koa `ctx.state` key used to expose the request scope. |
| `createScope` | `root.createScope()` | Overrides how a request scope is created. May be async. |
| `setupScope` | — | Hydrates the scope before it is exposed to downstream middleware. May be async. |
| `disposeScope` | `scope.dispose()` | Overrides request-scope disposal. May be async. |
| `autoDispose` | `true` | Set to `false`, or return `false`, when application code owns disposal. |
| `onDisposeError` | — | Optional sink for cleanup failures. Returning normally marks the cleanup error as handled. |

If `setupScope` fails after a scope has been created, the middleware disposes
that half-built scope before rethrowing **only** the original setup error. A
disposal failure during that teardown goes to `onDisposeError`, or is emitted
through `ctx.app.emit('error', ...)` when no handler is set — it is never
aggregated into the rethrown setup error.

Response-completion cleanup failures happen after Koa's `await next()` promise
chain. By default they are emitted through `ctx.app.emit('error', error, ctx)`
and swallowed so an already-completed response is not corrupted. If
`onDisposeError` throws or rejects, the adapter emits an `AggregateError`
containing both the original cleanup error and the handler error.

A downstream error always disposes the scope: `skipInferdiDispose` only
suppresses cleanup for a **successful** response, so a route that throws after
calling it still releases its scope.

## Streaming

Normal Koa stream bodies do not need a special skip. When `ctx.body` is a Node
stream, Koa pipes it through `ctx.res`, and this middleware waits for the
response `finish` or `close` event before disposing the scope.

Use `skipInferdiDispose(ctx)` only when application code intentionally keeps the
scope beyond the HTTP response boundary:

```ts
import { skipInferdiDispose } from '@inferdi/koa'

app.use(async (ctx) => {
  if (ctx.path !== '/background') return

  skipInferdiDispose(ctx)
  const scope = ctx.state.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  ctx.body = { status: 'queued' }
})
```

If an application sets `ctx.respond = false` and writes to `ctx.res` manually,
the adapter still relies on `finish` or `close`. If the response is never ended
or closed, no middleware can know when to dispose the request scope.

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

export type InferdiKoaState<
  Scope extends InferdiScope,
  Key extends string = 'di',
> = { [P in Key]: Scope }

export type InferdiKoaContext<StateT, ContextT, Scope, Key> =
  ParameterizedContext<StateT & InferdiKoaState<Scope, Key>, ContextT>

export interface InferdiKoaOptions<Root, StateT, ContextT, Key, Scope> {
  /* ... */
}

export function inferdiKoa(options: InferdiKoaOptions): Middleware
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

The project repository lives at [inferdi/inferdi](https://github.com/inferdi/inferdi). This adapter targets [Koa](https://koajs.com) v3.
