# @inferdi/react

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**Your service graph, ready for React.**

Exact service types, Suspense integration and scopes that follow your UI.

[![npm version](https://img.shields.io/npm/v/@inferdi/react)](https://www.npmjs.com/package/@inferdi/react)
[![JSR](https://jsr.io/badges/@inferdi/react)](https://jsr.io/@inferdi/react)
[![License](https://img.shields.io/npm/l/@inferdi/react.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/adapters/react) · [InferDI](https://inferdi.com) · [All integrations](https://inferdi.com/adapters/)

**Read the docs in your language**

[English](https://inferdi.com/adapters/react) · [中文](https://inferdi.com/zh/adapters/react) · [日本語](https://inferdi.com/ja/adapters/react) · [Español](https://inferdi.com/es/adapters/react) · [Русский](https://inferdi.com/ru/adapters/react) · [Deutsch](https://inferdi.com/de/adapters/react) · [Français](https://inferdi.com/fr/adapters/react)

</div>

InferDI is a TypeScript dependency injection container that checks how your services fit together at compile time. `@inferdi/react` brings that graph to React 19 through typed providers and hooks. Share application services, suspend for async initialization, and give a client subtree its own managed scope.

## The graph is the type. Built for speed.

**Catch broken wiring while you code.** Each registration records service types, dependencies and lifetimes in the container’s type. TypeScript rejects missing keys, duplicate registrations, incompatible constructor arguments and declared singleton dependencies on scoped services. Async dependencies and required scope inputs also determine which services are ready to resolve. Refactor a constructor and your editor points to affected registrations.

**Keep your business logic yours.** Choose implementations explicitly where you assemble the application. Services receive ordinary constructor or function arguments, with no InferDI imports, decorators or metadata. You can test them directly and keep business policy independent of the framework and container. Reusable modules, lazy resolution and typed overrides support composition as the application grows.

**Fast resolution, compact core.** InferDI core has zero runtime dependencies, an enforced budget under 3 KiB gzip and a single `Map.get()` fast path for cached services. In the [recorded core cached-singleton benchmark](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json), default InferDI is **1.76× to 13.05× faster** than the compared containers, with runtime checks enabled. These are core operation measurements; adapter overhead and application performance depend on the workload. [Explore the benchmarks](https://inferdi.com/guide/performance).

Static checks cover the declared graph within TypeScript’s limits; casts can bypass them and structurally identical dependency types remain interchangeable.

## Why use it with React

- **The graph reaches your hooks:** each binding preserves one exact container type. Service hooks accept ready, non-transient keys, and the sync hook rejects declarative async services.
- **Async services work with Suspense:** stable promises support repeated renders; tuple hooks start all requested services before suspending. Rejections reach an Error Boundary.
- **Scopes follow committed UI:** `ScopeProvider` creates a child after commit and owns its disposal. Replacement waits for the previous generation’s setup and cleanup to finish.
- **Strict Mode and Activity support:** Effect replay and reconnection create fresh scope generations; managed descendants clean up before their managed ancestor.
- **Bring your own container:** external `Provider` works with application roots, test fixtures and classic SSR request scopes, with lifetime controlled by your application.

## Lifecycle essentials

Create bindings at module scope. An external `Provider` never disposes its container; a managed `ScopeProvider` always owns its child. Parent identity and `scopeKey` control managed replacement. Changing `input` alone does not reconfigure a live scope.

Service resolution during render can initialize cached services. Keep constructors and factories free of subscriptions, timers and writes; activate those effects during bootstrap or scope setup.

For full classic SSR, supply a request scope through external `Provider` and dispose it after rendering completes or disconnects. Managed scopes render fallback on the server until a client Effect commits. React Server Components and Next.js request helpers are outside this package’s API.

Current setup failures reach an Error Boundary after cleanup. Disposal failures go to `onDisposeError` or `console.error`, preserving the original setup error and rendered UI.

## Get started

React `>=19.2.8 <20` · TypeScript 5.2+ · InferDI 6 · Node.js 16+ for classic SSR. The adapter does not import `react-dom`; keep your application’s renderer.

Available on [npm](https://www.npmjs.com/package/@inferdi/react) and [JSR](https://jsr.io/@inferdi/react), alongside [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi).

**[Read the React guide →](https://inferdi.com/adapters/react)**

Installation, bindings, providers, Suspense, scope identity and server rendering are covered in the guide.

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)
