# InferDI

<div align="center">
<img src="https://raw.githubusercontent.com/inferdi/inferdi/main/assets/logo.png" alt="InferDI" width="150" height="150" />

**The graph is the type. Built for speed.**

Catch broken wiring in your editor. Resolve at speed. Keep your business logic yours.

**Zero runtime dependencies · Under 3 KiB gzip · No decorators**

[![npm version](https://img.shields.io/npm/v/@inferdi/inferdi)](https://www.npmjs.com/package/@inferdi/inferdi)
[![JSR](https://jsr.io/badges/@inferdi/inferdi)](https://jsr.io/@inferdi/inferdi)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/%40inferdi%2Finferdi)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
[![codecov](https://codecov.io/gh/inferdi/inferdi/graph/badge.svg?token=IHAXLIFHF3)](https://codecov.io/gh/inferdi/inferdi)
[![License](https://img.shields.io/npm/l/@inferdi/inferdi.svg)](https://github.com/inferdi/inferdi/blob/main/LICENSE)

[Get started](https://inferdi.com/guide/quick-start) · [Documentation](https://inferdi.com) · [Benchmarks](#performance)

**Read the docs in your language**

[English](https://inferdi.com/guide/quick-start) · [中文](https://inferdi.com/zh/guide/quick-start) · [日本語](https://inferdi.com/ja/guide/quick-start) · [Español](https://inferdi.com/es/guide/quick-start) · [Русский](https://inferdi.com/ru/guide/quick-start) · [Deutsch](https://inferdi.com/de/guide/quick-start) · [Français](https://inferdi.com/fr/guide/quick-start)

</div>

InferDI is a TypeScript dependency injection container for explicit, compiler-checked application composition. You choose how services fit together. InferDI records those relationships in the container's type, so your editor can catch broken wiring as you build and refactor the application.

Its defining idea is **the graph is the type**. The compiler knows which services exist, what they depend on, their lifetimes, and whether they are ready to resolve. You get graph checks that follow your refactors and business logic that stays ordinary TypeScript, all in a core under 3 KiB gzip.

That design also delivers speed: in the [recorded cached-singleton benchmark](#performance), InferDI is **1.76× to 13.05× faster** than the compared containers, with default runtime checks enabled.

## What makes InferDI different

**Composition is part of the static contract.** Each registration adds to the compiler's knowledge of the graph. TypeScript checks dependency keys, constructor arguments and lifetime compatibility. Async dependencies and required scope inputs determine how and when a service can be resolved. These relationships remain checked as the graph grows through reusable modules.

**The container belongs at the application boundary.** Wiring lives in the composition root, where you select implementations and assemble services. Business classes receive dependencies through constructors or function arguments, with no InferDI imports, decorators or metadata. Dependencies stay visible, tests can construct services directly, and business logic stays independent of the assembly mechanism. This supports clean architecture while leaving module boundaries and application design to you.

**Built for speed, down to a single map lookup.** Graph types disappear during compilation and generate no runtime validation code. Cached resolution takes one `Map.get()`, with no reflection or Proxy traps. Core packs construction, scopes and disposal into an enforced budget below 3 KiB gzip, with zero runtime dependencies and default diagnostics for cycles and lifetime violations.

The [architectural manifesto](https://github.com/inferdi/inferdi/blob/main/MANIFESTO.md) keeps graph safety, runtime efficiency and independent business logic part of one design. [Type and runtime tests](https://github.com/inferdi/inferdi/tree/main/packages/inferdi/__tests__), [100% coverage thresholds](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/vitest.config.ts) and an [enforced bundle budget](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/scripts/check-bundle-size.mjs) protect those commitments.

Checks apply to the declared graph within TypeScript's limits: structurally identical types remain interchangeable, casts and `any` can bypass guarantees, and broad keys reduce precision.

## What you can build with it

- **Scopes and typed inputs:** model request, tenant or job data; dependent services become resolvable when their required inputs are supplied.
- **Async dependency graphs:** propagate async initialization through consuming classes and share singleton or scoped initialization across concurrent callers.
- **Lazy injection:** defer service resolution until it is needed, with typed sync and async companions.
- **Reusable modules:** declare required and provided services, with checks for incompatible contracts and key collisions.
- **Typed test overrides:** substitute dependencies while preserving their expected service types.
- **Explicit resource ownership:** use `using` and `await using` to release owned instances in reverse creation order. Supplied values and transient instances remain application-owned.

**[Build your first graph →](https://inferdi.com/guide/quick-start)**

## Performance

In the recorded cached-singleton benchmark, InferDI's default mode is **1.76× faster than InversifyJS**, 6.49× to 6.66× faster than Awilix, 7.76× faster than Typed Inject, 11.51× faster than TypeDI and **13.05× faster than TSyringe**. Runtime checks remain enabled.

The measurements use a production ESM build, eight balanced rounds and a fresh Node process for each subject. Results include environment, versions and dispersion. These ratios measure DI operations, not whole-application speedups; rankings vary by workload. The full suite covers registration, construction, scopes and teardown, and reports the opt-in unchecked `fast` mode separately.

[Inspect the results (August 17, 2026)](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json) · [Run the benchmarks](https://github.com/inferdi/inferdi/tree/main/benchmarks) · [Read the performance guide](https://inferdi.com/guide/performance)

## Use it with your stack

The core runs in Node.js, Bun, Deno, browsers, Workers and serverless functions. It targets ES2022 and TypeScript 5.2+, with Node.js 16+ support. Install from [npm](https://www.npmjs.com/package/@inferdi/inferdi) or [JSR](https://jsr.io/@inferdi/inferdi).

Framework adapters connect scopes to application lifecycles while preserving your concrete service types:

- [React 19](https://inferdi.com/adapters/react): typed providers and hooks, Suspense, and managed client scopes.
- [Fastify](https://inferdi.com/adapters/fastify), [Hono](https://inferdi.com/adapters/hono), [Koa](https://inferdi.com/adapters/koa), [Express](https://inferdi.com/adapters/express) and [Elysia](https://inferdi.com/adapters/elysia): request scopes and framework-specific cleanup.

Adapters have their own framework and runtime requirements. Find setup and ownership details in their guides, or browse the [integration examples](https://github.com/inferdi/inferdi/tree/main/examples).

## Build your first graph, in your language

Start with [installation and a working example](https://inferdi.com/guide/quick-start). Continue in the [documentation](https://inferdi.com) for async services, request data, scopes and disposal, modules, testing, and the API reference.

Upgrading an existing InferDI application? Read the [migration checklist](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md).

[GitHub](https://github.com/inferdi/inferdi) · [Report an issue](https://github.com/inferdi/inferdi/issues) · [MIT license](https://github.com/inferdi/inferdi/blob/main/LICENSE)
