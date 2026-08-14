# Performance

A warm resolve reads `Map.get(key)` and calls `new Ctor(...)` directly when construction is required. The benchmark numbers below reflect concrete runtime choices:

| Runtime choice | Effect |
| --- | --- |
| Explicit registrations | Container build is a flat `Map.set` per service. There are no decorator side effects, constructor-name parsers, or metadata tables to prepare. |
| Cached singleton and scoped services | A warm resolve reads from `cache.get(key)` before cycle and lifetime bookkeeping runs. The `cache.has(key)` fallback exists only for explicit `undefined` values. |
| Direct constructor calls | Classes with 0-7 dependencies use a direct `new Ctor(...)` path. Larger constructors fall back to `Reflect.construct`. |
| Async factories | The factory's `Promise` is cached verbatim, so concurrent callers share one in-flight initialization while `.get()` stays synchronous. |
| Runtime contract | Default/`fast: false` keeps runtime checks and an exact mutable parent chain. `fast: true` disables checks and enables fixed-topology scope lookup. |

![Benchmark results](/benchmarking_results.png)

## Benchmark Suite

The repository benchmark suite compares InferDI with InversifyJS v8, Awilix v13 in PROXY and CLASSIC modes, TSyringe v4, TypeDI v0.10, and Typed Inject v5.

All numbers are operations per second on Node 22. Higher is better.

| Scenario | InferDI | InversifyJS | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. Hot singleton resolve** (warm cache) | **14.3 M** | 10.7 M | 7.0 M | 7.3 M | 6.7 M | 5.8 M | 6.45 M |
| **2. Transient resolve** (new instance per call) | **9.75 M** | 6.1 M | 4.1 M | 3.45 M | 3.0 M | 2.5 M | 1.6 M |
| **3. Deep graph** (10 levels, all transient) | **2.3 M** | 1.5 M | 1.3 M | 716 k | 736 k | 643 k | 222 k |
| **4a. Wide graph** (4 deps, root transient) | **8.25 M** | 4.9 M | 3.4 M | 2.2 M | 2.3 M | 1.65 M | 1.1 M |
| **4b. Wide graph** (10 deps, root transient) | **3.5 M** | 1.9 M | 2.6 M | 1.2 M | 1.3 M | 938 k | 458 k |
| **5. Container build + first resolve** | **400 k** | 13.2 k | 223 k | 10 k | 8.3 k | 206 k | 282 k |
| **6. Scoped lifecycle** (create + resolve + cleanup) | **2.85 M** | 35 k | 2.45 M | 330 k | 430 k | 1.1 M | 665 k |
| **7. Lazy resolve** (deferred wrapper) | **11.8 M** | 7.6 M | 7.15 M | 5.6 M | 4.7 M | 4.25 M | 2.85 M |

## What the Numbers Show

- Cached singleton resolve is 1.34x faster than the closest baseline, InversifyJS.
- Container build plus first resolve favors flat registration. InferDI registers the graph from scratch; decorator-based libraries have already paid part of their registration work during module evaluation.
- Wide graph scenarios show why arity unrolling matters. With four dependencies, InferDI leads the closest baseline by 1.68x. At ten dependencies, it falls back to `Reflect.construct` and remains 1.35x ahead of Typed Inject.
- Scoped lifecycle includes scope creation, resolve, and cleanup. Scenario 6 includes disposal work on every iteration, so it measures scope ownership rather than resolve alone.
- InferDI leads all 8 scenarios. Typed Inject is the closest non-InferDI baseline on scoped flows and the 10-dependency wide graph, while InversifyJS is closest on cached singleton, transient, deep-graph, and four-dependency-wide resolves.

## `fast: true`

`new Container({ fast: true })` removes runtime cycle bookkeeping, singleton-stack tracking, and the `try`/`finally` around guarded resolution. Fixed scopes read the registry owner directly instead of walking the parent chain, then mirror delegated singletons into the scope cache. Default scopes walk their exact parent chain on every local miss, keeping mutations observable. Fast containers skip defensive registration-time invalidation. Owned-instance identity de-duplication still runs during disposal.

The default `new Container()` and explicit `{fast: false}` forms keep runtime safety checks enabled and the graph mutable.

Use `fast: true` only after tests have exercised the graph with `fast: false`. TypeScript cannot see singleton cycles, transient cycles, dynamic keys, `as`-casts, or factories that close over a wider outer container. Register each runtime key once through one linear fluent chain, complete registration before the first resolve or scope, keep the activated tree immutable, and dispose child scopes before their ancestors.

For a profiled production path, `{fast: true}` is the fastest supported configuration after that verification. Keep `fast: false` for development, tests, hot reload, and any tree that is mutated after activation.

## Small Hot-Path Details

### Transient construction

`registerClass` is the default for transient services. Keep it unless profiling identifies a graph that repeatedly resolves many different transient classes with the same dependency count.

For that narrow V8 hotspot, an explicit factory gives each service its own construction site:

```ts
const container = new Container()
  .declareScopeInputs<{ context: RequestContext }>()
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    ['context', 'schema'],
    'transient'
  )
```

Factories repeat dependency wiring, so use this form only after measuring the application artifact. A shared generic construction helper removes the distinct call site and defeats the optimization.

### Key representation

Symbol keys can help in tight resolve loops because `Map` compares them by identity. String keys need hashing and, on collision, character comparison. Most applications will not measure a difference, so treat symbol keys as a profiler-driven change.

## Reproduce Locally

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

The benchmark workspace is intentionally isolated from the root pnpm workspace and has its own lockfile. See [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) for methodology, fairness notes, and fixture sources.
