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

- `register*` uses `K & ([K] extends [keyof T] ? never : unknown)` so duplicate
  keys fail at compile time and the offending key remains visible in the error.
- `DepsOf<AllowedDeps<T, Kind>, A>` checks a `deps` tuple against constructor
  parameters by position and structural assignability.
- `AllowedDeps<T, Kind>` narrows the container passed into factories. Inside a
  singleton factory, `c.get('scoped')` is a type error.
- `Spec`, `LazySpec`, `SpecMap`, `Module`, `Container.Resolve`,
  `Container.ResolveUnwrapped`, `Container.UnwrappedValue`, and
  `Container.Providers` are part of the contract. Treat changes to them as
  public API changes.
- A new or changed public type surface needs positive type tests and negative
  `// @ts-expect-error` tests in
  `packages/inferdi/__tests__/container.test-d.ts`.

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

The core has three registration kinds: `singleton`, `scoped`, and `transient`.
Each registration carries its lifetime through `Spec<V, Kind>`.

- A singleton must not depend directly on a scoped or transient service.
  `AllowedDeps<T, Kind>` enforces this at compile time; `strict: true` enforces
  it at runtime for casts and dynamic registrations.
- `Lazy<V>` preserves the target lifetime. A singleton consumer may inject only
  `LazySpec<V, 'singleton'>`. `Lazy<scoped>` and `Lazy<transient>` remain legal
  for scoped and transient consumers, and remain illegal for singleton
  consumers.
- The runtime `Registration.lazy` flag must be `true` only for lazy companions
  whose target kind is `'singleton'`.
- The runtime `Registration.owned` flag is `true` only for class/factory
  registrations whose created value belongs to the container. It is `false`
  for `registerValue`, `.override()`, and lazy companions.
- `registerValue` and `.override()` values are externally owned. They do not
  enter the teardown queue.
- `.override()` is a test escape hatch. It must preserve the original `kind` and
  `lazy` flag, stay scope-local, reject unknown keys, reject disposed containers,
  and reject keys already resolved on the same container.
- `dispose()` touches only instances owned by that container. Parent and child
  containers do not dispose each other.

### 2.4 The Resolve Hot Path Stays Small

The first operation in `get()` is the local cache lookup:

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

Do not add work before that lookup.

- Explicit `undefined` values are represented with `UNDEFINED_MARKER`; do not
  reintroduce a second `cache.has(key)` lookup on the cache-hit path.
- `_disposed`, local registration lookup, parent lookup, `lookupCache`, cycle
  checks, lifetime checks, and singleton-stack mutation all live after the cache
  fast path.
- Local registrations must be checked before parent-chain lookup. `lookupCache`
  is a cold-path memo for parent hits only.
- Constructor invocation stays arity-unrolled for 0-7 args. The 8+ path uses
  `Reflect.construct` with a packed array built by `push`.
- `get()` stays synchronous. The shared `resolving` array and `singletonStack`
  work only because one resolve runs atomically on the call stack.
- `strict: false` may remove runtime cycle and lifetime checks after the cache
  fast path. It must not change observable cache-hit semantics.

`packages/inferdi/__tests__/container.bench.ts` is not CI-enforced. Reviewers
must demand benchmark output for changes to `get()`, registration object shape,
cache representation, scope lookup, lazy companions, or constructor invocation.
A local regression above 5% in a relevant scenario blocks merge unless the PR
includes a narrow, written justification.

### 2.5 Zero Runtime Dependencies

`@inferdi/inferdi` has no runtime dependencies. Keep it that way.

The published bundle should stay below 2.5KB gzipped. CI does not enforce that
budget today, so reviewers must check bundle size for PRs that add code to the
core implementation or public helpers.

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
- [ ] `UNDEFINED_MARKER`, `cache`, `regs`, `lookupCache`, or `Registration`
      shape changed?
- [ ] `Registration` property order changed from `{kind, lazy, fn, owned}`?
- [ ] Local-registry lookup moved after parent lookup?
- [ ] `Proxy`, `Reflect.get`, `Object.defineProperty`, or metadata lookup added
      to resolve?
- [ ] `get()` converted to `async`?
- [ ] Arity-unrolled branches for 0-7 constructor args removed or reshaped?

### Type System

- [ ] Duplicate-key guard weakened outside `.override()`?
- [ ] `string | symbol` narrowed to `string` in any public key constraint?
- [ ] `AllowedDeps`, `LazySpec`, or lifetime filtering weakened?
- [ ] `NoKeyOverlap`, `Module`, `SpecMap`, or namespace helper types changed?
- [ ] New unsound `any`, `unknown as`, or `// @ts-ignore` added in `src/`?
- [ ] Public type behavior changed without type tests?

### Dependencies And Build

- [ ] Runtime dependency added to `packages/inferdi/package.json`?
- [ ] Peer dependency on `reflect-metadata`, `tslib`, or framework glue added?
- [ ] Bundle budget exceeded without review approval?
- [ ] TS plugin, transformer, decorator flag, or metadata emit required?

### Lifecycle And Disposal

- [ ] `dispose()` or `[Symbol.dispose]()` stops setting `_disposed` before
      invoking disposers?
- [ ] State clearing moved after disposer invocation?
- [ ] Parent detachment or `lookupCache` clearing removed?
- [ ] LIFO disposal order changed?
- [ ] Disposer probe order changed from `Symbol.asyncDispose` to
      `Symbol.dispose` to `.dispose()`?
- [ ] Multiple teardown failures no longer become `AggregateError`?
- [ ] Sync teardown no longer reports async-resource misuse?

### Escape Hatches And Dynamic Use

- [ ] `.override()` allowed after first resolve?
- [ ] `.override()` stopped preserving `kind` or `lazy`?
- [ ] `.has()` turned into a resolver or started mutating caches?
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
| No async `get()` | The current cycle and lifetime guards use shared synchronous call-stack state. An async resolve API would need separate per-resolve bookkeeping. |
| No detection of cycles between async factories | After an `await`, the synchronous resolve stack is gone and pending promises may satisfy later `c.get()` calls. Detecting this would add async tracking to resolve. Split the cycle, hoist shared initialization, or use `Lazy<singleton>` where legal. |
| No runtime lifetime detection after an async boundary | `AllowedDeps` still blocks invalid typed factories, but `as`-casts and captured outer containers used after `await` run after `singletonStack` has been cleared. Full defense-in-depth would require async-context tracking. Keep dependency reads in the synchronous factory prelude. |
| No auto-cycle-breaking | Cycles are architectural defects unless one side is an explicit lazy singleton companion. InferDI detects supported runtime cycles and reports them; it does not invent proxies or partial instances. |
| No generic `<T>(c: Container<T>) => ...` modules | `keyof T` collapses to the `DependenciesMap` upper bound inside the generic body. Use inline `.use()` lambdas or `Module<TIn, TOut>` with a known input shape. |
| No dynamic DI resolver API | `.has(key)` is the sanctioned dynamic probe. Static keys should use `.get()` directly. |
| No production override story | `.override()` exists for tests and hot-reload fixtures. Production graph selection belongs in `.use()` or normal builder code. |
| No cascading parent-to-child disposal | Each container owns its own instances. Cascading disposal would make `dispose()` a non-local side effect and break scope ownership. |
| No hooks, interceptors, or middleware on resolve | That is AOP. It would add work to the hot path and blur the core contract. |
| No framework glue in core | Framework adapters belong in adapter packages. Core stays dependency-free and framework-agnostic. |

## 6. Non-Goals

InferDI will not become:

- A universal IoC framework.
- A decorator or reflection container.
- A request-context system or `AsyncLocalStorage` replacement.
- An auto-wiring scanner.
- A plugin host for resolve-time middleware.
- A compatibility layer for legacy DI containers.

Final rule: the graph is the type, and the type is the contract.
