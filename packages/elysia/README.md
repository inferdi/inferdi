# @inferdi/elysia

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**Validated inputs. Typed services. Ready for your routes.**

Connect InferDI’s compiler-checked graph to Elysia with request scopes and validation-aware setup.

[![npm version](https://img.shields.io/npm/v/@inferdi/elysia)](https://www.npmjs.com/package/@inferdi/elysia)
[![JSR](https://jsr.io/badges/@inferdi/elysia)](https://jsr.io/@inferdi/elysia)
[![License](https://img.shields.io/npm/l/@inferdi/elysia.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/adapters/elysia) · [InferDI](https://inferdi.com) · [All integrations](https://inferdi.com/adapters/)

**Read the docs in your language**

[English](https://inferdi.com/adapters/elysia) · [中文](https://inferdi.com/zh/adapters/elysia) · [日本語](https://inferdi.com/ja/adapters/elysia) · [Español](https://inferdi.com/es/adapters/elysia) · [Русский](https://inferdi.com/ru/adapters/elysia) · [Deutsch](https://inferdi.com/de/adapters/elysia) · [Français](https://inferdi.com/fr/adapters/elysia)

</div>

InferDI is a TypeScript dependency injection container that checks how your services fit together at compile time. `@inferdi/elysia` brings that graph to Elysia through a typed scope on context. Prepare services with validated request data and keep them available to user error handlers until response cleanup.

## The graph is the type. Built for speed.

**Catch broken wiring while you code.** Each registration records service types, dependencies and lifetimes in the container’s type. TypeScript rejects missing keys, duplicate registrations, incompatible constructor arguments and declared singleton dependencies on scoped services. Async dependencies and required scope inputs also determine which services are ready to resolve. Refactor a constructor and your editor points to affected registrations.

**Keep your business logic yours.** Choose implementations explicitly where you assemble the application. Services receive ordinary constructor or function arguments, with no InferDI imports, decorators or metadata. You can test them directly and keep business policy independent of the framework and container. Reusable modules, lazy resolution and typed overrides support composition as the application grows.

**Fast resolution, compact core.** InferDI core has zero runtime dependencies, an enforced budget under 3 KiB gzip and a single `Map.get()` fast path for cached services. In the [recorded core cached-singleton benchmark](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json), default InferDI is **1.76× to 13.05× faster** than the compared containers, with runtime checks enabled. These are core operation measurements; adapter overhead and application performance depend on the workload. [Explore the benchmarks](https://inferdi.com/guide/performance).

Static checks cover the declared graph within TypeScript’s limits; casts can bypass them and structurally identical dependency types remain interchangeable.

## Why use it with Elysia

- **Types follow the plugin chain:** routes registered after the plugin receive your concrete scope type, with a default `di` key or a custom name.
- **Setup after validation:** `setupValidatedScope` can use validated body, query, params, headers and cookies; `setupScope` handles earlier initialization.
- **Request scopes or root-only mode:** create a scope per request, or expose the root without request-scope lifecycle hooks.
- **Lean default integration:** the default lifecycle hooks avoid triggering extra request parsing.
- **Custom lifecycle control:** sync or async setup and disposal hooks, cleanup-error reporting and explicit ownership for longer-lived work.

## Lifecycle essentials

Cleanup runs from `onAfterResponse`. A streaming response can reach that hook before the stream drains. If scoped services are used after the route returns, call `skipInferdiDispose(context)` and dispose the scope when that work ends. Request errors override the skip; `autoDispose: false` or a predicate returning `false` keeps manual ownership.

**Cleanup depends on Elysia reaching its response hook.** If an abort or process exit prevents that, the adapter cannot release scope-held resources. The root container always remains application-owned.

Setup failure releases the unfinished scope and surfaces the original error. Cleanup failures go to `onDisposeError` or `console.error`; they do not replace the response or setup error.

## Get started

Elysia 1.4+ within v1 · Node.js 20+ when using Node · TypeScript 5.2+ · InferDI 6

Available on [npm](https://www.npmjs.com/package/@inferdi/elysia) and [JSR](https://jsr.io/@inferdi/elysia), alongside [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi).

**[Read the Elysia guide →](https://inferdi.com/adapters/elysia)**

Installation, typed routes, validated setup, root-only mode and streaming are covered in the guide.

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)
