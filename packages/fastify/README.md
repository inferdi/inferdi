# @inferdi/fastify

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

[![JSR](https://jsr.io/badges/@inferdi/fastify)](https://jsr.io/@inferdi/fastify)
[![npm version](https://img.shields.io/npm/v/@inferdi/fastify)](https://www.npmjs.com/package/@inferdi/fastify)
![License](https://img.shields.io/npm/l/@inferdi/fastify.svg)

Fastify v5 request-scope adapter for [InferDI](https://github.com/inferdi/inferdi).
</div>

> **Part of the [InferDI](https://github.com/inferdi/inferdi) project** — a
> zero-dependency, decorator-free, strongly typed DI container for TypeScript.
> Core package: [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi)
> ([JSR](https://jsr.io/@inferdi/inferdi)).

This plugin wires InferDI into Fastify's lifecycle **without** adding decorators,
reflection, controller scanning, or handler parameter injection. Your
application still builds an explicit InferDI graph and resolves services with
`.get(key)` — the adapter only manages the per-request scope.

## Table of Contents

- [Install](#install)
- [Request Scope](#request-scope)
- [Options](#options)
- [Root-Only Mode](#root-only-mode)
- [Lifecycle](#lifecycle)
- [API](#api)
- [Related](#related)

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
# or
deno add jsr:@inferdi/inferdi jsr:@inferdi/fastify npm:fastify
```

```ts
import Fastify from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
```

## Request Scope

By default the plugin creates one InferDI scope per request, exposes it as
`request.di`, and disposes it in Fastify's `onResponse` hook after the response
has been sent. The root container is always exposed as `app.di`.

Publish your own concrete container types via module augmentation — the plugin
keeps its published types structural and never declares `di` globally as `any`.

```ts
import Fastify from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
import { buildRootContainer } from './container.js'

const root = buildRootContainer()
const app = Fastify()

type RootContainer = typeof root
type RequestContainer = ReturnType<RootContainer['createScope']>

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

await app.register(inferdiFastify, {
  container: root,
  // Annotate hook params explicitly — see the note below.
  setupScope: (scope: RequestContainer, request) => {
    const ctx = scope.get('request')
    ctx.requestId = request.id
    ctx.ip = request.ip
  },
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

> **Type inference through `app.register`.** Fastify consumes the plugin through
> `app.register`, whose own generics collapse the plugin's type parameters before
> the options object is checked. As a result the scope parameter of an inline
> hook (`setupScope`, `disposeScope`, `createScope`, …) is **not** inferred — annotate
> it explicitly (`(scope: InferdiScopeOf<typeof root>) => …`, or `RequestContainer`
> as above). Route handlers reading `request.di` are unaffected: their type comes
> from the `FastifyRequest` augmentation, not from inference.

`setupScope` runs in `onRequest`, before Fastify parses the request body. Use it
for headers, request ids, IP addresses, raw request metadata, and auth data from
earlier plugins. If a route needs parsed body data in the scope, add a later
application hook and write to `request.di` there.

## Options

```ts
await app.register(inferdiFastify, {
  container: root,
  createScope: (root, request, reply) => root.createScope(),
  setupScope: (scope, request, reply) => {},
  disposeScope: (scope, request, reply) => scope.dispose(),
  autoDispose: true,
  disposeRootOnClose: true,
  onDisposeError: (error, request, reply) => {
    request.log.error({ err: error }, 'Failed to dispose request scope')
  },
})
```

| Option | Default | Description |
| --- | --- | --- |
| `container` | — | **Required.** The root container. Must structurally provide `createScope()`; a `dispose()` is required only when `disposeRootOnClose: true`. Exposed as `app.di`. |
| `scopePerRequest` | `true` | Set to `false` for [root-only mode](#root-only-mode). |
| `createScope` | `root.createScope()` | Overrides how a per-request scope is created. May be async. |
| `setupScope` | — | Hydrates the scope before it is assigned to `request.di`. Runs in `onRequest`. May be async. |
| `disposeScope` | `scope.dispose()` | Overrides request-scope disposal. May be sync or async. |
| `autoDispose` | `true` | Set to `false`, or return `false` from a predicate, when application code owns disposal. |
| `disposeRootOnClose` | `false` | Dispose the root container on `fastify.close()`. Set it when the Fastify instance owns the root container's lifetime. Requires a disposable root: the type narrows to `false` when `container` has no `dispose()`. |
| `onDisposeError` | `request.log.error(...)` | Optional sink for **request-scope** disposal failures. Returning normally marks the error handled; otherwise it is logged. Disposal runs in `onResponse` (the response is already sent), so a failure here is never surfaced to the client. |

`InferdiScope.dispose()` may be synchronous or asynchronous — a sync `dispose()`
resolves the response in the same tick without scheduling a microtask.

The cleanup hooks (`disposeScope`, `autoDispose`, `onDisposeError`) observe the
scope on `request.di`, the same handle route handlers read — it stays assigned
while they run and is cleared only once cleanup finishes. This holds on the
setup-failure path too: setup-failure cleanup hooks see `request.di`, but it is
cleared before Fastify's error handler runs, so error handlers never observe a
half-built or disposed scope.

If `setupScope` fails after a scope has been created, the plugin disposes that
scope and rethrows the **original** setup error through Fastify's normal hook
error path; a disposal failure during that teardown is sent to `onDisposeError` /
`request.log.error`, never aggregated into the thrown error.

A route that keeps using the scope past the response (background work, a handed-off
stream) can call `skipInferdiDispose(request)` to take over disposal; the plugin
then leaves that one request's scope alone. The skip suppresses cleanup only for
a **successful** response: if the request fails through Fastify's error path, the
scope is disposed regardless of the marker.

If the client aborts before the response is sent, Fastify never runs `onResponse`,
so the scope is released in `onRequestAbort` instead. Once the scope has been
exposed on `request.di`, abort cleanup uses the same `autoDispose`,
`disposeScope`, and `onDisposeError` contract as `onResponse`; the adapter keeps
the Fastify `reply` object from setup time for those hooks. `skipInferdiDispose`
and an explicit `autoDispose: false` keep their manual-ownership meaning after
the scope has been exposed. If abort happens while async `createScope` /
`setupScope` is still in flight, the scope is never exposed to application code,
so the adapter disposes it itself through `disposeScope` / `onDisposeError`.

## Root-Only Mode

Use `scopePerRequest: false` when the application does not use request-scoped
services. In this mode the plugin only decorates the Fastify instance as
`app.di` — it does **not** decorate requests or install request lifecycle hooks,
so the per-request options (`createScope`, `setupScope`, `disposeScope`,
`autoDispose`, `onDisposeError`) are statically rejected.

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})

app.get('/ready', async (request) => {
  return request.server.di.get('health').check()
})
```

In root-only mode, do not augment `FastifyRequest.di`; handlers should use
`this.di` in non-arrow handlers or `request.server.di`.

## Lifecycle

Scoped mode installs:

1. `decorate('di', root)`.
2. `decorateRequest('di', null)`.
3. `onRequest` — creates and initializes the request scope.
4. `onResponse` — disposes the request scope after the response is sent.
5. `onRequestAbort` — disposes the request scope when the client aborts before
   the response is sent (`onResponse` does not run then).

Root-only mode installs only `decorate('di', root)` and, when
`disposeRootOnClose` is set, root disposal on `onClose`.

## API

```ts
// A value or a promise of it — used by the scope hooks.
export type MaybePromise<T> = T | Promise<T>

// Minimal structural contract for a disposable scope (any Container satisfies it).
export interface InferdiScope {
  dispose(): MaybePromise<void>
}

// Root container: only `createScope()` is required. A `dispose()` is needed just
// for `disposeRootOnClose: true`, enforced at the option level.
export interface InferdiRoot<Scope extends InferdiScope = InferdiScope> {
  createScope(): Scope
}

// Extracts the request-scope type produced by a root container.
export type InferdiScopeOf<Root extends InferdiRoot> = ReturnType<Root['createScope']>

// Per-request (scoped) and root-only option shapes; the union discriminates on
// `scopePerRequest`. `Scope` defaults to `InferdiScopeOf<Root>`.
export type ScopedOptions<Root, Scope = InferdiScopeOf<Root>> = { /* ... */ }
export type RootOnlyOptions<Root, Scope = InferdiScopeOf<Root>> = { /* ... */ }
export type InferdiFastifyOptions<Root, Scope = InferdiScopeOf<Root>> =
  | ScopedOptions<Root, Scope>
  | RootOnlyOptions<Root, Scope>

// Public call signature of the plugin. `Root` is inferred from `container`;
// `Scope` defaults to `InferdiScopeOf<Root>`.
export type InferdiFastifyPlugin = <Root extends InferdiRoot, Scope extends InferdiScope = InferdiScopeOf<Root>>(
  fastify: FastifyInstance,
  options: InferdiFastifyOptions<Root, Scope>,
) => Promise<void>

// The plugin. Register it with `app.register(inferdiFastify, options)`.
export const inferdiFastify: InferdiFastifyPlugin
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

The project repository lives at [inferdi/inferdi](https://github.com/inferdi/inferdi). This adapter targets [Fastify](https://fastify.dev) v5.
