# Migration

InferDI records breaking changes by major version. The source of truth remains [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md), but the current migration path is summarized here.

## Migration to 6.0

This summary assumes an upgrade from stable `5.0.7`. Upgrade every installed
`@inferdi/*` package to `6.0.0`; the adapters require
`@inferdi/inferdi@^6.0.0`.

- Replace `RegistrationKind` with `Lifetime` and `Spec.kind` with `Spec.lifetime`; no deprecated alias remains.
- Stable v5 had no deps-aware `registerFactory` overload. V6 adds `registerFactory(key, factory, deps, ...)`; only users of the v6 prerelease form `registerFactory(key, deps, factory, ...)` must reorder arguments. A sync factory companion requires an explicit lifetime, including `'singleton'`.
- Replace v5 `{strict: false}` with `{fast: true}` and `{strict: true}` with the default or `{fast: false}`. The boolean polarity is reversed. The prerelease `mode` option was removed.
- Named `Module<TRequirements, TProvides>` accepts actual graphs with extra registrations, preserves them, checks exact requirements, and rejects output collisions. `new Container(parent)` is no longer public; use `createScope()`.
- Registration now rejects any key type that may overlap an existing primary or lazy key. Narrow broad or union keys to a fresh member, or use `.override()` for intentional replacement.
- V6 adds type-only scope inputs through `declareScopeInputs<Inputs>()` and `createScope(inputs)`. Existing zero-argument scopes keep their v5 behavior.
- V6 adds `registerAsyncFactory`, `AsyncSpec`, and `getAsync()` for declarative async dependencies. Promise-valued `registerFactory` remains a synchronous graph service and still resolves through `get()`.
- Async teardown reports a shared rejection object once when dependency failure propagates through several cached Promises. Sync teardown observes native-Promise rejection before throwing an async-misuse error.

### Generic Resolver Helpers Use Ready Keys

`.get()` now accepts ready synchronous keys whose scope-input requirements have been provided. Concrete containers without scope inputs keep the same synchronous key set. Generic helpers that use `K extends keyof T` must preserve readiness and async status.

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

Use `Container.ReadyKeys<Container<T>>` in generic helpers that call `getAsync()`. A generic `T extends DependenciesMap` may contain declarative async entries or services blocked by missing scope inputs.

### Named Specs for Lazy Companions

`LazySpec` now carries a private type-only mode brand, and v6 adds
`AsyncLazySpec`. Explicit `Container` and `Module` shapes must use these named
exports instead of reproducing `{type, lifetime, lazyOf}`. The brand has no runtime
field.

`registerAsyncFactory` accepts a fifth `lazyKey` and produces `AsyncLazy<T>`.
Async-propagated classes use the same wrapper; mixed sync/async classes expose
`Lazy<T> | AsyncLazy<T>`. Promise-valued `registerFactory` companions remain
`Lazy<Promise<T>>`. `Container.ResolveUnwrapped` unwraps managed sync, async,
and mixed companions distributively.

The [API Summary](./api), [Scope Inputs](../core/scope-inputs), and [Async Dependencies](../core/async-dependencies) describe the new key sets.

## Migration to 5.0

The initial v5 release was adapter-only. The version bump keeps all published packages in lockstep and aligns framework adapters around one cleanup contract. Later v5 builds also enforce child-scope ownership and tighten the `{fast: true}` contract described below.

Adapter contracts now share these rules:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose`, and `onDisposeError` use the same vocabulary.
- `MaybePromise`, `InferdiScope`, `InferdiRoot`, and `InferdiScopeOf` are exported across adapters.
- If `setupScope` fails, the adapter surfaces only the original setup error.
- Cleanup failures during setup teardown go to `onDisposeError` or the adapter sink.
- A failed request disposes its scope even after `skipInferdiDispose`, except for the documented Express limitation.
- Cleanup hooks see the public scope slot while they run.

### Scoped Resolution Requires a Child Scope

With the default `{fast: false}`, resolving a scoped key from the root now throws `Scoped "key" cannot be resolved from the root container. Use createScope().` Create a child with `const scope = root.createScope()`, call `scope.get(scopedKey)`, and dispose the child at its lifecycle boundary. `{fast: true}` skips this runtime guard. Application code must resolve scoped keys from child scopes.

### `fast: true` Fixed Graph Contract

`new Container({fast: true})` reads the immutable root registry
directly from scopes, avoids parent walks, and mirrors delegated singletons
into the scope cache. Default scopes walk their exact parent chain on every
local miss instead of retaining parent-lookup snapshots, so mutations stay
visible without invalidation bookkeeping or per-scope lookup metadata.
Owned-instance identity de-duplication runs during disposal in both modes.
Register each runtime key once through one linear fluent chain, complete
registration before the first resolve or scope, keep the activated tree
immutable, and dispose child scopes before their ancestors. Use `{fast: false}`
for hot reload or any tree that changes after activation.

### Adapter Notes

| Package                                                                             | Migration notes                                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Rename `logDisposeError` to `onDisposeError`; `InferdiScope.dispose()` may return `void` or `Promise<void>`; `disposeScope`, `autoDispose`, `skipInferdiDispose`, and `InferdiScopeOf` were added. |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)    | Cleanup failures after `next()` are logged or sent to `onDisposeError`; they no longer replace a successful response. Setup teardown no longer throws `AggregateError`.                            |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` is now a per-error sink for setup teardown and response completion. Express cannot force-dispose a skipped scope on a handled route error.                                        |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)     | Setup teardown surfaces only the setup error. A downstream error disposes even after `skipInferdiDispose(ctx)`.                                                                                    |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)  | Setup teardown surfaces only the setup error. Cleanup failure goes to `onDisposeError` or `console.error`.                                                                                         |

## Migration to 4.0

v4 tightens `Lazy<T>` lifetime semantics. A managed lazy companion now preserves the target lifetime. A singleton may inject only `Lazy<singleton>`.

Main changes:

- `AllowedDeps<T, 'singleton'>` no longer accepts arbitrary `Lazy<V>`.
- `LazySpec<V, TargetKind>` became a public type for explicit container and module shapes.
- The runtime lazy exemption applies only when the target kind is `singleton`.
- A singleton that injected `Lazy<scoped>` or `Lazy<transient>` must change either the target lifetime or the consumer lifetime.

Common fixes:

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## Migration to 3.0

v3 moves lifetime safety into the type system. Runtime behavior stays compatible, and the default runtime guards remain defense-in-depth.

Main changes:

- `DependenciesMap` entries became `Spec<V, Kind>` instead of bare service types.
- `RegistrationKind`, `Spec<V, K>`, and `SpecMap<M, K>` became public exports.
- `registerFactory` narrows its `c` parameter for singleton factories.
- `registerClass` filters `deps` for singleton registrations.
- `override(key, value)` preserves the original lifetime kind.
- `new Container({fast: true})` can disable runtime cycle and lifetime guards after a graph audit.

Common fixes:

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## Migration to 2.0

v2 has two mechanical breaking changes.

### `container.cradle` was removed

Use `.get(key)`:

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` became `lazyKey`

Pass the companion key:

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

v2 also added string or symbol keys to every registration method and improved disposed-ancestor diagnostics.

## Version Lockstep

All published InferDI packages share the same version:

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)
- [`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react)

When upgrading adapters, keep the adapter package and [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) on matching major versions.

## Upgrade Checklist

1. Read the migration notes for every major version crossed.
2. Upgrade [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) and all installed adapters together.
3. Run type tests or `tsc --noEmit` to catch graph-shape changes.
4. Run runtime tests with the default checked contract.
5. Review request-scope ownership if you use `skipInferdiDispose`, `autoDispose: false`, or custom `disposeScope`.

## Stable Boundaries

The core package remains decorator-free and zero-dependency. Framework lifecycle behavior lives in adapter packages, not in [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
