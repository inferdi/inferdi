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
  setupScope: (scope, request) => {
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
  disposeRootOnClose: true,
  logDisposeError: (error, request) => {
    request.log.error({ err: error }, 'Failed to dispose request scope')
  },
})
```

| Option | Default | Description |
| --- | --- | --- |
| `container` | — | **Required.** The root container. Must structurally provide `createScope()` and `dispose()`. Exposed as `app.di`. |
| `scopePerRequest` | `true` | Set to `false` for [root-only mode](#root-only-mode). |
| `createScope` | `root.createScope()` | Overrides how a per-request scope is created. May be async. |
| `setupScope` | — | Hydrates the scope before it is assigned to `request.di`. Runs in `onRequest`. May be async. |
| `disposeRootOnClose` | `false` | Dispose the root container on `fastify.close()`. Set it when the Fastify instance owns the root container's lifetime. |
| `logDisposeError` | `request.log.error(...)` | Sink for **request-scope** disposal failures. These are swallowed because the response has already been sent. |

If `setupScope` fails after a scope has been created, the plugin disposes that
scope and rethrows the original error through Fastify's normal hook error path.

## Root-Only Mode

Use `scopePerRequest: false` when the application does not use request-scoped
services. In this mode the plugin only decorates the Fastify instance as
`app.di` — it does **not** decorate requests or install request lifecycle hooks,
so the per-request options (`createScope`, `setupScope`, `logDisposeError`) are
statically rejected.

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
4. `onResponse` — disposes the request scope.

Root-only mode installs only `decorate('di', root)` and, when
`disposeRootOnClose` is set, root disposal on `onClose`.

## API

```ts
// A value or a promise of it — used by the scope hooks.
export type MaybePromise<T> = T | Promise<T>

// Minimal structural contract for a disposable scope (any Container satisfies it).
export interface InferdiScope {
  dispose(): Promise<void>
}

// Root container: a disposable scope that can also open child scopes.
export interface InferdiRoot<Scope extends InferdiScope> extends InferdiScope {
  createScope(): Scope
}

// Per-request (scoped) and root-only option shapes; the union discriminates on
// `scopePerRequest`.
export type ScopedOptions<Root, Scope> = { /* ... */ }
export type RootOnlyOptions<Root, Scope> = { /* ... */ }
export type InferdiFastifyOptions<Root, Scope> =
  | ScopedOptions<Root, Scope>
  | RootOnlyOptions<Root, Scope>

// Public call signature of the plugin (Scope/Root inferred from the options).
export type InferdiFastifyPlugin = <Scope extends InferdiScope, Root extends InferdiRoot<Scope>>(
  fastify: FastifyInstance,
  options: InferdiFastifyOptions<Root, Scope>,
) => Promise<void>

// The plugin. Register it with `app.register(inferdiFastify, options)`.
export const inferdiFastify: InferdiFastifyPlugin
```

## Related

- [InferDI](https://github.com/inferdi/inferdi) — the project repository.
- [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi) — the core
  DI container ([JSR](https://jsr.io/@inferdi/inferdi)).
- [Fastify](https://fastify.dev) — the web framework this adapter targets (v5).
