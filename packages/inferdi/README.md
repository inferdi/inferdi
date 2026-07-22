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
    - [Async Factories](#async-factories)
  - [Strict Lifetime Guards](#strict-lifetime-guards)
    - [Fast Mode: `new Container({ strict: false })`](#fast-mode-new-container-strict-false)
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
  A singleton cannot depend on a scoped or transient service. TypeScript rejects that graph, and strict mode catches cast-based or dynamic-key bypasses at runtime.

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

`.get(key)` is the only way to resolve a registration: it is fully typed (`K extends keyof T`), throws synchronously on a missing key, and stays out of the way at runtime — there is no Proxy overhead.

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

Factories follow the same lifetime rules as classes — pass the kind as the third argument: `registerFactory('cache', factory, 'scoped')`. An optional fourth `lazyKey` registers the same lifetime-preserving `Lazy<V>` companion as `registerClass`: `registerFactory('cache', factory, 'scoped', 'cacheLazy')`. To use the default singleton lifetime with a companion, pass `undefined` as the kind. Inside a **singleton** factory the container parameter is narrowed via `AllowedDeps<T, 'singleton'>`, so `c.get(...)` will only autocomplete (and accept) singleton keys and `Lazy<singleton>` companions. A `scoped`/`transient` key (or `Lazy<scoped>` / `Lazy<transient>`) inside a singleton factory body is a TypeScript error, not a runtime exception.

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

Treat the dependency tuple passed to `registerClass` as immutable after registration. The optimized constructor paths retain its registration-time contents without adding a defensive copy.

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

The container probes each owned instance in order: `Symbol.asyncDispose` → `Symbol.dispose` → plain `.dispose()`. If multiple disposers throw, all errors are collected into a single `AggregateError` so one failing resource never leaves the rest unclosed.

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

Factories can be async without any special API. The factory's `Promise` is cached verbatim, so every concurrent `c.get(key)` sees the same in-flight Promise — initialization runs exactly once even under request bursts (Edge functions, serverless cold starts). Callers `await` the value at the use site. On `await container.dispose()` the container unwraps the Promise and probes the resolved instance for the disposer protocol; rejections fold into the same `AggregateError` as any other teardown error. Sync `using` on a container that cached a Promise is a misuse — use `await using` / `await container.dispose()`.

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

// Concurrent callers share the same in-flight Promise — no race, one connect.
const [a, b] = await Promise.all([c.get('db'), c.get('db')])

await c.dispose() // unwraps the cached Promise and closes the pool
```

> ⚠️ **Cycles between async factories are not detected and produce a silent Promise deadlock.** The runtime cycle detector projects the *synchronous* call stack only — the `resolving` set is cleared by the time an `async` factory's `await` continuation runs. If two async factories depend on each other (`a` awaits `c.get('b')`, `b` awaits `c.get('a')`), each one's pending Promise gets cached during the synchronous prelude, and the resumed continuations find that cached Promise on every reentry. `await c.get('a')` then hangs forever with no error, no rejection, no diagnostic. Fixing this in the runtime would require an async-aware cycle tracker on the resolve fast-path, which is incompatible with the 1-`Map.get()` hot-path contract — so the recommendation is architectural: keep one side synchronous (split the cycle, hoist the shared init), or break it with a `Lazy<singleton>` companion if both sides are singletons. If you suspect a cycle in async code, wrap the top-level `await c.get(...)` with a watchdog timeout during development.

> The same synchronous boundary applies to the strict runtime lifetime guard. `AllowedDeps` still rejects scoped/transient reads in a typed singleton factory, but an `as`-cast or captured outer container used after `await` is outside the runtime `singletonStack`. Keep dependency reads in the synchronous factory prelude; code that deliberately bypasses the type system after an async boundary is not runtime-guarded.

## Strict Lifetime Guards

| Kind        | Created                                         | Cached on                | Disposed by container |
| ----------- | ----------------------------------------------- | ------------------------ | --------------------- |
| `singleton` | once per container that owns the registration | the owner container      | yes |
| `scoped`    | once per scope                                  | the scope                | yes |
| `transient` | every time requested                            | never                    | no (caller owns it)   |

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

### Fast Mode: `new Container({ strict: false })`

If you fully trust the compile-time guard and want maximum throughput on the
hot path, opt out of the runtime cycle / lifetime checks:

```ts
const root = new Container({ strict: false })
  .registerClass('logger', Logger, [])
```

In `strict: false` mode `get()` drops the cycle bookkeeping (`resolving`
push/pop + `Array#includes`), the singleton-stack push/pop, and the
surrounding `try`/`finally` from the resolve path. Local transient resolves
collapse to a bare `fn(this)` call — measured ~30% faster on a flat
transient graph; cached singleton/scoped resolves are unaffected because
the cache fast-path runs upstream of any guard. The flag is inherited by
every child created via `createScope()`.

**`strict: true` is a floor under two independent problem classes — not
just "type-substitution defense".** The compile-time guard covers a strict
subset of what the runtime guard catches:

| Problem | Compile-time | Runtime (`strict: true`) |
|---|---|---|
| Singleton depends on scoped/transient directly via `deps` or the narrowed `c` parameter | ✓ | ✓ |
| Singleton depends on scoped/transient via a **captured outer container reference** inside a factory body | ✗ | ✓ |
| Singleton ↔ Singleton cycle | ✗ | ✓ |
| Transient ↔ Transient cycle | ✗ | ✓ |
| Lifetime violation introduced via an `as`-cast (`as never`, `as any`, `as Container<...>`) | ✗ | ✓ |
| Dynamic key construction (`c.get(computedKey as keyof T)`) | ✗ | ✓ |

In particular, **the type system cannot see cycles**. A `Singleton →
Singleton` cycle compiles cleanly (both ends pass the `AllowedDeps`
filter); only `strict: true` reports it as `Circular dependency detected:
a -> b -> a`, while `strict: false` lets V8 recurse until
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
  return new Logger(root.get('req'))   // 💀 leaks scoped into singleton
}, 'singleton')
```

`strict: true` catches this at runtime; `strict: false` does not.

**Use `strict: false` only when you're certain that:**

- Your graph has no cycles (including `transient ↔ transient`).
- Every factory reads dependencies **only** through its own `c` parameter —
  no captured outer container references.
- All registrations go through the fluent API without `as`-casts to bypass
  `AllowedDeps`.
- Any `Module<TIn, TOut>` declarations honestly describe their input shape.

**Recommended workflow.** Develop and test in `strict: true` (the default).
Your runtime tests transitively prove the graph is cycle-free and that no
factory leaks short-lived state through a captured closure. Only after that
audit, switch to `strict: false` for production builds where the ~30%
transient-path speed-up matters.

## Lazy Injection

`Lazy<T>` is a deferred-resolution primitive — useful when two services would otherwise have to be constructed in a precise order (or when the type system would reject a forward reference). Pass a `lazyKey` to `registerClass` or `registerFactory` and the container creates a companion `Lazy<T>` under that explicit key (string or symbol):

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

**Lazy preserves the target's lifetime; it is not a lifetime escape hatch.** A singleton consumer may inject only `Lazy<singleton>` companions. `Lazy<scoped>` and `Lazy<transient>` are rejected by the compile-time `AllowedDeps` filter inside a singleton, and the strict-mode runtime guard rejects the same shape if you bypass the type system with an `as`-cast. For scoped or transient consumers, every `Lazy<*>` variant remains legal.

```ts
new Container()
  .registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
  // @ts-expect-error — Lazy<scoped> is not singleton-safe in v4.
  .registerClass('app', AppService, ['reqLazy'], 'singleton')
```

Need a fresh per-request view of a short-lived service inside a singleton? Use [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html) — a DI container with captured scope cannot model "dynamic scope" on its own. The runtime diagnostic for a Lazy-companion leak still reads `Singleton "X" cannot depend on transient "<lazyKey>"` because the wrapper itself is transient; treat that as "this Lazy resolves a non-singleton target — not safe here".

> **Note on circular dependencies.** True mutual recursion (A's constructor needs B, B's constructor needs A) cannot be expressed in fluent registration — both sides would forward-reference each other's keys, which the type system rejects by design. Between two singletons, you can break the cycle with `Lazy<singleton>` on one side. For factory-introduced cycles the runtime detector reports them precisely; it never "breaks" cycles automatically.

## Symbol Keys

Every `register*` method also accepts a `symbol` for the key. String and symbol keys mix freely in the same container — `deps` arrays, the `lazyKey` companion, factory bodies and `Module<TIn, TOut>` all accept both interchangeably. Using symbols unlocks three patterns that string keys cannot express:

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

Lazy companions follow the same rule — pass any string or symbol as `lazyKey` to expose the `Lazy<V>` wrapper. The companion key kind does not have to match the primary key kind:

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

For named, **fixed-shape** module builders (e.g., test fixtures that always start from a specific base), use the exported `Module<TIn, TOut>` type — `TIn` must match the container's T exactly at the `.use()` call site. Because v3 carries lifetime kind alongside each entry, wrap flat `{ key: ServiceType }` shapes in `SpecMap<...>` (defaults every entry to singleton) or write `Spec<V, 'scoped' | 'transient'>` for mixed-kind modules:

```ts
import { Container, type Module, type Spec, type SpecMap } from '@inferdi/inferdi'

// Always invoked on a container whose T is exactly { config: { env: string } } (singleton).
const fixtureMailer: Module<SpecMap<{ config: { env: string } }>, SpecMap<{ mailer: Mailer }>> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

// Mixed-kind: TIn requires a scoped `req` and a singleton `cfg`.
type ReqHandlerIn = SpecMap<{ cfg: Config }> & { req: Spec<ReqCtx, 'scoped'> }
const reqHandler: Module<ReqHandlerIn, SpecMap<{ handler: Handler }>> = (c) =>
  c.registerClass('handler', Handler, ['cfg', 'req'])

const fixture = new Container()
  .registerValue('config', { env: 'test' })
  .use(fixtureMailer)
```

> **Why no portable generic modules?** A function like `<T>(c: Container<T>) => c.registerClass('db', ...)` cannot type-check inside the body — `keyof T` collapses to `string` from the `DependenciesMap` upper bound and `Exclude<'db', string>` becomes `never`, blocking the call. This is the cost of the compile-time uniqueness guarantee on registration. Use inline lambdas for one-shot grouping; use `Module<TIn, TOut>` when input shape is known.

## Querying with `.has()`

`.has(key)` is a type-guard predicate: it returns `true` if `key` is registered on this container or any ancestor scope, and narrows the key to `keyof T` inside the truthy branch. The walk-up matches `.get()` exactly, but `.has()` is a pure observer — it never resolves the value and never throws. On a disposed container, `.has()` returns `false` for every key (the container's `regs` map is cleared by `dispose()`, so this is the literal truth).

```ts
declare const c: Container<{ logger: Spec<Logger> }>

if (c.has('logger')) {
  c.get('logger').log('ok')   // narrowed to Logger inside the branch
}

c.has('missing')   // false — does not throw
```

For statically known keys, you don't need `.has()` — TypeScript already rejects unknown keys at compile time, so `.get()` is the direct path. Reach for `.has()` when the key is genuinely dynamic (e.g., constructed from runtime input) and you need a safe probe.

## Test Overrides

In tests you almost always need to swap a real dependency for a mock. The `Exclude<K, keyof T>` guard on every `register*` method intentionally prevents re-registering a key in production — but in tests it gets in the way. Use `.override(key, value)`:

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

**Strict guarantees:**

- 🛡️ **Type-safe.** `value` must satisfy the originally registered type (`T[K]`). Mocks have to structurally implement the production interface — no `as any` escape hatch.
- ⛔ **Local-cache guard.** `.override()` throws if the key already has a value in this container's local cache. This catches locally resolved singleton/scoped registrations, `registerValue`, and repeated overrides. Transient resolutions and ancestor-owned values resolved through a child are not cached locally, so the guard cannot observe them. Always override **before** resolving the dependency graph; otherwise existing consumers can retain the original value while later resolves see the mock.
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
| Singleton depends on scoped/transient | `Singleton "x" cannot depend on scoped "y". Use Lazy<T> ...` |
| Resolution loop (synchronous) | `Circular dependency detected: a -> b -> a. Consider breaking the cycle with Lazy<T> ...` |
| Resolution loop (between async factories) | _Not detected._ Produces a silent Promise deadlock — see the warning under [Async Factories](#async-factories). |
| Use of disposed container | `Container is disposed (key: "k")` |
| Resolving across a disposed ancestor | `Ancestor container is disposed (key: "k")` |
| `createScope()` after dispose | `Cannot create scope from a disposed container` |
| `register*()` after dispose | `Cannot register on a disposed container (key: "k")` |
| Sync `[Symbol.dispose]` over an async resource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. Use \`await using\` / container.dispose() for async teardown.` |
| `.override()` after first resolve | `Cannot override "k" because it has already been resolved. Overrides must be applied before any .get() calls...` |
| `.override()` on a disposed container | `Cannot override on a disposed container (key: "k")` |

## Migration

Upgrading from a previous major version? See **[MIGRATION.md](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md)** for the full per-version checklist (breaking changes, one-line rewrites, and what's new).

## API Summary

```ts
import {
  Container,
  type Lazy,
  type LazySpec,
  type Module,
  type DependenciesMap,
  type RegistrationKind,
  type Spec,
  type SpecMap,
  type ContainerOptions,
} from '@inferdi/inferdi'

class Container<T extends DependenciesMap = Record<never, never>> {
  // Public — use this to construct a root container.
  constructor(options?: ContainerOptions)
  // Internal overload used by createScope() to wire the parent chain.
  constructor(parent: Container<T>)

  // Registration — each call returns a Container widened by Record<K, Spec<V, Kind>>.
  // The `deps` tuple and the factory `c` are narrowed via `AllowedDeps<T, Kind>`:
  // for a singleton target, only singleton entries and `LazySpec<*, 'singleton'>`
  // companions are visible.
  registerClass<
    K extends string | symbol,
    V,
    A extends readonly unknown[],
  >(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<AllowedDeps<T, 'singleton'>, A>,
    kind?: undefined,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  registerClass<K, V, A, Kind extends RegistrationKind>(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<AllowedDeps<T, Kind>, A>,
    kind: Kind,
  ): Container<T & Record<K, Spec<V, Kind>>>

  // Both registerClass overloads also have a five-argument lazyKey form. Passing undefined
  // as kind produces Spec<V, 'singleton'> and LazySpec<V, 'singleton'>.

  registerFactory<
    K extends string | symbol,
    V,
  >(
    key: Exclude<K, keyof T>,
    factory: (c: Container<AllowedDeps<T, 'singleton'>>) => V,
    kind?: undefined,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  registerFactory<K, V, Kind extends RegistrationKind>(
    key: Exclude<K, keyof T>,
    factory: (c: Container<AllowedDeps<T, Kind>>) => V,
    kind: Kind,
  ): Container<T & Record<K, Spec<V, Kind>>>

  // Both registerFactory overloads also have a four-argument lazyKey form.
  // The return type additionally contains Record<LK, LazySpec<V, Kind>>.

  registerValue<K extends string | symbol, V>(
    key: Exclude<K, keyof T>,
    value: V,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  // Test-only: replace an existing registration with a static value.
  // Walks the parent chain to read the original kind and preserves it locally,
  // so `root.createScope().override('db', mock)` keeps the scoped semantics.
  // Throws if the container is disposed, the key was already resolved, or
  // the key is not registered anywhere in the chain.
  override<K extends keyof T>(key: K, value: T[K]['type']): this

  use<R extends DependenciesMap>(fn: Module<T, R>): Container<T & R>

  // Scopes & resolution
  createScope(): Container<T>
  get<K extends keyof T>(key: K): T[K]['type']
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
  // Extract the registered map from a built container as a **flat**
  // `{ key: ServiceType }` view — the Spec wrapper is unwrapped, so consumers
  // see the same shape they always did pre-v3.
  type Resolve<C> = C extends Container<infer U>
    ? { [K in keyof U]: U[K]['type'] }
    : never

  // Same as Resolve, but unwraps only managed LazySpec companion entries.
  // Ordinary services that happen to expose get(): T remain unchanged.
  type ResolveUnwrapped<C> = C extends Container<infer U>
    ? { [K in keyof U]: U[K] extends LazySpec<infer V, infer _Kind> ? V : U[K]['type'] }
    : never

  // Look up a single key's unwrapped service type.
  // For a Lazy<T>-registered key returns T (no wrapper); useful when overriding
  // a Lazy<T> companion in tests:
  //   const mock: Container.UnwrappedValue<typeof c, 'clockLazy'> = { now: () => 0 }
  //   c.override('clockLazy', { get: () => mock })
  type UnwrappedValue<C, K extends keyof Resolve<C>> = ResolveUnwrapped<C>[K]

  // Flatten a built container into a record of zero-arg provider thunks,
  // one per registered key. Lazy<V> companion entries keep the wrapper shape.
  // Useful for typing mock-factory fixtures in tests.
  type Providers<C> = C extends Container<infer U>
    ? { [K in keyof U]: () => U[K]['type'] }
    : never
}

// Public types
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

// Construction options.
interface ContainerOptions {
  // Toggle runtime cycle / lifetime guard inside get(). Default true.
  // Inherited by child scopes spawned via createScope().
  readonly strict?: boolean
}

// Single registry entry — service type V plus its lifetime kind. `interface`
// (not type alias) so TS caches instantiations across long fluent chains.
interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

// Brand a flat `{ key: ServiceType }` map as a SpecMap (defaults to singleton).
type SpecMap<M, K extends RegistrationKind = 'singleton'> =
  { [P in keyof M]: Spec<M[P], K> }

type DependenciesMap = Record<string | symbol, Spec<unknown, RegistrationKind>>

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
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
