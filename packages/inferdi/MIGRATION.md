# Migration Guide

This file collects the breaking-change checklists for each major version of `@inferdi/inferdi`.
For new features and fixes within a major line, see the release notes on the GitHub Releases page.

## Table of Contents

- [Migration to 5.0](#migration-to-50)
- [Migration to 4.0](#migration-to-40)
- [Migration to 3.0](#migration-to-30)
- [Migration to 2.0](#migration-to-20)

## Migration to 5.0

v5 is an **adapter-only** release. `@inferdi/inferdi` core is unchanged — the
version bump exists only to keep the published packages in lockstep. It
harmonizes the five framework adapters (`@inferdi/fastify`, `@inferdi/express`,
`@inferdi/hono`, `@inferdi/koa`, `@inferdi/elysia`) onto one contract: the same
option vocabulary (`createScope`, `setupScope`, `disposeScope`, `autoDispose`,
`onDisposeError`), the same exported types (`MaybePromise`, `InferdiScope`,
`InferdiRoot`, `InferdiScopeOf`), and one cleanup-ownership model — a disposal
failure after the response is produced is observed/logged and never corrupts the
response.

Three contracts are now identical across the adapters:

- **Setup-failure errors.** When `setupScope` fails, only the original setup
  error is surfaced. A disposal failure during that teardown goes to
  `onDisposeError`, else to the adapter's sink (`console.error`, `request.log`, or
  `ctx.app.emit('error')`) — it is **never** aggregated into the surfaced error.
- **Failed requests always dispose.** `skipInferdiDispose` suppresses cleanup only
  for a **successful** response; a request that fails with an error disposes its
  scope regardless of the marker. (`autoDispose: false` still keeps app ownership.)
  Express is the documented exception — see below.
- **Cleanup hooks see the public scope handle.** `disposeScope` / `autoDispose` /
  `onDisposeError` observe the scope under the framework-native slot (`request.di`,
  `ctx.state[key]`, `c.var[key]`, Elysia context key) during cleanup.

If you use only the core container, no changes are required. Adapter changes:

### `@inferdi/fastify`

- **`logDisposeError` → `onDisposeError`.** Rename the option. Semantics widen to
  the family sink: returning normally marks the error handled; if omitted (or if
  the handler itself throws) the failure is logged via `request.log.error(...)`.
  The handler signature gains `reply`: `(error, request, reply)`.
- **`InferdiScope.dispose()` is now `MaybePromise<void>`** (was `Promise<void>`).
  A synchronous `dispose()` now resolves the response in the same tick without
  scheduling a microtask. Async `dispose()` keeps working unchanged.
- **New options:** `disposeScope` (override disposal) and `autoDispose`
  (`boolean | (request, reply) => MaybePromise<boolean>`).
- **New exports:** `skipInferdiDispose(request)` for routes that own disposal past
  the response, and the `InferdiScopeOf<Root>` type helper.
- Setup-failure semantics are unchanged: the original `setupScope` error is always
  the thrown error; a disposal failure during that teardown goes to the sink and
  is never aggregated into the thrown error.
- **`request.di` now stays assigned while cleanup hooks run.** `disposeScope` /
  `autoDispose` / `onDisposeError` observe `request.di === scope` (it is cleared
  only after cleanup finishes), matching the other adapters. Setup-failure cleanup
  hooks see it too, but it is cleared before Fastify's error handler runs. If you
  relied on `request.di` being `null` inside these hooks, read the scope from the
  first hook argument instead.
- **A failed request disposes even when `skipInferdiDispose` was called.** An
  `onError` hook marks the request failed, so the marker now suppresses cleanup
  only for a successful response. Client aborts still honor the marker (manual
  ownership).

### `@inferdi/hono`

- **Disposal failures after `next()` no longer replace the response.** Previously a
  `disposeScope` or `autoDispose`-predicate failure on a successful request could
  reach `app.onError` and turn a 200 into a 500. They are now logged via
  `console.error` (or routed to `onDisposeError`) and the produced response is
  preserved. A route error thrown by the handler still propagates to `onError`
  exactly as before.
- `onDisposeError`'s default sink is `console.error`.
- **Setup failure surfaces only the original error.** Previously a setup failure
  whose teardown also failed threw an `AggregateError`; now it rethrows just the
  setup error and routes the cleanup failure to `onDisposeError` / `console.error`.
- A route that fails still disposes its scope even after `skipInferdiDispose(c)`
  (unchanged — Hono already forced disposal on `routeFailed`).

### `@inferdi/express`

- Response-completion disposal was realigned to the Node `finish` / `close` model
  shared with `@inferdi/koa`. Existing behavior — manual-ownership fast path
  (`autoDispose: false`), destroyed-response force-clean, `req.di` assignment
  guard, and `next(err)` for setup/activation failures — is preserved.
- **`onDisposeError` is now a per-error sink** and is consulted in **both** the
  setup-teardown and response-completion phases (previously setup-cleanup
  failures bypassed it). When both an `autoDispose` predicate and disposal fail,
  it is called once per error (matching the other adapters) instead of once with
  a pre-built `AggregateError`.
- **Setup failure surfaces only the original error** via `next(err)`; a cleanup
  failure during teardown goes to `onDisposeError` / `console.error` and is never
  aggregated into the error passed to `next`.
- **Documented limitation:** Express cannot force-dispose on a handled route
  error. Its callback middleware never observes a downstream exception, and
  cleanup runs from the Node `finish` / `close` event where a handled error is
  indistinguishable from a normal response. So if a route calls
  `skipInferdiDispose(req)` and then fails, the scope stays application-owned —
  dispose it from your own error path.

### `@inferdi/koa`

- **Setup failure surfaces only the original error.** A teardown failure during a
  failed `setupScope` now goes to `onDisposeError` / `ctx.app.emit('error')`
  instead of being aggregated into the thrown error.
- **A downstream error disposes even after `skipInferdiDispose(ctx)`.** The
  middleware now catches a rejected `await next()` and marks the request failed,
  so the marker suppresses cleanup only for a successful response.

### `@inferdi/elysia`

- **Setup failure surfaces only the original error.** A teardown failure during a
  failed `setupScope` now goes to `onDisposeError` / `console.error` instead of
  being aggregated into the thrown error. (Failed requests already disposed via
  the `error` lifecycle phase.)

## Migration to 4.0

v4 tightens the semantics of `Lazy<T>`. In v3 a `Lazy` companion acted as a
universal lifetime escape: a singleton consumer could inject `Lazy<scoped>` or
`Lazy<transient>` because the runtime guard was bypassed by an unconditional
`lazy: true` flag, and the compile-time `AllowedDeps` filter passed any
`Lazy<unknown>` through structurally. v4 makes `Lazy<T>` preserve the target's
lifetime — `Lazy<singleton>` is the only Lazy variant a singleton may take, and
the rule is enforced at both the type level and the strict-mode runtime.
Non-singleton consumers are unaffected: a scoped or transient service may still
inject any `Lazy<*>`.

### What changed

- **`AllowedDeps<T, 'singleton'>` no longer admits arbitrary `Lazy<V>`.** The
  filter now requires `LazySpec<V, 'singleton'>` (the managed companion shape
  produced by the `lazyKey` parameter). A hand-rolled
  `Spec<Lazy<V>, 'transient'>` registered via `registerValue` or
  `registerFactory` is treated as a plain transient and is no longer
  singleton-safe.
- **New exported type `LazySpec<V, TargetKind>`.** Extends
  `Spec<Lazy<V>, 'transient'>` with a `lazyOf: TargetKind` field so the type
  system can distinguish managed companions from raw `Lazy<V>` values.
- **Runtime guard.** The `lazy: true` flag in `Registration` is now set only
  when the target kind is `'singleton'`. For other targets the companion is
  rejected by the same strict-mode lifetime guard that catches direct
  short-lived injections — handy for `as`-cast bypass cases.
- **Captured-scope footgun is no longer a documented limitation.** Injecting
  `Lazy<scoped>` into a singleton was previously a known-but-allowed pattern
  whose first `.get()` froze the scoped instance onto the singleton's owner.
  That pattern is now a compile error; the captured-scope behaviour persists
  only inside non-singleton consumers, where it is the intended semantics.

### One-line fixes

1. **Singleton consumer with `Lazy<scoped>` — promote the target to singleton or scope the consumer.**
   ```ts
   // v3
   .registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
   .registerClass('app', AppService, ['reqLazy'], 'singleton')

   // v4 — either move the target up the lifetime chain:
   .registerClass('req', RequestContext, [], 'singleton', 'reqLazy')
   .registerClass('app', AppService, ['reqLazy'], 'singleton')

   // ...or move the consumer down:
   .registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
   .registerClass('app', AppService, ['reqLazy'], 'scoped')
   ```
   For genuine per-request access inside a long-lived service use
   `AsyncLocalStorage` — that is the use case the DI container was never able
   to model honestly.

2. **Explicit `Container<{...}>` annotations for lazy companions — use `LazySpec`.**
   ```ts
   // v3
   type Deps = SpecMap<{ clock: Clock }> & { clockLazy: Spec<Lazy<Clock>, 'transient'> }

   // v4
   type Deps = SpecMap<{ clock: Clock }> & { clockLazy: LazySpec<Clock, 'singleton'> }
   ```

### Mismatches

- **Hand-rolled `Spec<Lazy<V>, 'transient'>`** registered via
  `registerValue`/`registerFactory` is no longer accepted by a singleton
  consumer. If you relied on that as a manual lazy companion, switch to the
  `lazyKey` parameter of `registerClass`.
- **Existing example breakage.** Any snippet that registered the target as
  `transient` / `scoped` and injected the companion into a singleton (a
  common pattern in v3 documentation) becomes a TS error. The canonical
  example in `examples/_shared/container.ts` was updated to use a singleton
  target.
- **Strict-mode runtime diagnostic.** For an `as`-cast bypass that lands a
  `Lazy<scoped|transient>` in a singleton, the message reads
  `Singleton "<X>" cannot depend on transient "<lazyKey>"` (the wrapper itself
  is transient). Future versions may refine this to mention the companion's
  target kind.

### What's new in 4.0

- **`LazySpec<V, TargetKind>` export.** Use it for explicit `Container<...>`
  annotations and `Module<TIn, TOut>` shapes whenever you previously wrote
  `Spec<Lazy<V>, 'transient'>` for a managed companion.
- **`override()` preserves the lazy-exempt flag.** Overriding a
  `Lazy<singleton>` companion in a test no longer trips the runtime lifetime
  guard when a singleton consumer injects the mock — the override walk-up now
  copies both `kind` and `lazy` from the original registration.

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
