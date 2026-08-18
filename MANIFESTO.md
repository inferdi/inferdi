# InferDI Core Architectural Manifesto

This document governs `@inferdi/inferdi` in `packages/inferdi`. Read it before
reviewing any PR that touches the public API, type system, `get()` resolve path,
registration shape, scope semantics, or teardown behavior.

## 1. Philosophy And Promise

### Mission

InferDI proves that TypeScript DI can keep runtime flexibility without giving up
static guarantees. The dependency graph is a TypeScript type. If the compiler
can verify a rule, InferDI must encode that rule in public signatures. Runtime
checks exist for `as`-casts, captured outer containers, dynamic keys, and other
places where TypeScript cannot see the graph.

### Value Proposition

The graph is the type. A missing key, wrong constructor position, duplicate
registration, or singleton-to-scoped leak should fail before production code
runs. InferDI also keeps the runtime contract small: no runtime dependencies, no
decorators, no metadata reflection, no proxy traps, and no framework machinery in
the core package.

Cache-hit resolve stays a single `Map.get()` fast path. Class construction uses
arity-unrolled direct `new Ctor(...)` calls for 0-7 dependencies and a measured
tail path for 8+ dependencies.

If a feature weakens those promises, reject it or move it outside the core.

## 2. Non-Negotiable Pillars

### 2.1 Type-Safety End-To-End

Every public signature must make invalid graph states unrepresentable where
TypeScript can express the rule.

- `register*` accepts `key: K & NoKeyOverlap<K, keyof T>`, where
  `NoKeyOverlap` checks `[K & keyof T]` non-distributively. Literal, broad,
  symbol, and union keys remain supported, while any overlap rejects the whole
  candidate key instead of silently dropping one union member.
- `DepsOf<AllowedDeps<T, L>, A>` checks a `deps` tuple against constructor
  parameters by position and structural assignability.
- `AllowedDeps<T, L>` narrows the container passed into factories. Inside a
  singleton factory, `c.get('scoped')` is a type error.
- Closure-style `registerFactory` receives the lifetime-filtered container. Its
  deps-aware overload receives a resolver limited to the declared sync keys;
  `registerAsyncFactory` receives resolved positional values instead of a
  container. Do not blur these callback contracts.
- `Lazy`, `AsyncLazy`, `Lifetime`, `Spec`, `AsyncSpec`, `LazySpec`,
  `AsyncLazySpec`, `ScopeInputMap`, `WithRequirements`, `DependenciesMap`,
  `SpecMap`, `ContainerOptions`, `Module`, and `Container.ReadyKeys`,
  `Container.SyncReadyKeys`, `Container.Resolve`, `Container.ResolveUnwrapped`,
  `Container.UnwrappedValue`, and `Container.Providers` are public contracts.
  Treat any change to their assignability or inference as an API change even
  when no runtime code changes.
- Generic resolvers use `Container.SyncReadyKeys<C>` for `get()` and
  `Container.ReadyKeys<C>` for `getAsync()`. `.has()` proves registration only;
  it does not prove sync mode or satisfy missing scope inputs.
- A new or changed public type surface needs positive and negative
  `// @ts-expect-error` coverage in `container.test-d.ts` or
  the declarative-async type-test suite. Public diagnostic wording for modules
  or scope inputs also needs its compiler-diagnostic fixture, and emitted
  declarations must keep passing `consumer-dts.ts` with TypeScript 5.2.

Known TypeScript limits must be documented, not hidden. For example, two deps
with the same structural type remain interchangeable unless users introduce a
nominal distinction such as `unique symbol` keys or branded value types.

### 2.2 Zero Decorators, Zero Reflect Metadata

InferDI is plain TypeScript targeting ES2022. Do not add decorators,
`reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata`, TS
transformers, or transpiler plugins.

- The constructor type is the source of truth for dependency types.
- The explicit `deps` tuple is the source of truth for argument order.
- The runtime does not inspect constructor parameter names, emitted metadata, or
  class fields.

Decorators and metadata turn InferDI into a different library. They add runtime
state, toolchain requirements, and cold-start cost that the core package rejects.

### 2.3 Lifetime Is A Type

The core has three registration lifetimes: `singleton`, `scoped`, and `transient`.
Each registration carries its lifetime through `Spec<V, L>` and its public
`lifetime` property.

- A singleton must not depend directly on a scoped or transient service.
  `AllowedDeps<T, L>` enforces this at compile time; the default checked
  contract enforces it at runtime for casts and dynamic registrations. Any
  target lifetime union that may include `'singleton'` uses the singleton-safe
  filter; only a union that excludes singleton may accept short-lived deps.
- `Lazy<V>` and `AsyncLazy<V>` preserve the target lifetime. A singleton
  consumer may inject only a managed companion whose complete target-lifetime
  state is `'singleton'`. Scoped, transient, mixed-lifetime, and
  managed-plus-unmanaged unions remain illegal for singleton consumers.
- The runtime `Registration.lazy` flag must be `true` only for lazy companions
  whose target lifetime is `'singleton'`.
- The runtime `Registration.owned` flag is `true` only for class/factory
  registrations whose created value belongs to the container. It is `false`
  for `registerValue`, `.override()`, lazy companions, scope inputs, and
  transient results.
- `registerValue`, `.override()`, and scope-input values are externally owned.
  Transient results are caller-owned. None enters the teardown queue.
- `.override()` is a test escape hatch. It must preserve the original `kind`,
  `lazy`, and `async` state; stay scope-local; reject declared scope inputs,
  unknown keys, disposed containers, and keys present in the current container's
  local cache. The cache guard catches local singleton/scoped resolutions,
  `registerValue`, and repeated overrides, but cannot observe transient resolves
  or ancestor-owned values resolved through a checked child. Apply overrides
  before resolving the graph even where the runtime guard cannot prove timing.
- `dispose()` touches only instances owned by that container. Parent and child
  containers do not dispose each other.

#### 2.3.1 Async Mode Is Type State

Declarative async services use the same graph, registration map, cache, scope
lookup, ownership rules, and disposal path as synchronous services.

- `registerAsyncFactory` records the final value type in `AsyncSpec<V, L>`, not
  `Promise<V>`. Its positional dependency tuple is checked like a constructor
  tuple and remains readonly because registration retains the classified
  positions.
- Singleton and scoped async registrations cache one native Promise, so
  concurrent `getAsync()` calls join the same initialization. Resolving an
  `AsyncLazy` wrapper alone must not start its target.
- A class with a declarative async dependency becomes async transitively. Its
  target resolves through `getAsync()` and its managed companion becomes
  `AsyncLazy`; a class selected by a sync/async key union remains conservatively
  mixed.
- `get()` rejects declarative async keys in types. `getAsync()` accepts every
  ready key, returns a Promise, and converts synchronous resolver failures into
  rejections without creating another registry or resolution lane.
- A Promise-valued `registerFactory` remains an ordinary synchronous graph entry
  whose value is the Promise itself. Do not silently reclassify this legacy
  contract as `AsyncSpec`.
- `Registration.async` is appended cold metadata used to classify dependencies
  during registration. The resolve hot path must never read it.

#### 2.3.2 Scope Readiness Is Type State

Scope inputs describe application-owned values that become available only when
opening child scopes.

- `declareScopeInputs<Inputs>()` is type-only and must not mutate the runtime
  container.
- Declarations accept required finite string or symbol keys. Numeric keys,
  `__proto__`, broad index signatures, optional properties, unions with
  different key sets, and collisions with the existing graph are rejected.
- `createScope(inputs)` may provide any subset of missing inputs. Readiness
  propagates through dependent registrations, nested scopes inherit already
  provided inputs, and only ready keys become resolvable.
- Supplied values are shallow-snapshotted into the child cache, stay
  application-owned, cannot be registered over or overridden, and are excluded
  from `Container.Providers<C>`.

#### 2.3.3 Modules Are Requirement Contracts

`Module<TRequirements, TProvides>` describes a reusable graph transformation,
not an exact whole-container alias.

- The actual graph may contain extra entries, but every requirement must match
  service assignability, exact lifetime, sync/async state, managed-lazy mode,
  scope-input identity, and readiness.
- The module callback sees only its declared requirements. The returned graph
  preserves every actual entry and adds the declared outputs.
- Output keys must not collide with the actual graph. Scope-input requirements
  already satisfied by the caller are removed from the returned output state.
- Generic `<T>(c: Container<T>) => ...` helpers cannot prove arbitrary new keys
  against the `DependenciesMap` upper bound. Use inline `.use()` lambdas or a
  named `Module<TRequirements, TProvides>`.

### 2.4 The Resolve Hot Path Stays Small

The first operation in `get()` is the local cache lookup:

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

Do not add work before that lookup.

- Explicit `undefined` values are represented with `UNDEFINED_MARKER`; do not
  reintroduce a second `cache.has(key)` lookup on the cache-hit path.
- `_disposed`, registration lookup, parent lookup, cycle checks, lifetime
  checks, and singleton-stack mutation all live after the cache fast path.
- Default trees check local registrations before walking the exact parent chain.
  They do not retain parent-lookup snapshots, so mutations remain observable
  without invalidation bookkeeping or per-scope lookup metadata.
- Constructor invocation stays arity-unrolled for 0-7 args. The 8+ path uses
  `Reflect.construct` with a packed array built by `push`.
- `get()` stays synchronous. The shared `resolving` array and `singletonStack`
  work only because one resolve and every declarative async dependency preflight
  run atomically on the call stack. `getAsync()` adds a Promise boundary around
  the same resolver and never mutates these stacks from a continuation.
- Declarative async registrations share `regs`, `cache`, scope lookup, ownership,
  and disposal with sync registrations. `Registration.async` is cold metadata
  used during registration-time dependency classification. `get()` never reads it.
- `{fast: false}` is the default checked mutable contract. `{fast: true}` removes
  cycle and lifetime checks after the local cache fast path, reads the registry
  owner directly, and mirrors delegated singletons into the local cache. A fast
  tree is a fixed-graph contract: finish every `register*`, `.use()`, and
  `.override()` before the first resolve or `createScope()`, and dispose children
  before ancestors. Only the literal value `true` enables it; cast or unknown
  option values fail safe to the checked contract.
- Keep the hot `Registration` fields ordered `{kind, lazy, fn, owned}`. The
  optional `async` marker may only be appended after them and must stay off the
  resolve path.

`packages/inferdi/__tests__/container.bench.ts` is not CI-enforced. Reviewers
must demand benchmark output for changes to `get()`, registration object shape,
cache representation, scope lookup, lazy companions, or constructor invocation.
A local regression above 5% in a relevant scenario blocks merge unless the PR
includes a narrow, written justification.

### 2.5 Zero Runtime Dependencies

`@inferdi/inferdi` has no runtime dependencies. Keep it that way.

The published bundle must stay strictly below 3 KiB (3072 bytes) gzipped. CI
enforces this budget with `pnpm run test:bundle-size`; reviewers should still
inspect size changes in PRs that add code to the core implementation or public
helpers.

### 2.6 Disposal Is Ownership Enforcement

Disposal closes only values owned and cached by the current container. It is
idempotent, re-entrancy-safe, and independent across parents and children.

- Mark the container disposed, snapshot and de-duplicate `owned`, then clear
  `owned`, `cache`, `regs`, `scopeInputs`, and `parent` before invoking user
  disposers. Re-entrant resolution must see a torn-down container immediately.
- Preserve first-creation LIFO order. Duplicate cache entries and distinct async
  factories that resolve to the same resource must close that resource once.
- Async `dispose()` shares one in-flight completion Promise, unwraps cached
  async-factory Promises, probes `Symbol.asyncDispose` → `Symbol.dispose` →
  `.dispose()`, continues after failures, and throws one error or an
  `AggregateError` for many.
- Sync `[Symbol.dispose]()` invokes only synchronous protocols. A cached Promise
  or Promise-returning plain `.dispose()` is reported as misuse; do not start
  invisible background cleanup to hide the error.
- `registerValue`, `.override()`, scope inputs, lazy wrappers, and transient
  values stay outside container teardown because ownership never transferred.

## 3. PR Filter

For every PR touching `packages/inferdi/src`, `packages/inferdi/package.json`,
`packages/inferdi/jsr.json`, or core tests, answer these questions in review:

1. Does the change preserve compile-time graph guarantees, or does it move a
   rule into runtime checks without a documented TypeScript limitation?
2. Does it touch `get()` cache-hit behavior, registration object shape, scope
   lookup, lazy resolution, or constructor invocation? If yes, where is the
   benchmark evidence?
3. Does it add a runtime dependency, decorator support, metadata reflection,
   proxy-based resolve behavior, or a transpiler requirement to the core package?

Reject the PR if #1 moves a type rule into runtime without cause, #2 lacks
benchmark evidence, or #3 is yes.

## 4. Strict-Control Checklist

Any change matching an item below needs explicit PR justification.

### Hot Path And Runtime Shape

- [ ] Work added before `cache.get(key)` in `get()`?
- [ ] `UNDEFINED_MARKER`, `cache`, `regs`, parent lookup, or `Registration`
      shape changed?
- [ ] Hot `Registration` property order changed from `{kind, lazy, fn, owned}`, or
      the optional `async` marker moved before those fields?
- [ ] Checked-contract local-registry lookup moved after parent lookup?
- [ ] `Proxy`, `Reflect.get`, `Object.defineProperty`, or metadata lookup added
      to resolve?
- [ ] `get()` converted to `async`?
- [ ] `get()` started reading `Registration.async` or doing readiness work?
- [ ] Arity-unrolled branches for 0-7 constructor args removed or reshaped?
- [ ] Fast scopes stopped reading the registry owner directly or mirroring only
      delegated singletons?

### Type System

- [ ] Duplicate-key guard weakened outside `.override()`?
- [ ] `string | symbol` narrowed to `string` in any public key constraint?
- [ ] `AllowedDeps`, `LazySpec`, `AsyncLazySpec`, async propagation, readiness,
      or lifetime filtering weakened?
- [ ] `NoKeyOverlap`, `ScopeInputMap`, `WithRequirements`, module compatibility,
      `SpecMap`, or namespace helper types changed?
- [ ] Scope-input declarations can accept optional, numeric, broad, variant, or
      colliding keys, or can be resolved before provision?
- [ ] A named module can hide missing/incompatible requirements or collide its
      outputs with the actual graph?
- [ ] New unsound `any`, `unknown as`, or `// @ts-ignore` added in `src/`?
- [ ] Public type behavior changed without positive/negative type tests,
      diagnostic fixtures where applicable, and the declaration consumer check?

### Dependencies And Build

- [ ] Runtime dependency added to `packages/inferdi/package.json`?
- [ ] Peer dependency on `reflect-metadata`, `tslib`, or framework glue added?
- [ ] Strict `< 3 KiB` gzip budget exceeded or its CI check weakened?
- [ ] TS plugin, transformer, decorator flag, or metadata emit required?

### Lifecycle And Disposal

- [ ] `dispose()` or `[Symbol.dispose]()` stops setting `_disposed` before
      invoking disposers?
- [ ] `owned`, `cache`, `regs`, `scopeInputs`, or `parent` clearing moved after
      disposer invocation?
- [ ] Parent detachment removed?
- [ ] Owned-instance de-duplication no longer preserves first-creation LIFO order?
- [ ] LIFO disposal order changed?
- [ ] Async disposer probe order changed from `Symbol.asyncDispose` to
      `Symbol.dispose` to `.dispose()`?
- [ ] Cached async-factory Promises stopped being awaited before the probe, or
      shared resolved resources can be disposed twice?
- [ ] Concurrent async `dispose()` calls stopped sharing one completion Promise?
- [ ] Multiple teardown failures no longer become `AggregateError`?
- [ ] Sync teardown no longer reports async-resource misuse?

### Escape Hatches And Dynamic Use

- [ ] `.override()` local-cache timing guard weakened, or its documented limits
      for transient and ancestor-owned resolutions hidden?
- [ ] `.override()` stopped preserving `kind`, `lazy`, or `async` state, became
      non-local, or became available for declared scope-input keys?
- [ ] `.has()` turned into a resolver or started mutating caches?
- [ ] `.has()` began claiming readiness or synchronous resolution safety?
- [ ] A fast tree became mutable after activation, or its child-before-ancestor
      disposal contract was weakened?
- [ ] Runtime-constructed keys promoted as the primary API?
- [ ] Auto-wire, auto-inject, parameter-name injection, filesystem scanning, or
      module discovery added to core?

## 5. Conscious Trade-Offs

Document these choices instead of "fixing" them.

| Trade-off | Reason |
|---|---|
| No ES5 or pre-ES2022 target | `Map`, `Symbol`, `WeakRef`, `Reflect.construct`, `Symbol.dispose`, and `Symbol.asyncDispose` are foundational. The package polyfills only disposal symbols for runtimes that lack them. Node 16+ remains the floor. |
| No decorator API | Decorator-based DI is a different library. |
| No runtime metadata | Constructor signatures and explicit `deps` tuples provide the graph. Runtime introspection would add dependencies and weaker failure modes. |
| No nominal distinction for identical structural deps | TypeScript uses structural assignability. If two keys expose the same shape, `DepsOf` cannot know the user's semantic intent. Use branded types or `unique symbol` keys when order matters between same-shape services. |
| No async `get()` | `get()` remains synchronous. `getAsync()` wraps the same synchronous resolver and returns a Promise without creating another registry, cache, or resolution lane. |
| Promise-valued `registerFactory` stays synchronous graph state | Existing factories may intentionally expose a Promise as their service value. Only `registerAsyncFactory` creates `AsyncSpec` and declarative async propagation. |
| No detection of dynamic cycles after a Promise boundary | Declarative async edges run through synchronous preflight and use the existing cycle guard. Calls from legacy Promise-valued factories or captured containers after `await` run after the resolve stack is cleared. Split that cycle or hoist shared initialization. |
| No runtime lifetime detection after an async boundary | `AllowedDeps` still blocks invalid typed factories, but `as`-casts and captured outer containers used after `await` run after `singletonStack` has been cleared. Full defense-in-depth would require async-context tracking. Keep dependency reads in the synchronous factory prelude. |
| No auto-cycle-breaking | Cycles are architectural defects unless one side is an explicit lazy singleton companion. InferDI detects supported runtime cycles and reports them; it does not invent proxies or partial instances. |
| No generic `<T>(c: Container<T>) => ...` modules | `keyof T` collapses to the `DependenciesMap` upper bound inside the generic body. Use inline `.use()` lambdas or `Module<TRequirements, TProvides>` with declared requirements. |
| No implicit scope-input source | `declareScopeInputs()` is type-only. Applications pass owned values explicitly to `createScope(inputs)`; core does not read ambient request context or `AsyncLocalStorage`. |
| No dynamic DI resolver API | `.has(key)` is the sanctioned registration probe. It does not prove readiness or sync mode; static ready keys should use `.get()` or `.getAsync()` directly. |
| No production override story | `.override()` exists for tests and hot-reload fixtures, and its timing check can observe only the local cache. Production graph selection belongs in `.use()` or normal builder code. |
| Fast mode is a fixed-graph contract | `{fast: true}` gains flatter lookup and singleton mirroring by trusting topology, lifecycle, cycle, and lifetime invariants. The checked mutable contract remains the default. |
| No cascading parent-to-child disposal | Each container owns its own instances. Cascading disposal would make `dispose()` a non-local side effect and break scope ownership. |
| No hooks, interceptors, or middleware on resolve | That is AOP. It would add work to the hot path and blur the core contract. |
| No framework glue in core | Framework adapters belong in adapter packages. Core stays dependency-free and framework-agnostic. |
| No graph-analysis engine in core | Repository notes about a possible `@inferdi/graph` are proposals, not current API. Any future dev/CI companion must remain outside production resolution and must not alter the hot registration shape. |

## 6. Non-Goals

InferDI will not become:

- A universal IoC framework.
- A decorator or reflection container.
- A request-context system or `AsyncLocalStorage` replacement.
- An auto-wiring scanner.
- A provider-definition DSL or runtime module-discovery system.
- A graph-analysis, rules, reporting, or snapshot engine in the production core.
- A plugin host for resolve-time middleware.
- A compatibility layer for legacy DI containers.

Final rule: the graph is the type, and the type is the contract.
