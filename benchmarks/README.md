# InferDI benchmarks

Comparative benchmarks of `@inferdi/inferdi` against five other popular DI containers for TypeScript/Node:

- [InferDI](https://www.npmjs.com/package/@inferdi/inferdi) — this package
- [InversifyJS](https://www.npmjs.com/package/inversify) v8
- [Awilix](https://www.npmjs.com/package/awilix) v13 (tested in both modes: PROXY and CLASSIC)
- [TSyringe](https://www.npmjs.com/package/tsyringe) v4
- [TypeDI](https://www.npmjs.com/package/typedi) v0.10
- [Typed Inject](https://www.npmjs.com/package/typed-inject) v5

## Run

```bash
cd benchmarks
npm install
npm run precondition   # smoke test: TypeDI scope is actually isolated
npm run bench          # runs all 7 scenarios
```

`npm install` puts the DI libraries and tooling **only** into `benchmarks/node_modules` — the parent package is untouched. `InferDI` is wired up via a TS path alias (`benchmarks/tsconfig.json` → `paths`), so `npm run build` in the parent is not required.

## Scenarios

| #  | Scenario                               | Registration                                     | What it measures                                                       |
|----|----------------------------------------|--------------------------------------------------|-------------------------------------------------------------------------|
| 1  | Hot singleton resolve                  | Service singleton, warm                           | Cache hit. Primary metric for production code.                          |
| 2  | Transient resolve                      | Service transient                                 | Factory invocation cost on every call.                                  |
| 3  | Deep graph (10 levels), all-transient  | L0..L9 all transient                              | Full L0→...→L9 chain rebuilt from scratch every iteration.              |
| 4a | Wide graph (4 deps), root transient    | Wide4 transient + dependencies singleton          | Fan-out lookup cost: 4 cache hits + constructor. InferDI fast path.     |
| 4b | Wide graph (10 deps), root transient   | Wide10 transient + dependencies singleton         | Fan-out lookup cost: 10 cache hits + constructor. InferDI slow path.    |
| 5  | Build + first resolve                  | Fresh container per iteration                     | Registration cost + one cold resolve.                                   |
| 6  | Scoped lifecycle (composite)           | Scoped service                                    | Creation + resolve + cleanup (where dispose is synchronous).            |
| 7  | Lazy resolve                           | Logger singleton, lazy companion                  | Inject `Lazy<Logger>` + `.get()`/`()` — overhead of the deferred wrapper. |

## Fairness notes

- **Awilix is tested in both modes**:
  - **PROXY** (default, idiomatic) — the factory receives a cradle proxy, dependencies are accessed via property access. Effectively every `cradle.x` is a Proxy `get` trap.
  - **CLASSIC** — Awilix parses the constructor source code with a regex and resolves dependencies by parameter name. Noticeably faster, opt-in.
- **Awilix PROXY with `asClass(Cls)` silently corrupts the graph** for classes with positional arguments — `new Cls(cradle)` puts the proxy into the first parameter and leaves the rest `undefined`. Each class with dependencies is therefore registered via `asFunction(({ ...deps }) => new Cls(...deps))`. CLASSIC does not have this problem.
- **Decorators (InversifyJS/TSyringe/TypeDI)**: by default vitest uses esbuild, which **does not emit** `design:paramtypes`. We plug in `unplugin-swc` + `esbuild: false` — swc emits the metadata correctly. This lets TypeDI work in its type-based idiom and TSyringe resolve classes by constructor types. Where an explicit token is more idiomatic (InversifyJS v8, TSyringe for interfaces), we use `@inject('TOKEN')`.
- **Lifecycle is not pinned to the class**:
  - `InferDI`/`InversifyJS`/`Awilix`/`Typed Inject` — lifecycle is set at registration; one class works in any scenario.
  - `TSyringe` — every class is decorated with `@injectable()` (metadata only); lifecycle is set via `register(..., { lifecycle: ... })`.
  - `TypeDI` — separate classes per lifecycle (Service singleton, TransientService transient, Wide/L<n> transient via `@Service({ transient: true })`). ScopedService has no `@Service()` + a no-op `@ForceMetadata()` so swc still emits paramtypes.
- **Typed Inject zero-reflection**: factories (`provideFactory`) must carry an explicit `inject` array. Lazy is implemented through the `$injector` special token: `Object.assign(($i) => () => $i.resolve('logger'), { inject: ['$injector'] })`.

### Scenario 5 (Build + first resolve) — asymmetric for decorator-based containers

TypeDI and TSyringe perform **class registration at import time** (decorators run when the module is loaded). The global registry is already populated by the time the bench starts. "Build" for them = `Container.of('build-test')` or `container.createChildContainer()` — that is, child-context creation + first resolve only. For InferDI/Awilix/InversifyJS/Typed Inject "build" includes fully populating the registry at runtime. **These numbers are not directly comparable** — TypeDI and TSyringe in this scenario report only the cost of creating a child context and the first resolve; class registration is amortised at import time.

### Scenario 6 (Scoped lifecycle) — composite metric

This scenario measures the **full lifecycle** = creation + resolve + cleanup, **not** scope-resolve speed in isolation. Containers with **synchronous dispose** (InferDI `Symbol.dispose`, TSyringe `clearInstances`, TypeDI `Container.reset`) pay its real cost in this number. Containers with **async-only dispose** (Awilix, Typed Inject) and **no-op cleanup** (InversifyJS) rely on GC. This is a methodological trade-off — `await dispose()` inside a bench would introduce event-loop overhead and skew metrics asymmetrically. Numbers in this scenario should **not** be read as "X is faster than Y at scope resolve", only as "the full lifecycle of X costs this much".

### TypeDI scope-isolation precondition

TypeDI's `Container.of(id).get(GlobalServiceClass)` silently falls back to the global singleton if the class is decorated with `@Service()`. Scenario 6 for TypeDI would be a fake (just a global cache hit). `ScopedService` is intentionally **not** decorated with `@Service()` (only `@ForceMetadata()` for swc) and is registered manually via `Container.of(id).set(...)`. A **smoke test** (`src/precondition/typedi-scope-isolation.test.ts`) verifies this before the bench runs — `npm run precondition` is mandatory before `npm run bench`.

## Defences against typical benchmark artefacts

- **DCE protection** — every `bench(name, fn)` writes the result of `fn()` to a sink variable in `_helpers.ts` → V8 cannot prove the call is side-effect-free → it is not eliminated after warmup.
- **All callbacks are synchronous** — no `async () => { await ... }` (that introduces event-loop overhead, asymmetrically degrading containers with async APIs).
- **GC-noise mitigation** — `warmupTime: 1000ms` + `time: 2000ms` per `bench` call (the default 500 ms catches 1–2 random GC pauses for one container).
- **TypeDI deprecation spam suppressed** — `NODE_OPTIONS="--no-warnings"` in the `bench` script (via `cross-env`). Otherwise `Reflect.metadata` deprecation warnings on Node 22 flood stderr across millions of iterations and crater the ops/sec.
- **Awilix CLASSIC param-name parsing** — constructor parameter names in `src/fixtures/plain.ts` are kept in sync with registration keys (`logger`, `config`, `repo`, `service`, `dep0..dep9`, `l0..l9`). Mismatch → `ResolutionError`.
- **TypeDI scope id strategy** — a static id (`'scope-test'` for scenario 6, `'build-test'` for 5) + `Container.reset(id)` at the end of each iteration. Reset makes the next iteration "fresh" without allocating new strings.

## Limitations

- `--expose-gc` is intentionally **not** enabled — tinybench manages noise itself.
- InferDI `Lazy<T>` is a typed wrapper `{ get(): T }`; the others use a `() => T` thunk. Deferred-resolve semantics are equivalent, the syntax differs. The bench calls `lazy.get()` for InferDI and `lazy()` for the rest; both forms are one logical resolve.
- Typed Inject is architecturally immutable — every `provideClass` returns a new injector instance. Scenario 5 looks "slow" for it, but that is a design choice (compile-time known graph), not registration overhead in the conventional sense.
- Benchmarks run single-process. For production-grade measurements, use a dedicated machine with no other workloads.

## Layout

File names on disk match the npm package name (lowercase, kebab-case) — they are not the marketing labels used in the prose above.

```
benchmarks/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── src/
    ├── fixtures/                   # bench classes (one file per registration style)
    │   ├── plain.ts                # InferDI / Awilix / Typed Inject (no decorators)
    │   ├── inversify.ts            # InversifyJS — @injectable + @inject(TOKEN)
    │   ├── tsyringe.ts             # TSyringe   — @injectable + explicit tokens
    │   ├── typedi.ts               # TypeDI     — @Service / @ForceMetadata
    │   └── typed-inject.ts         # Typed Inject — plain classes + static `inject`
    ├── containers/                 # container factories (one file per library)
    │   ├── types.ts                # shared Resolver interface
    │   ├── inferdi.ts              # InferDI    — `buildRoot()`
    │   ├── inversify.ts            # InversifyJS — `buildRoot()`
    │   ├── awilix.ts               # Awilix     — `buildRootProxy()` + `buildRootClassic()`
    │   ├── tsyringe.ts             # TSyringe   — `buildRoot()`
    │   ├── typedi.ts               # TypeDI     — `buildRoot()`
    │   └── typed-inject.ts         # Typed Inject — `buildRoot()`
    ├── benches/                    # 7 .bench.ts files (one per scenario)
    │   ├── _helpers.ts             # `b()` wrapper: BENCH_OPTS + DCE-sink
    │   ├── 01-hot-singleton.bench.ts
    │   ├── 02-transient.bench.ts
    │   ├── 03-deep-graph.bench.ts
    │   ├── 04-wide-graph.bench.ts
    │   ├── 05-build-and-resolve.bench.ts
    │   ├── 06-scoped-resolve.bench.ts
    │   └── 07-lazy-resolve.bench.ts
    └── precondition/                       # smoke tests (run BEFORE benches)
        └── typedi-scope-isolation.test.ts  # TypeDI scope must be isolated
```
