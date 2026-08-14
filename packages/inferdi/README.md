# InferDI

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

[![JSR](https://jsr.io/badges/@inferdi/inferdi)](https://jsr.io/@inferdi/inferdi)
[![npm version](https://img.shields.io/npm/v/@inferdi/inferdi)](https://www.npmjs.com/package/@inferdi/inferdi)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/%40inferdi%2Finferdi)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
[![codecov](https://codecov.io/gh/inferdi/inferdi/graph/badge.svg?token=IHAXLIFHF3)](https://codecov.io/gh/inferdi/inferdi)
![License](https://img.shields.io/npm/l/@inferdi/inferdi.svg)
[![Docs](https://img.shields.io/badge/docs-inferdi.com-5b5ff5)](https://inferdi.com/guide/quick-start)

A zero-dependency, **decorator-free**, strongly typed DI container for modern TypeScript.

<br>
<p>
  🌐 <strong>Multilingual documentation:</strong>
  <a href="https://inferdi.com/guide/quick-start">English</a> ·
  <a href="https://inferdi.com/zh/guide/quick-start">中文</a> ·
  <a href="https://inferdi.com/ja/guide/quick-start">日本語</a> ·
  <a href="https://inferdi.com/es/guide/quick-start">Español</a> ·
  <a href="https://inferdi.com/ru/guide/quick-start">Русский</a>
</p>
<br>

<p><em>Build apps with next-gen DI for any modern runtime with ultra-fast architecture, clean domain logic, and first-class testability.</em></p>
</div>

## Table of Contents

- **Getting Started**
  - [Install](#install)
  - [Quick Start](#quick-start)
  - [Examples](#examples)
  - [Fastify Adapter](#fastify-adapter)
  - [Hono Adapter](#hono-adapter)
  - [Koa Adapter](#koa-adapter)
  - [Express Adapter](#express-adapter)
  - [Elysia Adapter](#elysia-adapter)
- **Overview**
  - [Why InferDI?](#why-inferdi)
  - [Performance](#performance)
- **Core Concepts**
  - [Factories](#factories)
  - [Binding Interfaces](#binding-interfaces)
  - [Compiler-enforced Signatures](#compiler-enforced-signatures)
  - [Scopes & Native Teardown](#scopes--native-teardown)
    - [Scope Inputs and Profiles](#scope-inputs-and-profiles)
    - [Async Factories](#async-factories)
  - [Runtime Lifetime Guards](#runtime-lifetime-guards)
    - [`fast` option](#runtime-contracts)
- **Advanced Usage**
  - [Lazy Injection](#lazy-injection)
  - [Symbol Keys](#symbol-keys)
  - [Modularity with `.use()`](#modularity-with-use)
  - [Querying with `.has()`](#querying-with-has)
  - [Test Overrides](#test-overrides)
- **Types & Reference**
  - [Typing a Built Container — `Container.Resolve<C>`](#typing-a-built-container--containerresolvec)
  - [Provider Maps — `Container.Providers<C>`](#provider-maps--containerprovidersc)
  - [Errors](#errors)
  - [Migration](#migration)
  - [API Summary](#api-summary)
  - [Repository Structure](#repository-structure)
  - [License](#license)

## Why InferDI?

InferDI gives TypeScript applications an explicit, typed dependency graph without decorators, reflection, or runtime dependencies. It suits services and edge workloads that need fast startup, predictable resolution, and compiler-checked wiring.

- ☁️ **Zero-dependency core**
  Ship the core without a runtime dependency tree. Use it in Node, Bun, Deno, browsers, Workers, and serverless functions.

- ⚡ **Fast resolve path**
  Cached services resolve through a `Map.get()` fast path. Class construction uses direct calls for constructors with up to seven dependencies.

- 🛡️ **Typed registration**
  TypeScript checks constructor arguments, missing keys, duplicate keys, and lifetime boundaries at the registration site.

- 🛑 **Lifetime checks**
  A singleton cannot depend on a scoped or transient service. TypeScript rejects that graph, and the default runtime checks catch cast-based or dynamic-key bypasses.

- ♻️ **Native `using` teardown**
  Scopes dispose owned instances in **LIFO order** and collect multiple cleanup failures in one `AggregateError`.

- 🔣 **String and symbol keys**
  Register services with strings or symbols. Use `Symbol.for('shared')` across modules, `unique symbol` for type-level branding, and local `Symbol()` values for private tokens.

## Performance

InferDI keeps the hot path small: static type checks replace runtime reflection, resolve avoids `Proxy` traps, and constructors with 0-7 dependencies use direct `new Ctor(...)` calls. The benchmark suite measures the result across common DI workloads.

The [`benchmarks/`](https://github.com/inferdi/inferdi/tree/main/benchmarks) workspace compares InferDI with **InversifyJS v8, Awilix v13 (PROXY and CLASSIC), TSyringe v4, TypeDI v0.10, and Typed Inject v5**. Numbers show operations per second on Node 22. Higher values win. Run `cd benchmarks && pnpm install --frozen-lockfile && pnpm run bench` to reproduce them.

![benchmarks](https://raw.githubusercontent.com/inferdi/inferdi/main/assets/benchmarking_results.png)

| Scenario                                              | InferDI    | InversifyJS | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | TSyringe | TypeDI |
|-------------------------------------------------------|------------|-------------|--------------|----------------|------------------|----------|--------|
| **1. Hot singleton resolve** (warm cache)             | **14.3 M** | 10.7 M      | 7.0 M        | 7.3 M          | 6.7 M            | 5.8 M    | 6.45 M |
| **2. Transient resolve** (new instance per call)      | **9.75 M** | 6.1 M       | 4.1 M        | 3.45 M         | 3.0 M            | 2.5 M    | 1.6 M  |
| **3. Deep graph** (10 levels, all transient)          | **2.3 M**  | 1.5 M       | 1.3 M        | 716 k          | 736 k            | 643 k    | 222 k  |
| **4a. Wide graph** (4 deps, root transient)           | **8.25 M** | 4.9 M       | 3.4 M        | 2.2 M          | 2.3 M            | 1.65 M   | 1.1 M  |
| **4b. Wide graph** (10 deps, root transient)          | **3.5 M**  | 1.9 M       | 2.6 M        | 1.2 M          | 1.3 M            | 938 k    | 458 k  |
| **5. Container build + first resolve**                | **400 k**  | 13.2 k      | 223 k        | 10 k           | 8.3 k            | 206 k    | 282 k  |
| **6. Scoped lifecycle** (create + resolve + cleanup)  | **2.85 M** | 35 k        | 2.45 M       | 330 k          | 430 k            | 1.1 M    | 665 k  |
| **7. Lazy resolve** (deferred wrapper)                | **11.8 M** | 7.6 M       | 7.15 M       | 5.6 M          | 4.7 M            | 4.25 M   | 2.85 M |

### Highlights

- **1.34× faster cached singleton resolve** than InversifyJS, the closest result in this scenario. InferDI reads a warm service from `Map.get()` without metadata lookup or a parent-chain walk.
- **30× faster container build plus first resolve** than InversifyJS, and up to **48× faster** than Awilix. InferDI registers the graph from scratch through `Map.set` calls.
- **Wide graphs stay competitive as arity grows.** With four dependencies, InferDI leads the next result by **1.68×**. With ten dependencies, it uses `Reflect.construct` and remains **1.35× ahead** of Typed Inject.
- **InferDI leads all eight measured scenarios.** It leads the ten-level graph by **1.53×** over InversifyJS and the scoped lifecycle by **1.16×** over Typed Inject. The lifecycle result includes a synchronous `Symbol.dispose` call on each iteration.
- **Typed Inject remains the closest baseline for scoped flows and 10-dependency graphs.** InversifyJS provides the closest result in several other resolve workloads.
- **Scenario 5 measures different setup costs.** TypeDI and TSyringe register classes through decorator side effects at module evaluation. Their benchmark result measures child-context creation, while InferDI registers the full graph before the first resolve.

Full methodology, fairness notes, fixture sources, and per-scenario reasoning: see [`benchmarks/README.md`](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md).

## Install

For the full multilingual guide, adapter docs, API reference, and migration notes, see [inferdi.com](https://inferdi.com).

InferDI is published to **two registries** with identical contents:

- **npm** as `@inferdi/inferdi` — for Node, Bun, and any tooling that resolves npm.
- **JSR** as `@inferdi/inferdi` — for Deno and any runtime that prefers TypeScript sources directly.

Pick the channel that matches your runtime — the import code below stays the same.

### Node.js

```bash
npm  i   @inferdi/inferdi   # npm
pnpm add @inferdi/inferdi   # pnpm
yarn add @inferdi/inferdi   # yarn
```

```ts
import { Container } from '@inferdi/inferdi'
```

### Bun

```bash
bun add @inferdi/inferdi          # from npm
# or
bun add jsr:@inferdi/inferdi      # from JSR (TypeScript sources)
```

```ts
import { Container } from '@inferdi/inferdi'
```

### Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

Or import via the full JSR specifier without an `add` step:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

### Requirements

- **Node ≥ 16.** On Node < 20.4 `Symbol.dispose` / `Symbol.asyncDispose` are auto-polyfilled via `Symbol.for` on import, so `using` / `await using` interop is preserved.
- **Bun ≥ 1.0** and **Deno ≥ 1.40** ship native `Symbol.dispose` / `Symbol.asyncDispose` — the polyfill is a no-op there.
- **TypeScript ≥ 5.2.** Published declarations reference the explicit-resource-management library themselves, so consumers targeting ES2022 do not need to add `ESNext.Disposable` to their `lib` configuration.

## Quick Start

Notice how you don't need any `@Injectable()` decorators. The dependency types are inferred directly from the strings you pass.

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(msg: string) { console.log(`[LOG] ${msg}`) }
}

class UserRepo {
  // Plain TypeScript class, no decorators!
  constructor(private readonly logger: Logger, private readonly dsn: string) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  // The deps tuple is type-checked positionally against UserRepo's constructor.
  // Swapping the order to ['dsn', 'logger'] is rejected at compile time.
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

// Type-safe resolve — TypeScript knows `userRepo` is `UserRepo`:
container.get('userRepo').find('42')
```

Use `.get(key)` for synchronous registrations and `.getAsync(key)` for graphs that may contain declarative async registrations. Both are fully typed and use the same registry, cache, scope lookup, and lifetime routing; there is no Proxy overhead.

## Examples

The repository includes framework and runtime examples in [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples). They are GitHub-only reference snippets: framework dependencies are not installed in this package, and `examples/` is excluded from the npm tarball.

- **JavaScript usage** — [`examples/javascript/`](https://github.com/inferdi/inferdi/tree/main/examples/javascript)
  - [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) — Node ESM `import` with `// @ts-check` and JSDoc constructor types.
  - [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) — Node CommonJS `require` with the same runtime wiring.
  - [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) — browser-oriented ESM for Vite or another bundler.
- **Shared foundation** — [`examples/_shared/`](https://github.com/inferdi/inferdi/tree/main/examples/_shared)
  - [`container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) — canonical container builder used by most server examples.
  - [`testing.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/testing.ts) — typed test fixtures and `override()` usage.
- **Backend frameworks** — [`examples/backend/`](https://github.com/inferdi/inferdi/tree/main/examples/backend)
  - [`fastify.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/fastify.ts) — uses `@inferdi/fastify` for request scopes.
  - [`hono.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/hono.ts) — uses `@inferdi/hono` for request scopes.
  - [`koa.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/koa.ts) — uses `@inferdi/koa` for request scopes.
  - [`express.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/express.ts) — uses `@inferdi/express` for request scopes.
  - [`elysia.ts`](https://github.com/inferdi/inferdi/blob/main/examples/backend/elysia.ts) — uses `@inferdi/elysia` for request scopes.
- **API layers** — [`examples/api-layers/`](https://github.com/inferdi/inferdi/tree/main/examples/api-layers)
  - [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)
  - [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)
  - [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
- **Full-stack frameworks** — [`examples/fullstack/`](https://github.com/inferdi/inferdi/tree/main/examples/fullstack)
  - [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)
  - [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
- **Runtimes and edge platforms** — [`examples/runtimes-edge/`](https://github.com/inferdi/inferdi/tree/main/examples/runtimes-edge)
  - [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)
  - [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)
  - [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)
  - [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)
  - [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)
  - [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)
  - [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
- **Frontend frameworks** — [`examples/frontend/`](https://github.com/inferdi/inferdi/tree/main/examples/frontend)
  - [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)
  - [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)
  - [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)
  - [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
- **Bots, queues, and CLI** — [`examples/workers-cli/`](https://github.com/inferdi/inferdi/tree/main/examples/workers-cli)
  - [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)
  - [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)
  - [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)
  - [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)
  - [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)

## Fastify Adapter

Fastify v5 applications can use the separate [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) package to create and dispose one InferDI scope per request. It is published to npm and JSR with the same version as `@inferdi/inferdi`.

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
  type RootContainer,
} from './container.js'

const root = buildRootContainer()
const app = Fastify()

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
  // Annotate hook params: `app.register` cannot infer the plugin's generics.
  createScope: (root: RootContainer, request: FastifyRequest) =>
    createRequestScope(root, {
      requestId: request.id,
      ip: request.ip,
    }),
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

Set `scopePerRequest: false` for root-only Fastify apps. In that mode the plugin exposes only `app.di` / `request.server.di` and installs no request lifecycle hooks.

## Hono Adapter

Hono applications can use the separate [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) package to create and dispose one InferDI scope per request. It is published to npm and JSR with the same version as `@inferdi/inferdi`.

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

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

Streaming Hono routes should call `skipInferdiDispose(c)` and dispose the scope inside the stream lifecycle, because Hono can return the `Response` before the stream callback finishes.

## Koa Adapter

Koa v3 applications can use the separate [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) package to create and dispose one InferDI scope per request. It is published to npm and JSR with the same version as `@inferdi/inferdi`.

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
import { buildRootContainer } from './container.js'

const root = buildRootContainer()
const app = new Koa()

declare module 'koa' {
  interface DefaultState {
    di: InferdiScopeOf<typeof root>
  }
}

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

Koa stream bodies normally do not need manual disposal handling: the adapter waits for the underlying Node response `finish` or `close` event. Call `skipInferdiDispose(ctx)` only when application code intentionally keeps the scope beyond the HTTP response boundary, such as background work that disposes the scope later. The skip suppresses cleanup only for a successful response — a downstream error still disposes the scope.

## Express Adapter

Express 5 applications can use the separate [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) package to create and dispose one InferDI scope per request. It is published to npm and JSR with the same version as `@inferdi/inferdi`.

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
import {
  buildRootContainer,
  createRequestScope,
} from './container.js'

const root = buildRootContainer()
const app = express()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

app.use(inferdiExpress({
  container: root,
  createScope: (root, req) =>
    createRequestScope(root, {
      requestId: crypto.randomUUID(),
      userId: Array.isArray(req.headers['x-user-id'])
        ? req.headers['x-user-id'][0]
        : req.headers['x-user-id'],
      ip: req.ip,
    }),
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

Express stream bodies normally do not need manual disposal handling: the adapter waits for the underlying Node response `finish` or `close` event. Call `skipInferdiDispose(req)` only when application code intentionally keeps the scope beyond the HTTP response boundary. Unlike the other adapters, Express cannot force-dispose on a handled route error — its callback middleware never observes a downstream exception — so a skipped scope on a failed request stays application-owned; see the package README.

## Elysia Adapter

Elysia applications can use the separate [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) package to create and dispose one InferDI scope per request. It is published to npm and JSR with the same version as `@inferdi/inferdi`.

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
import {
  buildRootContainer,
  createRequestScope,
} from './container.js'

const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    createScope: (root, { request }) =>
      createRequestScope(root, {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined,
      }),
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

Elysia streaming routes should call `skipInferdiDispose(context)` and dispose the scope when stream or background work ends. The adapter uses both `onError` and `onAfterResponse` so validation failures after `derive` do not leak request scopes.

## Factories

Use `registerFactory` when construction is more than `new Class(deps)` — for example, when you need to read multiple values from the container, build a config object, or wrap a third-party connection. The factory receives the container; the type `V` is inferred from its return value.

```ts
import { Pool } from 'pg'

const container = new Container()
  .registerValue('config', { dsn: 'postgres://...', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  // ^ container.get('pgPool') is now typed as `Pool` automatically.
  .registerClass('userRepo', UserRepo, ['pgPool'])
```

Factories follow the same lifetime rules as classes — pass the lifetime as the third argument: `registerFactory('cache', factory, 'scoped')`. An optional fourth `lazyKey` registers the same lifetime-preserving `Lazy<V>` companion as `registerClass`: `registerFactory('cache', factory, 'singleton', 'cacheLazy')`. A companion always requires an explicit lifetime, including `'singleton'`. Inside a **singleton** factory the container parameter is narrowed via `AllowedDeps<T, 'singleton'>`, so `c.get(...)` accepts singleton keys and singleton-target `Lazy` or `AsyncLazy` companions. Scoped, transient, and possibly short-lived companions are TypeScript errors in that factory body.

Factories that read scope inputs declare those edges with a dependency tuple. The tuple narrows the callback to a resolver-only view and carries input requirements to the result:

```ts
root.registerFactory(
  'userId',
  (c) => c.get('auth').userId,
  ['auth'],
  'scoped'
)
```

The tuple serves the type system. InferDI still calls `factory(container)` and does not resolve the tuple into an argument array.

`registerFactory` remains a synchronous graph surface even when its return value happens to be a Promise. Its resolver and deps-aware tuple cannot read keys created by `registerAsyncFactory`; use the declarative async API below when downstream classes should receive final resolved services.

A `lazyKey` on a Promise-valued `registerFactory` preserves that model: the companion is `Lazy<Promise<T>>`. InferDI creates `AsyncLazy<T>` only for declarative async targets.

## Binding Interfaces

TypeScript interfaces do not exist at runtime, so you cannot pass them to `registerClass` — the key would be inferred as the concrete class, not the abstraction. To bind an interface to a concrete implementation, use `registerFactory` with an explicit type argument:

```ts
interface Mailer { send(msg: string): void }

class SendGridMailer implements Mailer {
  send(msg: string) { /* ... */ }
}

const container = new Container()
  // Explicitly tell InferDI this key yields a `Mailer`, not a `SendGridMailer`.
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

Now any consumer that depends on `'mailer'` sees the `Mailer` abstraction, and you can swap `SendGridMailer` for another implementation (e.g. `MockMailer` in tests) without touching downstream types.

## Compiler-enforced Signatures

In traditional DI frameworks, injection errors — like swapping the argument order, passing the wrong type, or forgetting a dependency entirely — only surface as runtime crashes.
**InferDI validates your dependency graph at compile time.** Thanks to advanced TypeScript mapping (`DepsOf`), the array of dependency keys is strictly checked against the types and positional order of the target class's constructor arguments.

`registerAsyncFactory` and any `registerClass` call whose tuple may select an async key require readonly dependencies. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples; sync-only `registerClass` calls keep mutable-tuple compatibility.

```typescript
class Logger {
  log(msg: string) {}
}

class UserRepo {
  // The constructor strictly expects: (Logger, string)
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string
  ) {}
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])

  // ❌ TypeScript Error: Type '"dsn"' is not assignable to type '"logger"'.
  // The compiler knows the 1st arg needs a Logger, but 'dsn' yields a string.
  .registerClass('userRepo', UserRepo, ['dsn', 'logger'])

  // ✅ Compiles perfectly.
  // If you change the UserRepo constructor later, this line will break at compile time!
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])
```

**Fearless Refactoring:**  If you ever change the `UserRepo` constructor signature (add a parameter, remove one, or just swap their order), TypeScript will instantly highlight the error at the `.registerClass()` call. Your production app will never crash due to a misaligned dependency again.

## Scopes & Native Teardown

Container itself implements `Symbol.dispose` and `Symbol.asyncDispose`, so it works with `using` / `await using` directly. Owned instances are torn down in reverse-creation order (LIFO).

```ts
const root = new Container()
  .registerClass('db', Db, [])                     // singleton on root
  .registerClass('reqCtx', RequestCtx, [], 'scoped')

async function handle(request: Request) {
  // The scope's owned instances (its scoped/singleton-on-scope services) are
  // auto-disposed in LIFO order when the function exits. Transient instances
  // are owned by the caller — the container neither caches nor disposes them.
  // Singletons live on `root` and stay alive until root is disposed.
  await using scope = root.createScope()

  const ctx = scope.get('reqCtx') // cached on this scope only
  // ... handle request ...
}

// At application shutdown, dispose the root explicitly:
await root[Symbol.asyncDispose]()           // or: await root.dispose()
```

`createScope()` returns a child that owns scoped values. With runtime checks
enabled by default, resolving one from the root throws:

```
Error: Scoped "reqCtx" cannot be resolved from the root container. Use createScope().
```

Call `scope.get('reqCtx')`, as in the example above. `{fast: true}` skips this
runtime guard together with cycle and lifetime checks.

### Scope Inputs and Profiles

Declare request data, authentication state, tenant context, or job metadata as scope inputs. A declaration adds type information and no runtime registration:

```ts
const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass('accountService', AccountService, ['request', 'auth'], 'scoped')

const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error — auth has not been provided
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

Use ordinary functions as named profiles:

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})
```

`createScope(inputs)` copies enumerable own string and symbol properties into the child cache. A nested child inherits input values but gets a separate cache for scoped services. Input values remain application-owned; disposing the scope does not dispose them. If you refine a scope through another child, dispose the refined child before its parent.

The input schema exists only in TypeScript. JavaScript, `any`, or a cast can seed unknown keys or shadow registrations. Pass a passive data record; getters and Proxy traps run during the shallow snapshot, and reentrant side effects are outside the API contract. `{fast: true}` supports input refinement, but its fixed-graph rule still requires registration to finish before the first `.get()` or `.createScope()`.

Named modules can describe input slots with `ScopeInputMap<M>` and carry requirements in their output with `WithRequirements<Spec<V, L>, Keys>`. Generic async-capable resolvers should use `Container.ReadyKeys<Container<T>>`; synchronous resolvers should use `Container.SyncReadyKeys<Container<T>>`. See [MIGRATION.md](./MIGRATION.md) for the `keyof T` migration.

The container probes each owned instance in order: `Symbol.asyncDispose` → `Symbol.dispose` → plain `.dispose()`. If multiple disposers throw, all errors are collected into a single `AggregateError` so one failing resource never leaves the rest unclosed. When dependency failure propagates through several cached Promises, async teardown reports the same `Error` object once; separate error objects remain separate causes.

> **What gets disposed by which container.** Each container disposes only the instances it created. `root.dispose()` does **not** propagate into already-created child scopes — give scopes their own `await using` (or `dispose()` call) to release their resources. Forgetting to dispose a scope leaks every singleton/scoped instance it created.

```ts
try {
  await root.dispose()
} catch (e) {
  // Catch multiple DB/Redis disconnect failures at once!
  if (e instanceof AggregateError) {
    console.error(e.errors)
  }
}
```

### Async Factories

InferDI supports two Promise models with separate contracts.

Use `registerAsyncFactory` for a declarative async dependency graph. It receives positional dependency values, stores the final service type in `AsyncSpec<V, L>`, and propagates async status through dependent classes. Resolve the graph with `getAsync()`; TypeScript rejects `get()` for an async key or a union that may contain one.

```ts
class Repository {
  constructor(readonly db: Pool) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .registerAsyncFactory('db', async (config) => {
    const pool = new Pool({connectionString: config.dsn})
    await pool.connect()
    return pool
  }, ['config'])
  .registerClass('repository', Repository, ['db'], 'scoped')

await using scope = root.createScope()
const repository = await scope.getAsync('repository')

// @ts-expect-error — repository is part of the async graph
scope.get('repository')
```

Declared dependencies are started synchronously in tuple order, then only keys marked as declarative async dependencies are awaited. Singleton and scoped registrations cache one native Promise, so concurrent callers share initialization and a rejection remains the stable failed state. Transients start once per call and remain caller-owned. Scope-input requirements and lifetime checks propagate through `AsyncSpec` the same way they do through `Spec`.

`getAsync()` also accepts sync keys and always returns a Promise. For a traditional sync registration whose service type itself is `Promise<T>`, the top-level call follows normal JavaScript await semantics and returns `Promise<T>`.

`registerFactory` keeps the legacy Promise-valued model. The Promise is the service value, remains a sync key, and is injected by identity rather than awaited:

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
```

Owned async singleton/scoped registrations keep their Promise in the cache for the container lifetime. Use `await using`, `await container.dispose()`, or `container[Symbol.asyncDispose]()` even after initialization has fulfilled. Sync `using` cannot unwrap the cached Promise and reports a misuse. Before throwing, it observes a cached native Promise rejection so a later failure does not reach `unhandledRejection`; custom thenables are not assimilated.

Pass a fifth `lazyKey` to `registerAsyncFactory` to create an `AsyncLazy<T>` companion. Resolving or injecting the wrapper does not start the factory. `wrapper.get()` returns the native Promise cached by singleton and scoped targets, so concurrent calls keep the same single-flight identity. Transient targets start once per call and remain caller-owned.

```ts
const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy = c.get('dbLazy') // AsyncLazy<Database>; connectDatabase has not run
const db = await dbLazy.get()
```

Classes receive a mode-matched companion. A sync class produces `Lazy<T>`, an async-propagated class produces `AsyncLazy<T>`, and a dependency key union that may choose either path produces `Lazy<T> | AsyncLazy<T>`. Injecting `AsyncLazy<T>` into a class does not make that consumer async because wrapper creation is synchronous.

Declarative cycles are detected during synchronous dependency preflight. Dynamic edges created later from a captured container, including `AsyncLazy.get()` calls after a Promise boundary, are outside graph analysis.

If dependency preflight fails after earlier initializations started, InferDI returns the original structural error and observes already-returned native Promise rejections. It does not roll back, cancel, or take ownership of an orphaned async transient. `registerAsyncFactory` and any `registerClass` call whose tuple may select an async key require readonly dependencies because InferDI classifies async positions once. Inline literals infer readonly tuples; sync-only classes keep mutable-tuple compatibility.

> ⚠️ **A dynamic cycle created after a Promise boundary can deadlock.** This includes captured-container calls and `AsyncLazy.get()`. The runtime cycle detector projects the synchronous call stack; reaching a cached pending Promise from its own initialization waits forever. Break the cycle or hoist shared initialization.

> The same boundary applies to lifetime checks after `await` in legacy factories or captured-container continuations. `AllowedDeps` protects normal typed code; keep dynamic dependency reads in the synchronous prelude.

## Runtime Lifetime Guards

| Lifetime    | Created                                         | Cached on                | Disposed by container |
| ----------- | ----------------------------------------------- | ------------------------ | --------------------- |
| `singleton` | once per container that owns the registration | the owner container      | yes |
| `scoped`    | once per child scope                            | the child scope          | yes |
| `transient` | every time requested                            | never                    | no (caller owns it)   |

With the default `{fast: false}` contract, `root.get(scopedKey)` throws because
the root does not represent a scope. Resolve the key from a child returned by
`createScope()`. `{fast: true}` skips this runtime check.

**The Lifetime Rule:** A singleton cannot directly depend on a scoped or transient service. That would freeze a short-lived value inside a long-lived cache. `InferDI` enforces this **at compile time**:

```ts
new Container()
  .registerClass('requestCtx', RequestCtx, [], 'scoped')
  // ❌ TS error: '"requestCtx"' is not assignable to type 'never'.
  //    AllowedDeps<T, 'singleton'> filters scoped/transient keys out of
  //    the deps tuple visible to a singleton target.
  .registerClass('userService', UserService, ['requestCtx'], 'singleton')
```

Inside a singleton **factory**, the container parameter is structurally narrowed
so only legal keys autocomplete:

```ts
new Container()
  .registerClass('requestCtx', RequestCtx, [], 'scoped')
  .registerFactory('userService', (c) => {
    // ❌ TS error: 'requestCtx' is not a key of the narrowed container.
    const ctx = c.get('requestCtx')
    return new UserService(ctx)
  }, 'singleton')
```

The same check fires at runtime as defense-in-depth — if you bypass the type
system with an `as`-cast, you still get a clear diagnostic:

```
Error: Singleton "userService" cannot depend on scoped "requestCtx".
Use Lazy<T> (register with a lazyKey companion) to get a fresh instance per access.
```

### Runtime contracts

`fast` defaults to `false`:

```ts
const defaultRoot = new Container()
const explicitRoot = new Container({ fast: false })
```

This checked contract preserves the exact parent chain and keeps the graph
mutable. Runtime cycle, lifetime, and root-scoped guards remain enabled.

Set `fast: true` only for an audited fixed graph:

```ts
const root = new Container({ fast: true })
  .registerClass('logger', Logger, [])
```

The fast contract drops cycle bookkeeping (`resolving` push/pop plus
`Array#includes`), singleton-stack tracking, and the surrounding `try`/`finally`
from guarded resolution. Local transient resolves collapse to `fn(this)`.
Fixed scopes read the registry owner directly instead of walking the parent
chain, then mirror delegated singletons into their local cache. The default
contract walks the exact parent chain on each local miss, so mutations remain
visible. Fast containers skip defensive registration-time cache invalidation.
Owned-instance identity de-duplication still runs during disposal. Every child
created through `createScope()` inherits its parent's contract.

The default runtime checks cover cases outside the compile-time guard:

| Problem | Compile-time | Runtime (`fast: false`) |
|---|---|---|
| Root container resolves a scoped key | ✗ | ✓ |
| Singleton depends on scoped/transient directly via `deps` or the narrowed `c` parameter | ✓ | ✓ |
| Singleton depends on scoped/transient via a **captured outer container reference** inside a factory body | ✗ | ✓ |
| Singleton ↔ Singleton cycle | ✗ | ✓ |
| Transient ↔ Transient cycle | ✗ | ✓ |
| Lifetime violation introduced via an `as`-cast (`as never`, `as any`, `as Container<...>`) | ✗ | ✓ |
| Dynamic key construction (`c.get(computedKey as keyof T)`) | ✗ | ✓ |

In particular, **the type system cannot see cycles**. A `Singleton →
Singleton` cycle compiles cleanly (both ends pass the `AllowedDeps`
filter); the default contract reports it as
`Circular dependency detected: a -> b -> a`, while `{fast: true}` lets V8 recurse until
`RangeError: Maximum call stack size exceeded`. The same applies to
`Transient ↔ Transient` cycles, which `AllowedDeps` never filters at all.

The narrowing of `c` inside a factory is also **per-parameter, not
per-scope**. If you capture an outer container reference in the closure,
that reference still has its wider type:

```ts
const root = new Container().registerClass('req', ReqCtx, [], 'scoped')
root.registerFactory('logger', () => {
  // `root` here is the wide Container<T>, NOT the narrowed AllowedDeps view.
  // TypeScript happily compiles this:
  return new Logger(root.get('req'))   // fast: false throws before construction
}, 'singleton')
```

The default contract stops this at `root.get('req')` with the root-scope
diagnostic. `{fast: true}` allows the read and may retain request state on the root.

Use `{fast: true}` only when all of these conditions hold:

- Your graph has no cycles (including `transient ↔ transient`).
- Every factory reads dependencies **only** through its own `c` parameter —
  no captured outer container references.
- All registrations go through the fluent API without `as`-casts to bypass
  `AllowedDeps`.
- Any `Module<TRequirements, TProvides>` declarations honestly describe their requirements.
- Each runtime key is registered once through one linear fluent chain; older
  pre-widening container aliases are not reused for duplicate registration.
- Every `register*` call finishes before the first `.get()` or `.createScope()`.
- The activated tree is immutable: do not call `register*` or `.override()`
  while scopes are live.
- Child scopes are disposed before their ancestors.

The fast contract relies on those topology and lifecycle rules and trusts that
the graph has no cycles or lifetime violations. Breaking the fixed
contract can leave a child using a stale locally cached singleton or make a
post-activation registration invisible to descendants.

Develop and test with the default checked mutable contract. Switch an audited,
immutable production graph to `{fast: true}` only after runtime tests exercise
its cycles, lifetime boundaries, scopes, overrides, and disposal paths.

## Lazy Injection

`Lazy<T>` and `AsyncLazy<T>` defer target resolution. Pass a `lazyKey` to `registerClass`, `registerFactory`, or `registerAsyncFactory`; the target decides the wrapper mode:

- sync target: `Lazy<T>` with `get(): T`
- declarative async target: `AsyncLazy<T>` with `get(): Promise<T>`
- class whose dependency key may select sync or async: `Lazy<T> | AsyncLazy<T>`

The example below creates a synchronous companion under an explicit string or symbol key:

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock { now() { return Date.now() } }

class Audit {
  constructor(private readonly clockLazy: Lazy<Clock>) {}
  record(event: string) { console.log(event, this.clockLazy.get().now()) }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  // ^ registers BOTH 'clock' (singleton) AND 'clockLazy' (Lazy<Clock>).
  //   The companion key is passed explicitly — TS infers Lazy<Clock>.
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')

c.get('audit').record('login')
```

Factories use the same companion contract:

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

Declarative async factories use a fifth argument because their dependency tuple occupies the third position:

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Promise-valued `registerFactory` keeps its synchronous graph contract:

```ts
const legacy = new Container()
  .registerFactory('db', () => connectDatabase(), 'singleton', 'dbLazy')

legacy.get('dbLazy') // Lazy<Promise<Database>>
```

**Lazy companions preserve the target's lifetime.** A singleton consumer may inject only `Lazy<singleton>` and `AsyncLazy<singleton>` companions. The compile-time filter rejects scoped, transient, mixed-lifetime, and managed-plus-unmanaged unions. With `fast: false`, runtime checks reject the same short-lived wrapper after a cast bypass. Scoped and transient consumers may use companions for any target lifetime.

```ts
new Container()
  .registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
  // @ts-expect-error — Lazy<scoped> is not singleton-safe in v4.
  .registerClass('app', AppService, ['reqLazy'], 'singleton')
```

Each wrapper captures the container that resolved it. A wrapper obtained from one child scope keeps resolving through that child after another scope exists; disposal of the captured scope makes a later `AsyncLazy.get()` return a rejected Promise. Dispose singleton and scoped targets through their owning container. A wrapper that has not started its target owns no resource.

Use [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html) when a singleton needs a dynamic per-request view. Captured-scope wrappers cannot select the current request scope. The runtime diagnostic names the transient companion key because the wrapper itself is transient.

> **Note on circular dependencies.** True mutual recursion (A's constructor needs B, B's constructor needs A) cannot be expressed in fluent registration — both sides would forward-reference each other's keys, which the type system rejects by design. Between two singletons, you can break the cycle with `Lazy<singleton>` on one side. For factory-introduced cycles the runtime detector reports them precisely; it never "breaks" cycles automatically.

## Symbol Keys

Every `register*` method also accepts a `symbol` for the key. String and symbol keys mix freely in the same container — `deps` arrays, the `lazyKey` companion, factory bodies and `Module<TRequirements, TProvides>` all accept both interchangeably. Using symbols unlocks three patterns that string keys cannot express:

- **Collision-free private DI.** A local `Symbol(desc)` exists only inside the module that created it. Registering under it makes the service unreachable from outside without explicitly exporting the token.
- **Cross-module sharing via `Symbol.for(name)`.** Two parts of the codebase agree on a name; `Symbol.for` returns the same token everywhere, so they share identity without importing each other.
- **Type-level branding.** A symbol token is nominally typed: two structurally identical services keyed by distinct symbols are no longer interchangeable in `DepsOf`. (For maximum nominal precision, annotate as `unique symbol` — but ordinary `const` declarations are enough for runtime identity and most type checking.)

```ts
import { Container } from '@inferdi/inferdi'

const DB    = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  // String key for plain config, symbol keys for the privately-shared services.
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB,    PgPool,    ['config'])
  .registerClass(CACHE, RedisPool, [])
  // `deps` mixes string and symbol keys in a single tuple — both are typed.
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)     // typed as PgPool
c.get(CACHE)  // typed as RedisPool
c.get('repo') // typed as UserRepo
```

Lazy companions follow the same rule — pass any string or symbol as `lazyKey` to expose the `Lazy<V>` wrapper. The companion key lifetime does not have to match the primary key lifetime:

```ts
const DB       = Symbol('db')
const DB_LAZY  = Symbol('dbLazy')

const c = new Container()
  // Symbol primary, symbol companion.
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)
  // String primary, string companion.
  .registerClass('clock', Clock, [], 'transient', 'clockLazy')
  // String primary, symbol companion (or vice versa) — also accepted.
  .registerClass('cache', RedisPool, [], 'singleton', Symbol('cacheLazy'))

c.get(DB_LAZY).get()      // typed as Lazy<PgPool>
c.get('clockLazy').get()  // typed as Lazy<Clock>
```

> **⚡ Performance tip — symbol keys on the hottest paths.** The internal
> registry is a `Map` keyed by your raw keys. Symbols compare by identity (a
> pointer check), while string keys go through hashing and, on a hash collision,
> character comparison. In almost every app the difference is unmeasurable —
> reach for symbols here only when a profiler points at a tight resolve loop, and
> benchmark the swap before relying on it.

## Modularity with `.use()`

For large applications, split your container setup into chunks via `.use()`. The idiomatic shape is an **inline lambda** — TypeScript infers the lambda's container type from the call site, so `c.registerXyz(...)` typechecks against the full accumulated key set without you re-listing prior keys. Inside the lambda you can also read previously registered values to make dynamic registration decisions:

```ts
import { Container } from '@inferdi/inferdi'

const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

Named modules use `Module<TRequirements, TProvides>`. The actual graph may contain additional registrations, but every requirement must match by service type, exact lifetime, sync/async mode, lazy mode, and scope-input readiness. The callback sees only `Container<TRequirements>`; the result preserves the complete actual graph and adds `TProvides`. Outputs may not collide with any actual key. Wrap flat singleton requirements in `SpecMap<...>` or use explicit `Spec` entries for mixed lifetimes:

```ts
import { Container, type Module, type Spec, type SpecMap } from '@inferdi/inferdi'

// Requires config, while the actual graph may contain other registrations.
const fixtureMailer: Module<SpecMap<{ config: { env: string } }>, SpecMap<{ mailer: Mailer }>> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

// Mixed-lifetime requirements: scoped `req` and singleton `cfg`.
type ReqHandlerIn = SpecMap<{ cfg: Config }> & { req: Spec<ReqCtx, 'scoped'> }
const reqHandler: Module<ReqHandlerIn, SpecMap<{ handler: Handler }>> = (c) =>
  c.registerClass('handler', Handler, ['cfg', 'req'])

const fixture = new Container()
  .registerValue('config', { env: 'test' })
  .use(fixtureMailer)
```

The compiler reports stable diagnostics for missing requirements, incompatible requirements, and output collisions. Scope-input requirements refine exactly as equivalent inline registrations when the actual graph has already supplied those inputs.

## Querying with `.has()`

`.has(key)` is a type-guard predicate: it returns `true` if `key` is registered on this container or any ancestor scope, and narrows the key to `keyof T` inside the truthy branch. The walk-up matches resolution, but `.has()` is a pure observer — it never resolves the value and never throws. On a disposed container, `.has()` returns `false` for every key.

```ts
declare const c: Container<{ logger: Spec<Logger> }>

if (c.has('logger')) {
  c.get('logger').log('ok')   // narrowed to Logger inside the branch
}

c.has('missing')   // false — does not throw
```

For a dynamic graph that may include async keys, use `getAsync()` after the guard. `.has()` does not prove that a key is synchronous and does not provide missing scope inputs; `get()` still requires additional narrowing to a ready sync key.

## Test Overrides

In tests you almost always need to swap a real dependency for a mock. The overlap guard on every `register*` method prevents any key type that may name an existing registration. This includes a union with one occupied member and a broad `string` or `symbol` that may resolve to an occupied key. Broad and union keys remain valid when their possible values do not overlap the graph. Use `.override(key, value)` for intentional replacement:

```ts
import { Container } from '@inferdi/inferdi'

function buildAppContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('userRepo', UserRepo, ['logger', 'db'])
}

// Test setup
const c = buildAppContainer()
  .override('logger', new MockLogger())   // ✅ TS verifies MockLogger is assignable to ConsoleLogger
  .override('db', mockDb)                 // same
// .override('missing', x)                ❌ TS error — key not registered
// .override('logger', 42)                ❌ TS error — number is not assignable to ConsoleLogger

c.get('userRepo').save(/* ... */)         // uses the mocks
```

**Override guarantees:**

- 🛡️ **Type-safe.** `value` must satisfy the originally registered type (`T[K]`). Mocks have to structurally implement the production interface — no `as any` escape hatch.
- ⛔ **Local-cache guard.** `.override()` throws if the key already has a value in this container's local cache. This catches locally resolved singleton/scoped registrations, `registerValue`, and repeated overrides. With `fast: false`, transient resolutions and ancestor-owned values resolved through a child are not cached locally, so the guard cannot observe them. Fast scopes may mirror delegated singletons locally and do not support mutation after activation. Always override **before** resolving the dependency graph; otherwise existing consumers can retain the original value while later resolves see the mock.
- 💥 **Disposed-container guard.** Throws on a disposed container.
- 🧹 **Externally owned.** Like `registerValue`, the override value is **not** added to the container's disposal queue. The test suite owns the mock's lifetime.
- 🔒 **Scope-local.** `.override()` mutates only the container it was called on. `root.createScope().override('db', mock)` leaves `root` untouched and is invisible to sibling scopes; a parent-level override propagates via the standard parent walk-up.

> ⚠️ **Production code should not call `.override()`.** It exists for tests and hot-reload-style fixtures. Use `.use()` for conditional registration in production builders.

## Typing a Built Container — `Container.Resolve<C>`

Once you build your container fluently, the resulting type captures every registered key. You usually want to factor this into a builder function and reuse the inferred map elsewhere (DTOs, factories, tests). Use `Container.Resolve<typeof builder>` to extract it:

```ts
import { Container } from '@inferdi/inferdi'

function buildContainer(config: AppConfig) {
  return new Container()
    .registerValue('config', config)
    .registerClass('logger', Logger, [])
    .registerClass('db', Db, ['config'])
    .registerClass('userRepo', UserRepo, ['logger', 'db'])
}

// Extract the full DI map type from the builder's return:
type AppContainer = ReturnType<typeof buildContainer>
type AppDeps      = Container.Resolve<AppContainer>
//   ^? { config: AppConfig; logger: Logger; db: Db; userRepo: UserRepo }

// Now you can type code that consumes the container without re-listing keys:
function buildHandler(c: AppContainer) {
  return async (req: Request) => c.get('userRepo').find(req.userId)
}
```

This pattern keeps registration (the builder) and consumption (handlers, tests) in separate places without duplicating type information.

## Provider Maps — `Container.Providers<C>`

For tests that build a mock fixture as a record of zero-arg factories, `Container.Providers<C>` flattens the built container into `{ [K in keyof T]: () => T[K] }`. The compiler then enforces that every registered key is covered with a thunk returning the right shape — extraneous keys and missing keys are both surfaced as type errors.

```ts
import { Container } from '@inferdi/inferdi'

function buildContainer() {
  return new Container()
    .registerClass('logger', Logger, [])
    .registerClass('clock', Clock, [], 'transient', 'clockLazy')
}

const mocks: Container.Providers<ReturnType<typeof buildContainer>> = {
  logger:    () => mockLogger,
  clock:     () => mockClock,
  clockLazy: () => ({ get: () => mockClock }),   // Lazy<Clock> shape
}
```

The lazy companion's entry returns the `Lazy<V>` wrapper (`{ get: () => V }`), not the unwrapped value — this matches the container's actual registration shape.

## Errors

The container throws structured errors with actionable messages — surface these in your test assertions so registration mistakes show up early:

| Trigger | Message |
|---|---|
| `.get(k)` on unregistered key | `Key "k" not found` |
| Root resolves a scoped key with `fast: false` | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| Singleton depends on scoped/transient | `Singleton "x" cannot depend on scoped "y". Use Lazy<T> ...` |
| Resolution loop (synchronous) | `Circular dependency detected: a -> b -> a. Consider breaking the cycle with Lazy<T> ...` |
| Resolution loop (declarative async graph) | Rejected with the same synchronous circular-dependency diagnostic during preflight. |
| Resolution loop after `await` in legacy/captured code | _Not detected._ May produce a Promise deadlock — see [Async Factories](#async-factories). |
| Use of disposed container | `Container is disposed (key: "k")` |
| Resolving across a disposed ancestor | `Ancestor container is disposed (key: "k")` |
| `createScope()` after dispose | `Cannot create scope from a disposed container` |
| `register*()` after dispose | `Cannot register on a disposed container (key: "k")` |
| Sync `[Symbol.dispose]` over an async resource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. Use \`await using\` / container.dispose() for async teardown.` |
| Sync `[Symbol.dispose]` over cached async initialization | `Sync [Symbol.dispose] called on a container that cached a Promise from an async factory. Use \`await using\` / container.dispose() for async teardown.` |
| `.override()` after first resolve | `Cannot override "k" because it has already been resolved. Overrides must be applied before any .get() calls...` |
| `.override()` on a disposed container | `Cannot override on a disposed container (key: "k")` |

## Migration

Upgrading from a previous major version? See **[MIGRATION.md](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md)** for the full per-version checklist (breaking changes, one-line rewrites, and what's new).

## API Summary

```ts
import {
  Container,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type DependenciesMap,
  type Lifetime,
  type Spec,
  type SpecMap,
  type ContainerOptions,
} from '@inferdi/inferdi'

type NoKeyOverlap<
  Candidate extends PropertyKey,
  Existing extends PropertyKey
> = [Candidate & Existing] extends [never] ? unknown : never

class Container<T extends DependenciesMap = Record<never, never>> {
  // Public — use this to construct a root container.
  constructor(options?: ContainerOptions)

  // Registration — each call returns a Container widened by Record<K, Spec<V, L>>.
  // The `deps` tuple and the factory `c` are narrowed via `AllowedDeps<T, L>`:
  // for a singleton target, only singleton entries and managed Lazy/AsyncLazy
  // companions whose target lifetime is exactly 'singleton' are visible.
  registerClass<
    K extends string | symbol,
    V,
    A extends readonly unknown[],
  >(
    key: K & NoKeyOverlap<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<AllowedDeps<T, 'singleton'>, A>,
    lifetime?: undefined,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  registerClass<K extends string | symbol, V, A, L extends Lifetime>(
    key: K & NoKeyOverlap<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<AllowedDeps<T, L>, A>,
    lifetime: L,
  ): Container<T & Record<K, Spec<V, L>>>

  // Both registerClass overloads also have a five-argument lazyKey form. It uses
  // LK & NoKeyOverlap<LK, keyof T | K>; the companion is LazySpec,
  // AsyncLazySpec, or their union based on ClassSpec.

  registerFactory<
    K extends string | symbol,
    V,
  >(
    key: K & NoKeyOverlap<K, keyof T>,
    factory: (c: Container<AllowedDeps<T, 'singleton'>>) => V,
    lifetime?: undefined,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  registerFactory<K extends string | symbol, V, L extends Lifetime>(
    key: K & NoKeyOverlap<K, keyof T>,
    factory: (c: Container<AllowedDeps<T, L>>) => V,
    lifetime: L,
  ): Container<T & Record<K, Spec<V, L>>>

  // Deps-aware families place deps after factory. A lazy companion requires
  // an explicit lifetime: registerFactory(key, factory, deps?, lifetime, lazyKey).

  registerAsyncFactory<
    K extends string | symbol,
    A extends readonly unknown[],
    R,
  >(
    key: K & NoKeyOverlap<K, keyof T>,
    factory: (...args: A) => R,
    deps: DepsOf<AllowedDeps<T, 'singleton'>, A>,
    lifetime?: undefined
  ): Container<T & Record<K, AsyncSpec<Awaited<R>, 'singleton'>>>

  registerAsyncFactory<
    K extends string | symbol,
    A extends readonly unknown[],
    R,
    L extends Lifetime,
  >(
    key: K & NoKeyOverlap<K, keyof T>,
    factory: (...args: A) => R,
    deps: DepsOf<AllowedDeps<T, L>, A>,
    lifetime: L
  ): Container<T & Record<K, AsyncSpec<Awaited<R>, L>>>

  // Both registerAsyncFactory overloads also have a five-argument lazyKey form.
  // The return type adds Record<LK, AsyncLazySpec<Awaited<R>, L>>.

  registerValue<K extends string | symbol, V>(
    key: K & NoKeyOverlap<K, keyof T>,
    value: V,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  // Test-only: replace an existing registration with a static value.
  // Walks the parent chain to read the original lifetime and preserves it locally,
  // so `root.createScope().override('db', mock)` keeps the scoped semantics.
  // Throws if the container is disposed, the key was already resolved, or
  // the key is not registered anywhere in the chain.
  override<K extends keyof T>(key: K, value: T[K]['type']): this

  use<R extends DependenciesMap>(fn: (c: Container<T>) => Container<T & R>): Container<T & R>
  use<Requirements extends DependenciesMap, Provides extends DependenciesMap>(
    fn: Module<Requirements, Provides>
  ): Container<T & Provides>

  // Scopes & resolution
  createScope(): Container<T>
  // Sync-ready keys only. With fast: false, scoped keys require a child scope.
  get<K extends keyof T>(key: K): T[K]['type']
  // Ready sync and declarative async keys; synchronous errors become rejections.
  getAsync<K extends keyof T>(key: K): Promise<Awaited<T[K]['type']>>
  // Type-guard: narrows the key to keyof T inside the truthy branch.
  // Returns false on a disposed container (regs is empty).
  has<K extends string | symbol>(key: K): key is K & keyof T

  // Lifecycle
  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}

namespace Container {
  // Ready keys accepted by getAsync(), including declarative async entries.
  type ReadyKeys<C>

  // Ready synchronous keys accepted by get().
  type SyncReadyKeys<C>

  // Extract the registered map from a built container as a **flat**
  // `{ key: ServiceType }` view — the Spec wrapper is unwrapped, so consumers
  // see the same shape they always did pre-v3.
  type Resolve<C> = C extends Container<infer U>
    ? { [K in keyof U]: U[K]['type'] }
    : never

  // Same as Resolve, but distributively unwraps managed LazySpec and
  // AsyncLazySpec companion entries. Ordinary wrapper services remain unchanged.
  type ResolveUnwrapped<C> = C extends Container<infer U>
    ? { [K in keyof U]: UnwrapSpec<U[K]> }
    : never

  // Look up a single key's unwrapped service type.
  // For a Lazy<T>-registered key returns T (no wrapper); useful when overriding
  // a Lazy<T> companion in tests:
  //   const mock: Container.UnwrappedValue<typeof c, 'clockLazy'> = { now: () => 0 }
  //   c.override('clockLazy', { get: () => mock })
  type UnwrappedValue<C, K extends keyof Resolve<C>> = ResolveUnwrapped<C>[K]

  // Flatten a built container into a record of zero-arg provider thunks,
  // one per registered key. Lazy and AsyncLazy companions keep the wrapper shape.
  // Useful for typing mock-factory fixtures in tests.
  type Providers<C> = C extends Container<infer U>
    ? { [K in keyof U]: () => U[K]['type'] }
    : never
}

// Public types
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'

// Construction options.
interface ContainerOptions {
  readonly fast?: boolean
}

// Single registry entry — service type V plus its lifetime. `interface`
// (not type alias) so TS caches instantiations across long fluent chains.
interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

// Both managed companion specs also carry a private type-only mode brand.
// Use these named exports in explicit Container and Module shapes.
interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

// Brand a flat `{ key: ServiceType }` map as a SpecMap (defaults to singleton).
type SpecMap<M, L extends Lifetime = 'singleton'> =
  { [P in keyof M]: Spec<M[P], L> }

type DependenciesMap = Record<string | symbol, Spec<unknown, Lifetime>>

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

## Repository Structure

This repository is a pnpm monorepo. The published packages:

| Package | JSR | npm | Description |
| --- | --- | --- | --- |
| [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) | [JSR](https://jsr.io/@inferdi/inferdi) | [npm](https://www.npmjs.com/package/@inferdi/inferdi) | Core DI container — zero-dependency, decorator-free, strongly typed |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | [JSR](https://jsr.io/@inferdi/fastify) | [npm](https://www.npmjs.com/package/@inferdi/fastify) | Fastify v5 request-scope adapter |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | [JSR](https://jsr.io/@inferdi/hono) | [npm](https://www.npmjs.com/package/@inferdi/hono) | Hono request-scope middleware |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | [JSR](https://jsr.io/@inferdi/koa) | [npm](https://www.npmjs.com/package/@inferdi/koa) | Koa v3 request-scope middleware |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | [JSR](https://jsr.io/@inferdi/express) | [npm](https://www.npmjs.com/package/@inferdi/express) | Express 5 request-scope middleware |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | [JSR](https://jsr.io/@inferdi/elysia) | [npm](https://www.npmjs.com/package/@inferdi/elysia) | Elysia request-scope plugin |

Repository-only workspaces (not published):

- [`benchmarks/`](https://github.com/inferdi/inferdi/tree/main/benchmarks) — private, self-contained comparative benchmarks against InversifyJS, Awilix, TSyringe, TypeDI, and Typed Inject. Isolated workspace with its own lockfile.
- [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples) — GitHub-only reference snippets for framework and runtime integrations.

## License

MIT — see [LICENSE](https://github.com/inferdi/inferdi/blob/main/LICENSE).
