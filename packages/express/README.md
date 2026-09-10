# @inferdi/express

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**Your Express app. A compiler-checked service graph.**

Typed request scopes and response-aware cleanup, delivered as Express middleware.

[![npm version](https://img.shields.io/npm/v/@inferdi/express)](https://www.npmjs.com/package/@inferdi/express)
[![JSR](https://jsr.io/badges/@inferdi/express)](https://jsr.io/@inferdi/express)
[![License](https://img.shields.io/npm/l/@inferdi/express.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/adapters/express) · [InferDI](https://inferdi.com) · [All integrations](https://inferdi.com/adapters/)

**Read the docs in your language**

[English](https://inferdi.com/adapters/express) · [中文](https://inferdi.com/zh/adapters/express) · [日本語](https://inferdi.com/ja/adapters/express) · [Español](https://inferdi.com/es/adapters/express) · [Русский](https://inferdi.com/ru/adapters/express) · [Deutsch](https://inferdi.com/de/adapters/express) · [Français](https://inferdi.com/fr/adapters/express)

</div>

InferDI is a TypeScript dependency injection container that checks how your services fit together at compile time. `@inferdi/express` brings that graph to Express 5 with one scope per request on `req.di`. Keep service wiring explicit and let middleware manage request lifetimes, including responses that stream beyond the handler.

## The graph is the type. Built for speed.

**Catch broken wiring while you code.** Each registration records service types, dependencies and lifetimes in the container’s type. TypeScript rejects missing keys, duplicate registrations, incompatible constructor arguments and declared singleton dependencies on scoped services. Async dependencies and required scope inputs also determine which services are ready to resolve. Refactor a constructor and your editor points to affected registrations.

**Keep your business logic yours.** Choose implementations explicitly where you assemble the application. Services receive ordinary constructor or function arguments, with no InferDI imports, decorators or metadata. You can test them directly and keep business policy independent of the framework and container. Reusable modules, lazy resolution and typed overrides support composition as the application grows.

**Fast resolution, compact core.** InferDI core has zero runtime dependencies, an enforced budget under 3 KiB gzip and a single `Map.get()` fast path for cached services. In the [recorded core cached-singleton benchmark](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json), default InferDI is **1.76× to 13.05× faster** than the compared containers, with runtime checks enabled. These are core operation measurements; adapter overhead and application performance depend on the workload. [Explore the benchmarks](https://inferdi.com/guide/performance).

Static checks cover the declared graph within TypeScript’s limits; casts can bypass them and structurally identical dependency types remain interchangeable.

## Why use it with Express

- **Your types in every handler:** declaration merging gives `Express.Request` your concrete scope type and preserves typed service resolution.
- **Scopes ready before routing:** sync or async hooks create and initialize request services before handing control to Express.
- **Streaming-aware cleanup:** scopes dispose when the Node response finishes or closes; normal stream responses need no special skip.
- **Ownership you control:** customize disposal and error reporting, or retain a scope for work beyond the HTTP response.
- **Fits existing Express code:** integrate through middleware while keeping domain services independent of Express and InferDI.

## Lifecycle essentials

Automatic cleanup follows the response’s `finish` or `close` event. Setup failure releases the unfinished scope and passes only the original error to `next`. Cleanup failures go to `onDisposeError` or `console.error`.

`skipInferdiDispose(req)` transfers disposal to application code. **That ownership remains yours if a route later fails:** Express callback middleware cannot observe a handled downstream exception at cleanup time. Dispose retained scopes from your own completion and error paths.

Setting `autoDispose` to `false`, or returning `false` from its predicate, also transfers ownership. The middleware never disposes the root container. The guide covers streaming, background work and the handled-error limitation.

## Get started

Express 5 · Node.js 18+ · TypeScript 5.2+ · InferDI 6. TypeScript applications also need `@types/express`.

Available on [npm](https://www.npmjs.com/package/@inferdi/express) and [JSR](https://jsr.io/@inferdi/express), alongside [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi).

**[Read the Express guide →](https://inferdi.com/adapters/express)**

Installation, request declaration merging, lifecycle options, streaming and error ownership are covered in the guide.

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)

A single `skipInferdiDispose(req)` call applies to every InferDI middleware instance on that request. Application code must retain and dispose every scope; `req.di` exposes the scope assigned by the last middleware.
