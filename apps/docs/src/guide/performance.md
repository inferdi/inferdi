# Performance

## Recorded Result

In the public run recorded on **2026-08-17**, the default checked contract resolved a hot singleton in a median **6.233 ns/op**. For that one scenario and the recorded package versions, the participating containers measured **1.76× to 13.05×** its median. These figures measure container overhead, not HTTP throughput or total application performance. The [raw result](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json) contains all eight rounds and environment metadata.

A warm resolve reads `Map.get(key)` and calls `new Ctor(...)` directly when construction is required. The benchmark scenarios cover these runtime choices:

| Runtime choice                       | Effect                                                                                                                                                            |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Explicit registrations               | Container build is a flat `Map.set` per service. There are no decorator side effects, constructor-name parsers, or metadata tables to prepare.                    |
| Cached singleton and scoped services | A warm resolve reads from `cache.get(key)` before cycle and lifetime bookkeeping runs. Explicit `undefined` is stored as an internal `UNDEFINED_MARKER`, so the hit still needs one lookup. |
| Direct constructor calls             | Classes with 0-7 dependencies use a direct `new Ctor(...)` path. Larger constructors fall back to `Reflect.construct`.                                            |
| Async factories                      | The factory's `Promise` is cached verbatim, so concurrent callers share one in-flight initialization while `.get()` stays synchronous.                            |
| Runtime contract                     | Default/`fast: false` keeps runtime checks and an exact mutable parent chain. `fast: true` disables checks and enables fixed-topology scope lookup.               |

## Benchmark Suite

The comparative workspace measures `InferDI (fast)` and `InferDI (default)` alongside InversifyJS v8, Awilix v13 in PROXY and CLASSIC modes, TSyringe v4, TypeDI v0.10, and Typed Inject v5. The raw result records the package versions and machine environment used for this run.

**Correctness before timing**

The adapter contract suite runs before Tinybench. Each adapter must provide the same observable graph:

- `Logger`, `Config`, `Repo`, and `Service` act as root singletons
- transient graph nodes produce new instances
- each scope caches its own `ScopedService` while sharing the root logger
- lazy access defers the target resolution
- each declared teardown API invokes the scoped service disposer

These checks keep lifetime or identity differences out of the timing comparison. The timed scenarios measure cost after the adapters pass the contract.

**Measurement design**

The public runner performs a frozen install, typechecks the benchmark workspace, builds InferDI's production ESM artifact, and runs the contract suite against that artifact. It then measures the subjects with these controls:

1. One balanced Latin-square block contains eight rounds, matching the eight subjects.
2. Each subject occupies each process position once and follows each other subject once. `InferDI (fast)` precedes `InferDI (default)` in four rounds and follows it in four.
3. Each subject runs in a fresh Node process, so implementations do not share JIT feedback, inline caches, or GC history.
4. Tinybench warms each scenario for 50 ms and measures it for 100 ms. One sample executes a batch sized for that operation.
5. For each subject, scenario, and round, the runner divides the median Tinybench batch duration by the batch size and records normalized `ns/op`.
6. The reporter aggregates the eight per-round values with the median and median absolute deviation (MAD).

Lower `ns/op` is better. MAD reports the spread around the median; it is not a confidence interval. Process isolation and balanced launch order reduce measurement bias, but they cannot remove OS scheduling, CPU frequency changes, JIT decisions, or GC timing.

**Scenario boundaries**

Each scenario isolates one part of container work. Production code combines a subset of these stages according to its lifetime model.

| Workload group          | Scenarios                                                           | Container work represented                                              |
|-------------------------|---------------------------------------------------------------------|-------------------------------------------------------------------------|
| Warm access             | Hot singleton resolve, warm scoped resolve, lazy resolve            | Cached service lookup or access through an existing lazy wrapper        |
| Object construction     | Transient resolve, deep graph, wide graphs                          | Cache misses, dependency traversal, argument assembly, and constructors |
| Startup and cold access | Registration, first resolve                                         | Graph configuration followed by initial cache population                |
| Scope lifecycle         | Scope creation, first scoped resolve, sync teardown, async teardown | Per-request or per-job scope ownership from creation through cleanup    |

Tinybench setup hooks prepare cold graphs and scopes outside each timing region. Cleanup for registration and resolve scenarios also stays outside the timed operation. The teardown scenarios time cleanup as their target operation.

TypeDI reports `N/A` for registration because its comparable service definitions run as decorator side effects during module evaluation, which the registration timer excludes. Teardown rows include libraries with an equivalent public contract: InversifyJS reports `N/A`, TypeDI participates in sync teardown, and Awilix, TSyringe, and Typed Inject participate in async teardown. InferDI exposes both teardown contracts.

**Public result**

The value in each cell is `median ± MAD` in `ns/op`. The factor in parentheses compares that median with the lowest median in the same row.

![benchmarks](https://raw.githubusercontent.com/inferdi/inferdi/main/assets/benchmarking_results.jpg)

| Scenario                     |          InferDI (fast) |       InferDI (default) |               InversifyJS |              Awilix PROXY |            Awilix CLASSIC |                TSyringe |                   TypeDI |            Typed Inject |
|------------------------------|------------------------:|------------------------:|--------------------------:|--------------------------:|--------------------------:|------------------------:|-------------------------:|------------------------:|
| Hot singleton resolve        |   6.233 ± 0.091 (1.00×) |   6.233 ± 0.000 (1.00×) |    10.954 ± 0.321 (1.76×) |    40.425 ± 0.596 (6.49×) |    41.525 ± 0.367 (6.66×) | 81.354 ± 3.254 (13.05×) |  71.729 ± 0.962 (11.51×) |  48.354 ± 1.374 (7.76×) |
| Transient resolve            |  41.798 ± 2.196 (1.00×) |  45.834 ± 1.284 (1.10×) |    79.566 ± 3.850 (1.90×) |    219.82 ± 8.250 (5.26×) |    227.15 ± 8.068 (5.43×) | 301.40 ± 16.682 (7.21×) |  519.75 ± 5.498 (12.43×) |  138.05 ± 1.464 (3.30×) |
| Deep graph (10 levels)       | 344.21 ± 11.460 (1.00×) | 445.50 ± 10.085 (1.29×) |    397.37 ± 7.795 (1.15×) |   1306.3 ± 16.500 (3.79×) |   1190.8 ± 12.375 (3.46×) | 1463.0 ± 34.835 (4.25×) | 4478.8 ± 26.582 (13.01×) |  717.75 ± 3.670 (2.09×) |
| Wide graph (4 dependencies)  |  59.584 ± 1.282 (1.00×) |  71.316 ± 1.284 (1.20×) |    103.22 ± 2.932 (1.73×) |    331.10 ± 6.416 (5.56×) |    302.69 ± 5.498 (5.08×) | 457.97 ± 18.150 (7.69×) | 863.32 ± 12.832 (14.49×) |  197.63 ± 1.468 (3.32×) |
| Wide graph (10 dependencies) |  188.37 ± 4.125 (1.00×) |  200.74 ± 4.130 (1.07×) |    394.63 ± 4.580 (2.09×) |   681.08 ± 21.080 (3.62×) |   571.54 ± 12.830 (3.03×) | 979.46 ± 15.125 (5.20×) | 2234.1 ± 25.888 (11.86×) |  321.29 ± 4.585 (1.71×) |
| Registration                 | 2007.5 ± 27.500 (1.00×) | 2158.8 ± 13.750 (1.08×) | 61274.6 ± 1537.7 (30.52×) | 74763.4 ± 1024.4 (37.24×) | 95225.6 ± 467.45 (47.43×) | 3762.9 ± 36.650 (1.87×) |                      N/A | 3593.3 ± 18.300 (1.79×) |
| First resolve                | 653.13 ± 24.745 (1.00×) |  794.98 ± 6.190 (1.22×) |  9967.4 ± 551.61 (15.26×) |   2434.9 ± 96.250 (3.73×) |   3044.2 ± 70.360 (4.66×) | 1236.8 ± 25.440 (1.89×) |  3322.9 ± 22.455 (5.09×) | 1275.3 ± 22.917 (1.95×) |
| Scope creation               |  79.750 ± 2.290 (1.00×) |  83.415 ± 5.505 (1.05×) |  6194.4 ± 167.98 (77.67×) |  1054.4 ± 16.960 (13.22×) |   1031.2 ± 7.790 (12.93×) | 503.26 ± 10.540 (6.31×) |   419.38 ± 3.210 (5.26×) |  164.08 ± 1.835 (2.06×) |
| First scoped resolve         |  115.05 ± 1.830 (1.00×) |  128.34 ± 1.835 (1.12×) |  3048.6 ± 32.765 (26.50×) |    352.92 ± 1.835 (3.07×) |    362.54 ± 4.590 (3.15×) | 373.54 ± 11.915 (3.25×) |   296.08 ± 4.125 (2.57×) |  203.05 ± 0.920 (1.76×) |
| Warm scoped resolve          |   8.387 ± 0.092 (1.05×) |   8.250 ± 0.046 (1.03×) |    30.204 ± 0.367 (3.79×) |   90.841 ± 1.421 (11.39×) |   95.242 ± 1.421 (11.94×) |  78.375 ± 2.429 (9.83×) |  92.630 ± 0.458 (11.61×) |   7.975 ± 0.092 (1.00×) |
| Sync teardown                |  99.455 ± 1.370 (1.01×) |  98.085 ± 0.925 (1.00×) |                       N/A |                       N/A |                       N/A |                     N/A |   124.21 ± 3.665 (1.27×) |                     N/A |
| Async teardown               |  242.91 ± 3.210 (1.00×) |  249.34 ± 1.840 (1.03×) |                       N/A |   860.52 ± 20.170 (3.54×) |   886.87 ± 13.750 (3.65×) | 1311.8 ± 10.080 (5.40×) |                      N/A | 721.42 ± 19.935 (2.97×) |
| Lazy resolve                 |  18.837 ± 0.458 (1.00×) |  19.020 ± 0.274 (1.01×) |    64.212 ± 3.621 (3.41×) |    115.68 ± 0.825 (6.14×) |    124.09 ± 3.231 (6.59×) |  155.01 ± 5.271 (8.23×) |  271.06 ± 3.941 (14.39×) |  76.496 ± 0.962 (4.06×) |

::: info Source data
The chart and table use [`public-2026-08-17T16-46-00-483Z.json`](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json). Open the raw result for the eight rounds, normalized measurements, Tinybench statistics, environment metadata, and dependency versions. The [benchmark workspace README](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) documents each scenario, its production mapping, and the report calculation.
:::

**Reading the result**

An InferDI mode records the lowest or tied median in 12 of the 13 scenarios. `InferDI (fast)` records the lowest or tied median in 11 scenarios. The clearest gains appear in registration, first resolution, transient and graph construction, scope creation, and the first scoped resolution. These operations enter code paths where InferDI's flat registry, direct constructor calls, and small cache-miss path affect the measured work.

`Warm scoped resolve` is the exception to the first count. Typed Inject records 7.975 ns, while InferDI default records 8.250 ns and InferDI fast records 8.387 ns. This row measures one cached read from an existing scope. It does not include scope creation, the first scoped cache miss, or teardown, where the same production request may pay separate costs.

**Why `fast` is not lower in every row**

`fast: true` changes guarded cache misses, construction, registration invalidation, and parent lookup in fixed scope trees. Several scenarios do not execute those branches after warmup:

- Hot singleton resolution returns from `cache.get(key)` before InferDI reads the `fast` flag. Both modes record the same 6.233 ns median.
- Warm scoped resolution uses that same cache-hit return. Fast records 8.387 ns and default records 8.250 ns, a 0.137 ns gap on the same implementation path. That gap sits on the scale of the reported MAD values.
- Sync teardown uses the same disposal implementation in both modes. Its 1.370 ns median gap equals the fast result's MAD for this run.
- Async teardown and lazy resolution give fast small gains, but their steady-state work also receives no direct benefit from disabled resolution guards. Treat those small gains with the same caution.

Independent Node processes can make identical code paths settle on different JIT code or encounter different scheduler and GC timing. The Latin-square order and eight-round median reduce those effects without eliminating them. The small reversals in warm scoped resolution and sync teardown do not establish a fast-mode regression. Repeated runs on a controlled machine provide stronger evidence for sub-nanosecond and low-single-digit percentage gaps.

The larger fast/default gaps occur where the implementation differs. Default takes 1.29× the fast median for the ten-level transient graph, 1.22× for first resolve, 1.20× for the four-dependency wide graph, and 1.12× for first scoped resolve. Those directions match the removed cycle and lifetime bookkeeping and the fixed-topology scope lookup.

**Match the scenario to the application**

The reporter does not compute an overall score because applications pay different combinations of container work. A long-lived process may register once and spend most of its time on warm singleton reads. An HTTP adapter may create a scope, resolve one scoped graph, read cached scoped values, and dispose the scope for each request. A worker may construct transient graphs without opening scopes.

Do not average the relative factors across rows. The scenarios use different batch sizes and isolate independent timing regions. Use the rows that match the application's measured resolve pattern, then profile the full application with its framework and I/O.

The comparison applies to the recorded package versions, adapters, fixtures, and machine. Each library keeps its public lifecycle model, so `N/A` means the suite found no equivalent operation for that row. The benchmark measures container overhead rather than end-to-end request latency.

## `fast: true`

See [Container Options](../reference/api#container-options) for the constructor
reference. This section explains the performance consequences of that choice.

`new Container({ fast: true })` removes runtime cycle bookkeeping, singleton-stack tracking, and the `try`/`finally` around guarded resolution. Fixed scopes read the registry owner directly instead of walking the parent chain, then mirror delegated singletons into the scope cache. Default scopes walk their exact parent chain on every local miss, keeping mutations observable. Fast containers skip defensive registration-time invalidation. Owned-instance identity de-duplication still runs during disposal.

The default `new Container()` and explicit `{fast: false}` forms keep runtime safety checks enabled and the graph mutable.

Use `fast: true` only after tests have exercised the graph with `fast: false`. TypeScript cannot see singleton cycles, transient cycles, dynamic keys, `as`-casts, or factories that close over a wider outer container. Register each runtime key once through one linear fluent chain, complete registration before the first resolve or scope, keep the activated tree immutable, and dispose child scopes before their ancestors.

For a profiled production graph, `{fast: true}` can reduce registration, cache-miss, graph-construction, and fixed-scope lookup costs after that verification. Warm cache hits and disposal use common paths, so benchmark the stages that dominate the application before choosing the runtime contract. Keep `fast: false` for development, tests, hot reload, and any tree that is mutated after activation.

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
pnpm run bench:quick   # local source check
pnpm run bench:public  # production artifact, fresh process per subject
```

The benchmark workspace is intentionally isolated from the root pnpm workspace and has its own lockfile. See [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) for methodology, fairness notes, and fixture sources.
