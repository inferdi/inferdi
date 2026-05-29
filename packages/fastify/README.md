# @inferdi/fastify

Fastify v5 request-scope adapter for InferDI.

The plugin wires InferDI into Fastify's lifecycle without adding decorators,
reflection, controller scanning, or handler parameter injection. Applications
still build an explicit InferDI graph and resolve services with `.get(key)`.

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
has been sent.

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

- `container` is required and must structurally provide `createScope()` and
  `dispose()`.
- `createScope` overrides the default `root.createScope()` behavior.
- `setupScope` hydrates the scope before it is assigned to `request.di`.
- `disposeRootOnClose` defaults to `false`, set it when the Fastify instance
  owns the root container lifetime.
- `logDisposeError` defaults to Fastify request logging and is only used for
  request-scope disposal failures. These failures are swallowed because the
  response has already been sent.

If `setupScope` fails after a scope has been created, the plugin disposes that
scope and rethrows the original error through Fastify's normal hook error path.

## Root-Only Mode

Use `scopePerRequest: false` when the application does not use request-scoped
services. In this mode the plugin only decorates the Fastify instance as
`app.di`, it does not decorate requests or install request lifecycle hooks.

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

In root-only mode, do not augment `FastifyRequest.di`, handlers should use
`this.di` in non-arrow handlers or `request.server.di`.

## Lifecycle

Scoped mode installs:

1. `decorate('di', root)`.
2. `decorateRequest('di', null)`.
3. `onRequest` to create and initialize the request scope.
4. `onResponse` to dispose the request scope.

Root-only mode installs only `decorate('di', root)` and optional root disposal
on `onClose`.

## API

```ts
export type MaybePromise<T> = T | Promise<T>

export interface InferdiScope {
  dispose(): Promise<void>
}

export interface InferdiRoot<Scope extends InferdiScope> extends InferdiScope {
  createScope(): Scope
}

export type InferdiFastifyOptions<Root, Scope> = ...

export const inferdiFastify: <Scope, Root>(
  fastify: FastifyInstance,
  options: InferdiFastifyOptions<Root, Scope>,
) => Promise<void>
```
