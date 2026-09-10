# @inferdi/fastify

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**Typed services. Request scopes. Fastify speed.**

Bring InferDI’s compiler-checked graph to Fastify 5 with scopes that follow the request lifecycle.

[![npm version](https://img.shields.io/npm/v/@inferdi/fastify)](https://www.npmjs.com/package/@inferdi/fastify)
[![JSR](https://jsr.io/badges/@inferdi/fastify)](https://jsr.io/@inferdi/fastify)
[![License](https://img.shields.io/npm/l/@inferdi/fastify.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/adapters/fastify) · [InferDI](https://inferdi.com) · [All integrations](https://inferdi.com/adapters/)

**Read the docs in your language**

[English](https://inferdi.com/adapters/fastify) · [中文](https://inferdi.com/zh/adapters/fastify) · [日本語](https://inferdi.com/ja/adapters/fastify) · [Español](https://inferdi.com/es/adapters/fastify) · [Русский](https://inferdi.com/ru/adapters/fastify) · [Deutsch](https://inferdi.com/de/adapters/fastify) · [Français](https://inferdi.com/fr/adapters/fastify)

</div>

InferDI is a TypeScript dependency injection container that checks how your services fit together at compile time. `@inferdi/fastify` brings that graph to Fastify 5: each request gets its own scope on `request.di`, with the root on `app.di`. Keep request data isolated and let the plugin handle cleanup after the response.

## The graph is the type. Built for speed.

**Catch broken wiring while you code.** Each registration records service types, dependencies and lifetimes in the container’s type. TypeScript rejects missing keys, duplicate registrations, incompatible constructor arguments and declared singleton dependencies on scoped services. Async dependencies and required scope inputs also determine which services are ready to resolve. Refactor a constructor and your editor points to affected registrations.

**Keep your business logic yours.** Choose implementations explicitly where you assemble the application. Services receive ordinary constructor or function arguments, with no InferDI imports, decorators or metadata. You can test them directly and keep business policy independent of the framework and container. Reusable modules, lazy resolution and typed overrides support composition as the application grows.

**Fast resolution, compact core.** InferDI core has zero runtime dependencies, an enforced budget under 3 KiB gzip and a single `Map.get()` fast path for cached services. In the [recorded core cached-singleton benchmark](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json), default InferDI is **1.76× to 13.05× faster** than the compared containers, with runtime checks enabled. These are core operation measurements; adapter overhead and application performance depend on the workload. [Explore the benchmarks](https://inferdi.com/guide/performance).

Static checks cover the declared graph within TypeScript’s limits; casts can bypass them and structurally identical dependency types remain interchangeable.

## Why use it with Fastify

- **Your service types reach the handler:** declaration merging preserves your concrete root and request container types.
- **One scope per request:** create and initialize services before handlers run, with sync or async setup hooks.
- **Cleanup follows Fastify:** scopes stay available to error handlers and dispose after the response; client aborts have a dedicated cleanup path.
- **Root-only mode stays lean:** expose `app.di` without request decoration or request lifecycle hooks when you do not need scopes.
- **Control ownership:** customize disposal, hand a scope to longer-lived work, or opt into root disposal when Fastify closes.

## Lifecycle essentials

Setup runs in `onRequest`, before body parsing. Inline setup hooks passed through `app.register` need explicit scope annotations; handler types come from your declaration merging. The guide covers both patterns.

Request scopes dispose in `onResponse`, or `onRequestAbort` after a client disconnects. Setup failure releases the unfinished scope and surfaces the original error. Cleanup failures go to `onDisposeError` or Fastify’s logger.

`skipInferdiDispose(request)` transfers cleanup to your application on successful requests; request errors override the skip. After scope exposure, client aborts honor manual ownership. Setting `autoDispose` to `false`, or returning `false` from its predicate, also transfers ownership. Root disposal is opt-in through `disposeRootOnClose`.

## Get started

Fastify 5 · Node.js 20+ · TypeScript 5.2+ · InferDI 6

Available on [npm](https://www.npmjs.com/package/@inferdi/fastify) and [JSR](https://jsr.io/@inferdi/fastify), alongside [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi).

**[Read the Fastify guide →](https://inferdi.com/adapters/fastify)**

Installation, concrete request types, hook annotations, root-only mode and lifecycle options are covered in the guide.

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)

With `autoDispose: false` or a predicate returning `false`, `request.di` remains available after response or abort cleanup so application code can dispose the retained scope.
