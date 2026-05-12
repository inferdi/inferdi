# Migration Guide

This file collects the breaking-change checklists for each major version of `@inferdi/inferdi`.
For new features and fixes within a major line, see the release notes on the GitHub Releases page.

## Table of Contents

- [Migration to 3.0](#migration-to-30)
- [Migration to 2.0](#migration-to-20)

## Migration to 3.0

v3 lifts the lifetime guard from runtime into the type system. The change is
backwards-incompatible at the **type level** — runtime behaviour is preserved,
the runtime guard remains as defense-in-depth. Most user code that does not
explicitly type `Container<...>` or `Module<TIn, TOut>` migrates automatically:
the fluent `register*` chain still infers the right type, and
`Container.Resolve<typeof builder>` still returns the same flat
`{ key: ServiceType }` shape.

### What changed

- **`DependenciesMap` now carries lifetime kind.** Each entry is
  `Spec<V, Kind>` (an interface with `readonly type: V; readonly kind: K`)
  instead of a bare service type. Three new exports support this:
  `RegistrationKind`, `Spec<V, K>`, `SpecMap<M, K = 'singleton'>`.
- **`registerFactory`'s `c` is structurally narrowed.** For a singleton
  factory, `c` only exposes singleton keys and `Lazy<*>` companions. Reading
  a scoped or transient key inside a singleton factory body is a TypeScript
  error, not a runtime exception.
- **`registerClass`'s `deps` tuple is filtered the same way.** A singleton
  target cannot list a scoped/transient key in its `deps`.
- **`override(key, value)`** now preserves the original `kind` (read via a
  parent walk-up). Previously it always wrote `singleton`, which was
  invisible at the type level but observable as a leaked instance lifetime.
  An override on a key that is not registered anywhere in the scope chain
  now throws `Cannot override "<key>": key is not registered`.

### One-line fixes

1. **Explicit `Container<{...}>` annotations — wrap in `SpecMap`.**
   ```ts
   // v2
   const c = new Container() as Container<{ a: A; b: B }>
   // v3
   const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
   ```

2. **Named `Module<TIn, TOut>` — wrap each side in `SpecMap`, or write `Spec<...>` for mixed kinds.**
   ```ts
   // v2
   const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

   // v3 — all singleton
   const mod: Module<SpecMap<{ cfg: Config }>, SpecMap<{ db: Db }>> = (c) => ...

   // v3 — mixed kinds (scoped input)
   const mod: Module<
     SpecMap<{ cfg: Config }> & { req: Spec<ReqCtx, 'scoped'> },
     SpecMap<{ handler: Handler }>
   > = (c) => ...
   ```

3. **`Container.Resolve<C>` consumers — no change required.** The type now
   unwraps `Spec<V, K>` back to `V`, so `Container.Resolve<typeof c>` still
   returns `{ logger: Logger; db: Db }`.

### Mismatches you may need to address

- **Singleton factories that resolved a scoped/transient dep at runtime.**
  These compiled in v2 because the runtime guard fires per-resolve. In v3
  they fail at the type level. Either change the consumer's kind to
  `'scoped'` (if it was singleton by accident), or introduce a
  `Lazy<*>` companion and inject the lazy key.
- **`override` on a not-registered key.** Previously silently materialised a
  fresh singleton. Now throws; register the key first (e.g. with
  `.registerClass`/`.registerFactory`) before calling `.override`.

### What's new in 3.0

- **Compile-time lifetime guard.** The flagship feature of this release.
  Singletons cannot inject scoped/transient deps directly via `deps` or
  through a `registerFactory((c) => ...)` body — the compiler rejects it
  before code ever runs. The runtime guard still fires as defense-in-depth
  for `as`-cast bypasses. See the
  [Strict Lifetime Guards](./README.md#strict-lifetime-guards) section.

- **`ContainerOptions` interface, `new Container({ strict: false })`** —
  optional opt-out of the runtime cycle / lifetime guard for applications
  that have audited their graph and trust the compile-time guard. Skips
  the `try`/`finally`, `singletonStack` push/pop, and the cycle bookkeeping
  inside `get()`. Cache fast-paths (warm singleton, warm lazy) run upstream
  of the guard and are unaffected. The flag is inherited by every child
  spawned via `createScope()`. Default is `strict: true` — **existing code
  needs no change**. See the
  [Fast Mode](./README.md#fast-mode-new-container-strict-false) section
  in the README for the trade-offs (cycles become `RangeError`, lifetime
  violations through `as`-casts become silent leaks).

- **`override(key, value)` preserves the original kind via parent walk-up.**
  `root.createScope().override('db', mock)` now keeps the scoped/transient
  kind of the original registration instead of silently coercing to
  singleton. Existing tests that overrode singleton keys are unaffected.

- **`RegistrationKind`, `Spec<V, K>`, `SpecMap<M, K>`** are now public
  exports. Use them when typing `Container<...>` explicitly or writing
  named `Module<TIn, TOut>` builders.

## Migration to 2.0

Two breaking changes vs 1.x — both have a one-line fix:

1. **`container.cradle` removed.** Use `container.get(key)` everywhere. If you destructured the cradle, replace with explicit `.get()` calls or destructure the result of one `.get()`:
   ```ts
   // 1.x
   const { db, logger } = container.cradle
   // 2.x
   const db     = container.get('db')
   const logger = container.get('logger')
   ```
2. **`registerClass(..., lazy: true)` → explicit `lazyKey` companion.** The boolean flag is gone; pass the desired companion key (string or symbol) instead. The runtime semantics are identical:
   ```ts
   // 1.x
   .registerClass('clock', Clock, [], 'transient', true)
   // 2.x
   .registerClass('clock', Clock, [], 'transient', 'clockLazy')
   ```

Everything else — `register*` accumulation, `Module<TIn, TOut>`, `Container.Resolve<C>`, lifetime guards, `using` / `await using`, `AggregateError` teardown — is unchanged.

### What's new in 2.0

- **String *or* symbol keys** in every `register*` method. Mix freely in the same container; `deps` arrays, `lazyKey`, factory bodies and `Module<TIn, TOut>` all accept both. See the [Symbol Keys](./README.md#symbol-keys) section in the README for patterns and the performance tip.
- **`Ancestor container is disposed (key: "...")`** — when a child scope tries to resolve a key that lived on an already-disposed parent, the error is now precise instead of the misleading `Key "..." not found`.
