# @inferdi/koa

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**Typed scopes that stay with the response.**

Bring compiler-checked DI to Koa, with cleanup that waits for your streams.

[![npm version](https://img.shields.io/npm/v/@inferdi/koa)](https://www.npmjs.com/package/@inferdi/koa)
[![JSR](https://jsr.io/badges/@inferdi/koa)](https://jsr.io/@inferdi/koa)
[![License](https://img.shields.io/npm/l/@inferdi/koa.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/adapters/koa) · [InferDI](https://inferdi.com) · [All integrations](https://inferdi.com/adapters/)

**Read the docs in your language**

[English](https://inferdi.com/adapters/koa) · [中文](https://inferdi.com/zh/adapters/koa) · [日本語](https://inferdi.com/ja/adapters/koa) · [Español](https://inferdi.com/es/adapters/koa) · [Русский](https://inferdi.com/ru/adapters/koa) · [Deutsch](https://inferdi.com/de/adapters/koa) · [Français](https://inferdi.com/fr/adapters/koa)

</div>

InferDI is a TypeScript dependency injection container that checks how your services fit together at compile time. `@inferdi/koa` brings that graph to Koa 3 through ordinary middleware. Each request gets a scope on `ctx.state.di`; services stay alive until the underlying response finishes or the connection closes.

## The graph is the type. Built for speed.

**Catch broken wiring while you code.** Each registration records service types, dependencies and lifetimes in the container’s type. TypeScript rejects missing keys, duplicate registrations, incompatible constructor arguments and declared singleton dependencies on scoped services. Async dependencies and required scope inputs also determine which services are ready to resolve. Refactor a constructor and your editor points to affected registrations.

**Keep your business logic yours.** Choose implementations explicitly where you assemble the application. Services receive ordinary constructor or function arguments, with no InferDI imports, decorators or metadata. You can test them directly and keep business policy independent of the framework and container. Reusable modules, lazy resolution and typed overrides support composition as the application grows.

**Fast resolution, compact core.** InferDI core has zero runtime dependencies, an enforced budget under 3 KiB gzip and a single `Map.get()` fast path for cached services. In the [recorded core cached-singleton benchmark](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json), default InferDI is **1.76× to 13.05× faster** than the compared containers, with runtime checks enabled. These are core operation measurements; adapter overhead and application performance depend on the workload. [Explore the benchmarks](https://inferdi.com/guide/performance).

Static checks cover the declared graph within TypeScript’s limits; casts can bypass them and structurally identical dependency types remain interchangeable.

## Why use it with Koa

- **Concrete types in Koa state:** use declaration merging or local Koa generics to keep your service types available in middleware.
- **Streaming-aware cleanup:** normal Node stream bodies keep their scope until response completion, with no special skip needed.
- **State that fits your app:** choose `di` or a custom state key.
- **Request-aware setup:** sync or async hooks create and prepare the scope before downstream middleware runs.
- **Flexible ownership:** customize cleanup and error reporting, or take over disposal for work that outlives the response.

## Lifecycle essentials

Cleanup follows the Node response’s `finish` or `close` event. This also applies when you write to `ctx.res` manually: your application must eventually end or close the response.

`skipInferdiDispose(ctx)` transfers disposal to your application for work beyond the response. A downstream error overrides that skip. Setting `autoDispose` to `false`, or returning `false` from its predicate, keeps cleanup application-owned. The middleware never disposes the root container.

Setup failure releases the unfinished scope and rethrows the original error. Cleanup failures go to `onDisposeError` or Koa’s application error event, preserving the response.

## Get started

Koa 3 · Node.js 18+ · TypeScript 5.2+ · InferDI 6. TypeScript applications also need `@types/koa`.

Available on [npm](https://www.npmjs.com/package/@inferdi/koa) and [JSR](https://jsr.io/@inferdi/koa), alongside [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi).

**[Read the Koa guide →](https://inferdi.com/adapters/koa)**

Installation, concrete state types, custom keys, lifecycle options and streaming are covered in the guide.

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)

A single `skipInferdiDispose(ctx)` call applies to every InferDI middleware instance on that request, including instances with different state keys. Application code must dispose every retained scope.
