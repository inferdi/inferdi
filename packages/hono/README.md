# @inferdi/hono

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**Your graph. Every request. The Hono way.**

Compiler-checked services meet Hono context, with typed scopes and explicit cleanup.

[![npm version](https://img.shields.io/npm/v/@inferdi/hono)](https://www.npmjs.com/package/@inferdi/hono)
[![JSR](https://jsr.io/badges/@inferdi/hono)](https://jsr.io/@inferdi/hono)
[![License](https://img.shields.io/npm/l/@inferdi/hono.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/adapters/hono) · [InferDI](https://inferdi.com) · [All integrations](https://inferdi.com/adapters/)

**Read the docs in your language**

[English](https://inferdi.com/adapters/hono) · [中文](https://inferdi.com/zh/adapters/hono) · [日本語](https://inferdi.com/ja/adapters/hono) · [Español](https://inferdi.com/es/adapters/hono) · [Русский](https://inferdi.com/ru/adapters/hono) · [Deutsch](https://inferdi.com/de/adapters/hono) · [Français](https://inferdi.com/fr/adapters/hono)

</div>

InferDI is a TypeScript dependency injection container that checks how your services fit together at compile time. `@inferdi/hono` brings that graph to Hono 4 through one middleware. Each request gets a scope on `c.var.di`, ready before your handler runs and released when the route pipeline completes.

## The graph is the type. Built for speed.

**Catch broken wiring while you code.** Each registration records service types, dependencies and lifetimes in the container’s type. TypeScript rejects missing keys, duplicate registrations, incompatible constructor arguments and declared singleton dependencies on scoped services. Async dependencies and required scope inputs also determine which services are ready to resolve. Refactor a constructor and your editor points to affected registrations.

**Keep your business logic yours.** Choose implementations explicitly where you assemble the application. Services receive ordinary constructor or function arguments, with no InferDI imports, decorators or metadata. You can test them directly and keep business policy independent of the framework and container. Reusable modules, lazy resolution and typed overrides support composition as the application grows.

**Fast resolution, compact core.** InferDI core has zero runtime dependencies, an enforced budget under 3 KiB gzip and a single `Map.get()` fast path for cached services. In the [recorded core cached-singleton benchmark](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json), default InferDI is **1.76× to 13.05× faster** than the compared containers, with runtime checks enabled. These are core operation measurements; adapter overhead and application performance depend on the workload. [Explore the benchmarks](https://inferdi.com/guide/performance).

Static checks cover the declared graph within TypeScript’s limits; casts can bypass them and structurally identical dependency types remain interchangeable.

## Why use it with Hono

- **Typed context access:** environment helpers preserve your exact scope type through `c.var.di` and `c.get('di')`.
- **Choose your context key:** use `di` or a custom name without global context augmentation.
- **Prepare request services:** sync or async creation and setup hooks connect request data to your graph before handlers run.
- **Keep cleanup under control:** customize disposal and error reporting, or take ownership when work outlives the route pipeline.
- **Keep Hono’s error flow:** setup failures preserve the original error; cleanup failures never replace a produced response.

## Lifecycle essentials

Automatic disposal runs after the bounded `await next()` pipeline. Hono streaming helpers can return a response before stream work finishes. If that work uses scoped services, call `skipInferdiDispose(c)` and dispose the scope when the work ends.

The skip applies to successful requests; a request failure overrides it. Setting `autoDispose` to `false`, or returning `false` from its predicate, transfers disposal to your application. The root container always remains application-owned.

If setup fails after scope creation, the middleware releases that scope and surfaces only the original setup error. Cleanup failures go to `onDisposeError` or `console.error`.

## Get started

Hono 4 · Node.js 16+ when using Node · TypeScript 5.2+ · InferDI 6

Available on [npm](https://www.npmjs.com/package/@inferdi/hono) and [JSR](https://jsr.io/@inferdi/hono), alongside [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi).

**[Read the Hono guide →](https://inferdi.com/adapters/hono)**

Installation, typed context, custom keys, lifecycle options and streaming are covered in the guide.

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)
