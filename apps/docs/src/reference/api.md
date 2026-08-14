# API Summary

This page summarizes the public core API. See the package README and TypeScript declarations for exact generic definitions.

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

`fast` defaults to `false`: runtime safety checks stay enabled and scopes keep
the exact mutable parent chain. `{fast: true}` disables those checks and treats
the graph as fixed, enabling flattened parent lookup and inherited singleton
mirroring. Child scopes inherit the root configuration.

## Registration Methods

| Method | Callback input | Stored graph type | Resolve with |
| --- | --- | --- | --- |
| `registerClass` | Constructor arguments from `deps` | `Spec` or propagated `AsyncSpec` | `get` or `getAsync` |
| `registerFactory(key, factory, ...)` | Lifetime-filtered container | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | Resolver limited to `deps` | Requirement-aware `Spec` | `get` |
| `registerAsyncFactory` | Resolved positional values | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | None | Externally owned singleton `Spec` | `get` |

`registerClass` and `registerFactory` accept `singleton`, `scoped`, and `transient` lifetimes. A `registerFactory` companion requires an explicit lifetime, including `'singleton'`. `registerValue` is always singleton and externally owned.

`registerAsyncFactory` accepts the same lifetimes and an optional fifth `lazyKey`. It records the final service type as `AsyncSpec`; the companion is `AsyncLazySpec<Awaited<ReturnType>, L>`. Dependent classes inherit async status from the target key, while a consumer of the wrapper remains synchronous. Use `getAsync()` for the target and `get()` for the wrapper.

`registerAsyncFactory` and any `registerClass` call whose tuple may select an async key require readonly dependencies. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples; sync-only `registerClass` calls keep mutable-tuple compatibility.

`registerAsyncFactory` and the deps-aware `registerFactory` use different argument orders and callback contracts:

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` replaces an existing registration and `use` applies a module builder. The `override` timing guard checks only the current container's cache. It catches locally cached singleton/scoped values, `registerValue`, and repeated overrides, but it does not record transient resolutions or ancestor-owned values resolved through a child. Apply overrides before resolving the dependency graph.

## Scope Inputs and Resolution

`declareScopeInputs<Inputs>()` adds type-only scoped entries. `createScope(inputs)` supplies any subset of missing values and returns a container whose ready-key set reflects the provided required properties. Input values remain application-owned.

| Surface | Accepted keys |
| --- | --- |
| `get()` | Ready keys without `AsyncSpec` |
| `getAsync()` | All ready sync and declarative async keys |
| `has()` | Any string or symbol; proves registration only |

`has()` does not prove that a key is ready or synchronous. Read [Scope Inputs](../core/scope-inputs) for type-state refinement and [Async Dependencies](../core/async-dependencies) for Promise behavior.

## Namespace Types

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Type | Use |
| --- | --- |
| `Container.ReadyKeys<C>` | Extract keys whose scope-input requirements have been provided; generic resolvers can pass them to `getAsync`. |
| `Container.SyncReadyKeys<C>` | Extract ready non-async keys that generic resolvers can pass to `get`. |
| `Container.Resolve<C>` | Extract a flat `{ key: Value }` map from a built container. |
| `Container.ResolveUnwrapped<C>` | Like `Resolve`, but distributively unwraps managed `LazySpec` and `AsyncLazySpec` entries to `T`; unmanaged wrapper services stay unchanged. |
| `Container.UnwrappedValue<C, K>` | Look up one unwrapped service type. |
| `Container.Providers<C>` | Create a map of provider thunks for tests. |

Generic v6 resolvers must preserve the accepted key set. Use `Container.SyncReadyKeys<C>` with `get()` and `Container.ReadyKeys<C>` with `getAsync()` instead of unconstrained `keyof T`.

## Public Types

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` and `AsyncLazySpec` carry a private type-only mode discriminant in
the published declarations. Use the named interfaces for managed companions in
explicit `Container` and `Module` shapes. The discriminant has no runtime field
and is not exported.

`ScopeInputMap<M>` maps required finite string and symbol properties to scoped input entries. It rejects optional or numeric keys, `__proto__`, broad index signatures, and unions with different key sets. `WithRequirements<S, K>` carries required input keys on a named module output. Exact conditional definitions remain in the published TypeScript declarations.

## Adapter API Shapes

Every adapter exports:

- the integration function, such as `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- structural `InferdiScope`, `InferdiRoot`, and `InferdiScopeOf` helpers
- framework-specific option and context helper types

Use the adapter pages for framework-specific generic names and lifecycle details.
