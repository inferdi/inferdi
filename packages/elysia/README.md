# @inferdi/elysia

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

[![JSR](https://jsr.io/badges/@inferdi/elysia)](https://jsr.io/@inferdi/elysia)
[![npm version](https://img.shields.io/npm/v/@inferdi/elysia)](https://www.npmjs.com/package/@inferdi/elysia)
![License](https://img.shields.io/npm/l/@inferdi/elysia.svg)
[![Docs](https://img.shields.io/badge/docs-inferdi.com-5b5ff5)](https://inferdi.com/adapters/elysia)

Elysia request-scope plugin for [InferDI](https://github.com/inferdi/inferdi).
</div>

> **Part of the [InferDI](https://github.com/inferdi/inferdi) project** — a
> zero-dependency, decorator-free, strongly typed DI container for TypeScript.
> Core package: [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi)
> ([JSR](https://jsr.io/@inferdi/inferdi)).

This plugin wires InferDI into Elysia's lifecycle **without** adding
decorators, reflection, controller scanning, or handler parameter injection.
Your application still builds an explicit InferDI graph and resolves services
with `.get(key)` — the adapter only manages the per-request scope.

## Table of Contents

- [Install](#install)
- [Request Scope](#request-scope)
- [Options](#options)
- [Root-Only Mode](#root-only-mode)
- [Streaming](#streaming)
- [API](#api)
- [Related](#related)

## Install

For the full multilingual guide, adapter docs, API reference, and migration notes, see [inferdi.com](https://inferdi.com).

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
# or
deno add jsr:@inferdi/inferdi jsr:@inferdi/elysia npm:elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
```

## Request Scope

The plugin creates one InferDI scope per request, exposes it as `di` on Elysia
context, keeps it alive for user error handlers, and disposes it from
`onAfterResponse`.

> **Cleanup is lifecycle-bound.** Disposal runs from `onAfterResponse`. If the
> runtime never reaches that hook — a connection aborts before the response is
> produced, or the process exits mid-request — `dispose()` is not called. The
> per-request scope is tracked in a `WeakMap`, so the bookkeeping is collected
> once the `Request` is unreachable, but resources the scope holds (connections,
> handles) are released only when `dispose()` actually runs.

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
import { buildRootContainer } from './container.js'

const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    setupScope: (scope, { request }) => {
      const ctx = scope.get('request')
      ctx.requestId = crypto.randomUUID()
      ctx.userId = request.headers.get('x-user-id') ?? undefined
    },
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

For a custom context key, pass `key`:

```ts
const app = new Elysia()
  .use(inferdiElysia({ container: root, key: 'container' }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

The package does not globally augment Elysia context types. Routes must be
registered after `.use(inferdiElysia(...))` in the typed Elysia chain.

## Options

```ts
new Elysia().use(inferdiElysia({
  container: root,
  createScope: (root, context) => root.createScope(),
  setupScope: (scope, context) => {},
  setupValidatedScope: (scope, context) => {},
  disposeScope: (scope, context) => scope.dispose(),
  autoDispose: true,
  onDisposeError: (error, context) => {
    console.error('Failed to dispose request scope', error, context.phase)
  },
}))
```

| Option | Default | Description |
| --- | --- | --- |
| `container` | — | **Required.** The root container. Must structurally provide `createScope()`. |
| `key` | `'di'` | Elysia context key used in handlers. |
| `scopePerRequest` | `true` | Set to `false` for [root-only mode](#root-only-mode). |
| `createScope` | `root.createScope()` | Overrides how a request scope is created. May be async. |
| `setupScope` | — | Hydrates the scope before validation and before route handlers. May be async. |
| `setupValidatedScope` | — | Hydrates the scope after Elysia validation. May be async. |
| `disposeScope` | `scope.dispose()` | Overrides request-scope disposal. May be async. |
| `autoDispose` | `true` | Set to `false`, or return `false`, when application code owns disposal. |
| `onDisposeError` | `console.error` fallback | Optional sink for cleanup failures. Returning normally marks the error as handled. |

If `setupScope` fails after a scope has been created, the plugin disposes that
scope and rethrows **only** the original setup error. A disposal failure during
that teardown is routed to `onDisposeError`, or logged with `console.error` when
no handler is set — it is never aggregated into the rethrown setup error.

Use `setupScope` for values that must exist before validation or other early
hooks. Use `setupValidatedScope` for values derived from validated body, query,
params, headers, or cookies.

When a route, validation, or hook fails after a scope exists, the plugin records
the error and leaves `di` available to user `onError` handlers. Cleanup then
runs from `onAfterResponse`. Cleanup failures are not request errors, so the
plugin does not throw them from Elysia hooks. If `onDisposeError` is omitted,
unhandled cleanup failures are logged with `console.error`; pass
`onDisposeError` to route them into the application logger or telemetry.

## Root-Only Mode

Use `scopePerRequest: false` when the application does not use request-scoped
services. In this mode the plugin exposes the root container as `di` and
installs no request-scope lifecycle hooks, so scoped options are statically
rejected.

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

## Streaming

The plugin disposes the request scope from `onAfterResponse`, which Elysia runs
once the response is produced. For a user-created streaming `Response` or
`ReadableStream` that is **after the headers and first chunk are sent, not after
the stream drains**. Any route that keeps using scoped services past its
`return` — a `ReadableStream`, server-sent events, a WebSocket handoff, or
background work — must call `skipInferdiDispose(context)` first and dispose the
scope itself when that work ends; otherwise the scope is torn down mid-stream.

`skipInferdiDispose` only suppresses the successful cleanup path. If the request
fails, the recorded error still forces disposal, so a half-finished stream
releases its scope.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          for await (const event of events.subscribe()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            )
          }
        } finally {
          await scope.dispose()
        }
      },
    }),
    {
      headers: {
        'content-type': 'text/event-stream',
      },
    },
  )
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

export type InferdiElysiaContext<Scope, Key extends string = 'di'> = {
  [P in Key]: Scope
}

export type InferdiElysiaRootContext<Root, Key extends string = 'di'> = {
  [P in Key]: Root
}

export type InferdiElysiaScopedPlugin<
  Scope,
  Key extends string = 'di',
> = Elysia

export type InferdiElysiaRootPlugin<
  Root,
  Key extends string = 'di',
> = Elysia

export type InferdiElysiaRequestContext = Context<{
  body: unknown
  headers: Record<string, string | undefined>
  query: Record<string, string>
  params: Record<string, string | undefined>
  cookie: unknown
  response: unknown
}>

export type InferdiElysiaLifecycleContext<Scope, Key extends string = 'di'> = {
  request: Request
  phase: 'setup' | 'error' | 'afterResponse'
  error?: unknown
} & Partial<InferdiElysiaContext<Scope, Key>>

export type InferdiElysiaLifecyclePhase = 'setup' | 'error' | 'afterResponse'

export type InferdiElysiaValidatedContext<
  Scope,
  Key extends string = 'di',
> = InferdiElysiaRequestContext & InferdiElysiaContext<Scope, Key>

export type InferdiElysiaSkipContext = {
  request: Request
}

export type InferdiElysiaOptions<Root, Key, Scope> =
  | ScopedOptions<Root, Key, Scope>
  | RootOnlyOptions<Root, Key>

export function inferdiElysia(options: InferdiElysiaOptions): Elysia
export function skipInferdiDispose(context: { request: Request }): void
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

The project repository lives at [inferdi/inferdi](https://github.com/inferdi/inferdi). This adapter targets [Elysia](https://elysiajs.com).
