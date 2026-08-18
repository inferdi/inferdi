# Migration Guide

This file collects the breaking-change checklists for each major version of `@inferdi/inferdi`.
For new features and fixes within a major line, see the release notes on the GitHub Releases page.

## Table of Contents

- [Migration to 6.0](#migration-to-60)
- [Migration to 5.0](#migration-to-50)
- [Migration to 4.0](#migration-to-40)
- [Migration to 3.0](#migration-to-30)
- [Migration to 2.0](#migration-to-20)

## Migration to 6.0

This section assumes an upgrade from the latest stable v5 release, `5.0.7`.
Upgrade every installed `@inferdi/*` package to `6.0.0` in the same change;
the adapters declare `@inferdi/inferdi@^6.0.0` as a peer dependency.

### Upgrade checklist

1. Replace `RegistrationKind` with `Lifetime`, and replace structural
   `Spec.kind` fields with `Spec.lifetime`.
2. Replace `ContainerOptions.strict` with `fast`, preserving the inverted
   boolean meaning described below.
3. Replace public `new Container(parent)` calls with `parent.createScope()`.
4. Give `registerFactory(..., lazyKey)` an explicit lifetime; replace the v5
   `undefined` shorthand with `'singleton'` where needed.
5. Recompile generic resolver helpers and use `Container.SyncReadyKeys` or
   `Container.ReadyKeys` where `keyof T` no longer satisfies `.get()`.
6. Use the named `LazySpec` and `AsyncLazySpec` exports in explicit graph
   shapes. Do not reproduce managed companion specs structurally.
7. Fix newly reported module-requirement, output-collision, and registration-key
   overlap errors instead of casting around them.

Existing container-aware calls without a companion, and calls that already pass
an explicit lifetime before `lazyKey`, keep their argument order. A Promise
returned from `registerFactory` also keeps its v5 meaning: the Promise itself
remains the synchronous graph value.

### Lifetime vocabulary

The public type model now uses one vocabulary consistently:

- `RegistrationKind` was removed; import `Lifetime` instead.
- `Spec<V, L>['kind']` was renamed to `Spec<V, L>['lifetime']`.
- Public generic and parameter names now use `L` and `lifetime`.

There is no deprecated alias. Runtime registration objects may still use an
internal `kind` field, but it is not part of the public API.

### Deps-aware `registerFactory` overloads are new

Stable v5 had no dependency-tuple overload for `registerFactory`. V6 keeps the
existing container-aware overloads and adds three deps-aware forms:

```ts
registerFactory(key, factory, deps)
registerFactory(key, factory, deps, lifetime)
registerFactory(key, factory, deps, lifetime, lazyKey)
```

The deps-aware callback receives a resolver limited to the declared keys. The
tuple records type-level edges and scope-input requirements; InferDI does not
resolve it into positional callback arguments.

A `registerFactory` call with a `lazyKey` requires an explicit lifetime,
including `'singleton'`:

```ts
// v5 allowed this shorthand
container.registerFactory('clock', factory, undefined, 'clockLazy')

// v6 requires the target lifetime
container.registerFactory('clock', factory, 'singleton', 'clockLazy')
container.registerFactory(
  'userId',
  resolver,
  ['auth'],
  'scoped',
  'userIdLazy'
)
```

One v6 prerelease exposed the tuple before the callback. Only prerelease users
need this reorder:

```ts
// v6 prerelease
container.registerFactory('userId', ['auth'], resolver, 'scoped')

// v6 stable
container.registerFactory('userId', resolver, ['auth'], 'scoped')
```

### Runtime contracts use `fast`

V5 named the runtime-check option `strict`; v6 names the unchecked fixed-graph
contract `fast`. The boolean polarity is reversed:

```ts
// v5                              // v6
new Container()                    // new Container()
new Container({strict: true})      // new Container({fast: false})
new Container({strict: false})     // new Container({fast: true})
```

For a runtime boolean that previously meant "enable checks", preserve its
meaning with `fast: strict === false`; do not pass the old value through as
`fast: strict`.

The prerelease `mode` option and its checked fixed contract were removed.
`fast` defaults to `false`, which keeps cycle and lifetime checks enabled and
preserves the exact mutable parent chain. `{fast: true}` disables those checks
and enables fixed-topology optimizations. Fixed graphs must finish registration
and overrides before the first resolve or `createScope()`, and child scopes must
be disposed before ancestors. Only the literal value `true` enables the fast
contract; unknown values passed through a cast use the checked mutable contract.

### Named modules declare requirements

`Module<TRequirements, TProvides>` no longer requires the actual graph to equal
`TRequirements`. Extra registrations are preserved, the callback sees only its
declared requirements, and outputs are checked for collisions against the whole
actual graph. Requirements use exact lifetime, sync/async, managed-lazy, and
scope-input compatibility. Missing requirements, incompatible requirements,
and output collisions have named compiler diagnostics.

### Parent construction is internal

`new Container(parent)` is no longer public. Create children only with
`parent.createScope()`. Published ESM/CJS declarations and raw source expose
only `new Container(options?)`.

### Registration keys reject possible overlaps

Every `register*` overload now rejects a key type whose possible values overlap
an existing registration. The previous whole-union check allowed a value typed
as `'primary' | 'secondary'` to overwrite `'primary'` while the graph retained
the old type.

```ts
const c = new Container().registerValue('primary', 1)
declare const key: 'primary' | 'secondary'

// v6: rejected because key may be 'primary'
c.registerValue(key, 2)
```

Narrow the value to a fresh key before registration. Use `.override()` when
replacement is intentional. Broad and union `string | symbol` keys remain
supported when their possible values do not intersect the graph. A `lazyKey`
uses the same check against both existing registrations and its primary key.

### Scope inputs and profiles are additive

V6 adds `declareScopeInputs<Inputs>()` and `createScope(inputs)`. Existing
zero-argument `createScope()` calls keep their v5 behavior. A declaration adds
type-only scoped entries; the child scope receives the runtime values:

```ts
interface RequestContext {
  readonly requestId: string
}

declare const request: RequestContext

class Handler {
  constructor(readonly request: RequestContext) {}
}

const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('handler', Handler, ['request'], 'scoped')

const scope = root.createScope({request})
scope.get('handler')
```

The `.get()` and `.getAsync()` key sets exclude an input and every dependent
service until a scope provides the required values. Input requirements
propagate through class dependency tuples, deps-aware sync factories,
declarative async factories, and managed lazy companions. Scope-input values
remain application-owned.

Named modules can describe the same contract with `ScopeInputMap<M>` and attach
requirements to outputs with `WithRequirements<S, K>`. Applications that do not
adopt scope inputs need no source changes for this feature.

### Declarative async dependencies are additive

V6 separates a Promise-valued synchronous service from declarative async
initialization:

| Registration                                    | Graph value               | Dependency injection             | Resolve with |
|-------------------------------------------------|---------------------------|----------------------------------|--------------|
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>`       | Injects the Promise by identity  | `get()`      |
| `registerAsyncFactory('db', connect, [])`       | `Database` in `AsyncSpec` | Injects the fulfilled `Database` | `getAsync()` |

Do not replace Promise-valued `registerFactory` calls unless downstream
services should receive the fulfilled value. Existing v5 code keeps working
with the first contract.

`registerAsyncFactory` resolves its dependency tuple and passes positional
values to the callback. Annotate callback parameters when the tuple is not
empty, or pass a function with an existing signature:

```ts
class Database {}

class Repository {
  constructor(readonly db: Database) {}
}

declare function connect(dsn: string): Promise<Database>

const container = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .registerAsyncFactory(
    'db',
    (config: {dsn: string}) => connect(config.dsn),
    ['config']
  )
  .registerClass('repository', Repository, ['db'])

const db = await container.getAsync('db')
const repository = await container.getAsync('repository')

// @ts-expect-error: async status propagated through Repository
container.get('repository')
```

`getAsync()` accepts ready sync and declarative async keys. Classes inherit
async status from declarative async dependencies. `registerAsyncFactory` and
any `registerClass` tuple that may select an async key require readonly tuples;
inline literals infer the required readonly shape.

### Teardown reports propagated failures once

An async dependency failure can propagate through several cached initialization
Promises. During disposal, InferDI now reports the same `Error` object once.
Distinct objects remain distinct `AggregateError` causes even when their
messages match.

Sync `[Symbol.dispose]` still throws when the container owns a cached Promise.
It now observes a native Promise rejection before throwing, preventing a later
failure from reaching `unhandledRejection`. It does not await the resource or
invoke `.then()` on a custom Promise-like value.

### Generic resolver helpers use ready keys

`.get()` now accepts ready sync keys whose scope-input requirements have been
provided. Concrete v5-style graphs without scope inputs or `AsyncSpec` entries
keep the same `.get()` key set. Generic sync helpers that use `K extends keyof T`
must switch to `Container.SyncReadyKeys`; async-capable helpers for `getAsync()`
should use `Container.ReadyKeys` because a generic `T extends DependenciesMap`
may contain blocked entries.

```ts
// Before
function resolve<T extends DependenciesMap, K extends keyof T>(
  container: Container<T>,
  key: K
) {
  return container.get(key)
}

// After
function resolve<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}
```

### Managed lazy companions use named branded specs

`LazySpec` now carries a private type-only mode brand, and v6 adds the matching
`AsyncLazySpec`. Explicit container and module shapes must use the exported
named interfaces instead of reproducing `{type, lifetime, lazyOf}` structurally.
The private discriminant has no runtime field and cannot be imported.

```ts
// Before
type Output = {
  clockLazy: {
    readonly type: Lazy<Clock>
    readonly kind: 'transient'
    readonly lazyOf: 'singleton'
  }
}

// After
type Output = {
  clockLazy: LazySpec<Clock, 'singleton'>
  dbLazy: AsyncLazySpec<Database, 'singleton'>
}
```

`registerAsyncFactory` accepts a fifth `lazyKey` and produces
`AsyncLazy<Awaited<R>>`. A `registerClass` call with a `lazyKey` produces the
same wrapper when the class inherits async status. A class whose dependency key
may choose a sync or async registration exposes `Lazy<T> | AsyncLazy<T>`.
Promise-valued `registerFactory` keeps the previous `Lazy<Promise<T>>` contract.

`Container.ResolveUnwrapped` now unwraps managed sync, async, and mixed
companions distributively. Hand-written `Spec<Lazy<T>, 'transient'>` and
`Spec<AsyncLazy<T>, 'transient'>` values remain wrapped.

## Migration to 5.0

The initial v5 release was **adapter-only**. Its version bump kept the published
packages in lockstep and harmonized the five framework adapters
(`@inferdi/fastify`, `@inferdi/express`,
`@inferdi/hono`, `@inferdi/koa`, `@inferdi/elysia`) onto one contract: the same
option vocabulary (`createScope`, `setupScope`, `disposeScope`, `autoDispose`,
`onDisposeError`), the same exported types (`MaybePromise`, `InferdiScope`,
`InferdiRoot`, `InferdiScopeOf`), and one cleanup-ownership model — a disposal
failure after the response is produced is observed/logged and never corrupts the
response.

### Core type corrections

Later v5 builds tighten two type-level contracts that previously allowed the
declared graph to differ from runtime behavior:

- Explicit non-singleton type arguments now require the matching runtime
  `kind`. Change
  `registerFactory<'svc', Svc, 'scoped'>('svc', factory)` to
  `registerFactory<'svc', Svc, 'scoped'>('svc', factory, 'scoped')`. The same
  rule applies to `registerClass`. Omitting `kind` still infers `singleton`.
- `Container.ResolveUnwrapped<C>` unwraps only managed `LazySpec` companion
  entries created through `lazyKey`. An ordinary service that happens to expose
  a zero-argument `.get()` method now remains that service type instead of being
  structurally mistaken for `Lazy<T>`.

### Scoped resolution requires a child scope

With the default `{fast: false}`, resolving a `scoped` key from the root now
throws `Scoped "key" cannot be resolved from the root container. Use
createScope().` Replace a direct root read with a child scope:

```ts
// Before
const request = root.get('request')

// After
const scope = root.createScope()
const request = scope.get('request')
```

Dispose the child at the matching application or request lifecycle boundary.
`{fast: true}` skips this runtime guard, but application code must still keep scoped
resolution on child scopes.

### `fast: true` fixed graph contract

`new Container({fast: true})` resolves scope misses directly against
the immutable root registry instead of walking the parent chain. Delegated
singletons are mirrored into the scope cache after their first resolve, and
registration-time defensive cache invalidation is removed together with the
cycle and lifetime guards. Default scopes walk their exact parent chain on
every local miss instead of retaining parent-lookup snapshots. This removes
invalidation bookkeeping and per-scope lookup metadata while keeping
post-resolve tree mutations immediately visible. Owned-instance identity
de-duplication now runs during disposal in both contracts, preserving exactly-once
teardown without the linear scan on every owned instance creation.

If you use `{fast: true}`:

- Register each runtime key once through one linear fluent chain; do not reuse
  older pre-widening container aliases for duplicate registration.
- Complete all `register*` calls before the first `.get()` or `.createScope()`.
- Do not call `register*` or `.override()` after the tree is activated.
- Dispose child scopes before their ancestors.
- Use the default `{fast: false}` for hot reload, mutable test fixtures, or any
  container tree that changes after activation.

Breaking this contract can leave a child using a stale locally cached
singleton or make a post-activation registration invisible to descendants.

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

Core-only applications need changes only if they resolve scoped keys from the
root or mutate an activated fast tree. Adapter changes:

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
the rule is enforced at both the type level and by the default runtime checks.
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
  rejected by the same default lifetime guard that catches direct
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
- **Runtime diagnostic.** With `fast: false`, an `as`-cast bypass that lands a
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
  [Runtime Lifetime Guards](./README.md#runtime-lifetime-guards) section.

- **`ContainerOptions` interface and runtime-check opt-out.** v3 introduced an
  optional opt-out of the runtime cycle / lifetime guard for applications
  that have audited their graph and trust the compile-time guard. Skips
  the `try`/`finally`, `singletonStack` push/pop, and the cycle bookkeeping
  inside `get()`. Cache fast-paths (warm singleton, warm lazy) run upstream
  of the guard and are unaffected. The flag is inherited by every child
  spawned via `createScope()`. The current equivalent is `{fast: true}`; the
  current default remains checked. See the
  [`fast` option](./README.md#runtime-contracts) section
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
