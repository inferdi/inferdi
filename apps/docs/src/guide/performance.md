# Performance

A warm resolve is one `Map.get(key)` followed by a direct `new Ctor(...)` — there is no reflection, no metadata table, and no proxy in the way. The benchmark numbers below follow from a few concrete runtime choices, not from a special fast mode you have to opt into:

| Runtime choice | Effect |
| --- | --- |
| Explicit registrations | Container build is a flat `Map.set` per service. There are no decorator side effects, constructor-name parsers, or metadata tables to prepare. |
| Cached singleton and scoped services | A warm resolve reads from `cache.get(key)` before cycle and lifetime bookkeeping runs. The `cache.has(key)` fallback exists only for explicit `undefined` values. |
| Direct constructor calls | Classes with 0-7 dependencies use a direct `new Ctor(...)` path. Larger constructors fall back to `Reflect.construct`. |
| Async factories | The factory's `Promise` is cached verbatim, so concurrent callers share one in-flight initialization while `.get()` stays synchronous. |
| Strict mode boundary | `strict: true` catches cycles and lifetime leaks. `strict: false` removes that bookkeeping for audited hot transient graphs. |

![Benchmark results](/benchmarking_results.png)

## Benchmark Suite

The repository benchmark suite compares InferDI with InversifyJS v8, Awilix v13 in PROXY and CLASSIC modes, TSyringe v4, TypeDI v0.10, and Typed Inject v5.

All numbers are operations per second on Node 22. Higher is better.

| Scenario | InferDI | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | InversifyJS | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. Hot singleton resolve** (warm cache) | **14.2 M** | 7.0 M | 7.2 M | 6.9 M | 6.3 M | 6.2 M | 6.4 M |
| **2. Transient resolve** (new instance per call) | **8.4 M** | 4.3 M | 3.4 M | 2.9 M | 3.4 M | 2.4 M | 1.6 M |
| **3. Deep graph** (10 levels, all transient) | **1.85 M** | 1.28 M | 701 k | 739 k | 750 k | 601 k | 214 k |
| **4a. Wide graph** (4 deps, root transient) | **7.3 M** | 3.2 M | 2.2 M | 2.3 M | 2.3 M | 1.6 M | 1.1 M |
| **4b. Wide graph** (10 deps, root transient) | **3.5 M** | 2.6 M | 1.2 M | 1.3 M | 1.6 M | 1.0 M | 437 k |
| **5. Container build + first resolve** | **400 k** | 228 k | 10 k | 8 k | 13 k | 202 k | 272 k |
| **6. Scoped lifecycle** (create + resolve + cleanup) | **2.66 M** | 2.39 M | 492 k | 413 k | 28 k | 1.08 M | 637 k |
| **7. Lazy resolve** (deferred wrapper) | **12.1 M** | 7.0 M | 5.5 M | 4.7 M | 4.2 M | 4.0 M | 2.8 M |

## What the Numbers Show

- Cached singleton resolve runs about 2x faster than the closest baseline in this suite.
- Container build plus first resolve favors flat registration. InferDI registers the graph from scratch; decorator-based libraries have already paid part of their registration work during module evaluation.
- Wide graph scenarios show why arity unrolling matters. Up to seven dependencies, V8 can inline the direct constructor call. At ten dependencies, InferDI falls back to `Reflect.construct` and still leads the listed baselines.
- Scoped lifecycle includes scope creation, resolve, and cleanup. Scenario 6 includes disposal work on every iteration, so it measures scope ownership rather than resolve alone.
- Typed Inject is the closest non-InferDI baseline. Its compile-time-known graph keeps it competitive on deep graphs and scoped flows.

## Fast Mode

`new Container({ strict: false })` removes runtime cycle bookkeeping, singleton-stack tracking, and the `try`/`finally` around the guarded resolve path. The package README reports about 30% faster local transient resolves on a flat transient graph. Cached singleton and scoped resolves do not change, because they return before those guards run.

Use fast mode only after tests have exercised the graph in default strict mode. TypeScript cannot see singleton cycles, transient cycles, dynamic keys, `as`-casts, or factories that close over a wider outer container.

## Small Hot-Path Details

Symbol keys can help in tight resolve loops because `Map` compares them by identity. String keys need hashing and, on collision, character comparison. Most applications will not measure a difference, so treat symbol keys as a profiler-driven change.

## Reproduce Locally

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

The benchmark workspace is intentionally isolated from the root pnpm workspace and has its own lockfile. See [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) for methodology, fairness notes, and fixture sources.
