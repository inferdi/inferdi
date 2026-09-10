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

## Container Options

The constructor accepts one optional setting:

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `fast` | `boolean` | `false` | Selects the checked mutable contract or the unchecked fixed-graph contract |

```ts
const checked = new Container()
const explicitChecked = new Container({ fast: false })
const fast = new Container({ fast: true })
```

The default and explicit `false` forms keep runtime cycle and lifetime checks,
reject scoped resolution from the root, and preserve the exact mutable parent
chain. Use this contract for development, tests, hot reload, and graphs that can
change after startup.

The literal `{fast: true}` keeps all compile-time checks but disables runtime
cycle and lifetime bookkeeping, including the root-scoped guard. It treats the
container tree as fixed, flattens scope lookup to the registry owner, and mirrors
delegated singletons into local scope caches. Child scopes inherit the root
configuration.

In a fast tree, finish every `register*`, `.use()`, and `.override()` call before
the first resolve or `createScope()`, keep the tree immutable after activation,
and dispose children before ancestors. Only the literal value `true` enables this
contract; other runtime values fall back to the checked contract. See
[Performance](../guide/performance#fast-true) for the costs affected by this
choice and guidance on when the trade-off is useful.

## Registration Methods

| Method | Callback input | Stored graph type | Resolve with |
| --- | --- | --- | --- |
| `registerClass` | Constructor arguments from `deps` | `Spec` or propagated `AsyncSpec` | `get` or `getAsync` |
| `registerFactory(key, factory, ...)` | Lifetime-filtered container | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | Resolver limited to `deps` | Requirement-aware `Spec` | `get` |
| `registerAsyncFactory` | Positional values; declarative async deps are awaited | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | None | Externally owned singleton `Spec` | `get` |

`registerClass`, `registerFactory`, and `registerAsyncFactory` accept `singleton`, `scoped`, and `transient` lifetimes. A `registerFactory` companion requires an explicit lifetime, including `'singleton'`. `registerValue` is always singleton and externally owned.

A `lazyKey` on `registerClass` or `registerFactory` adds a managed `LazySpec`. An async-propagated class instead adds an `AsyncLazySpec`. A Promise-valued `registerFactory` remains a synchronous `Spec<Promise<T>>`, and its companion remains `Lazy<Promise<T>>`; use `registerAsyncFactory` when the graph should store the final service type.

`registerAsyncFactory` accepts the same lifetimes and an optional fifth `lazyKey`. It records the final service type as `AsyncSpec`; the companion is `AsyncLazySpec<Awaited<ReturnType>, L>`. Dependent classes inherit async status from the target key, while a consumer of the wrapper remains synchronous. Use `getAsync()` for the target and `get()` for the wrapper.

`registerAsyncFactory` and any `registerClass` call whose tuple may select an async key require readonly dependencies. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples; sync-only `registerClass` calls keep mutable-tuple compatibility.

The deps-aware `registerFactory` and `registerAsyncFactory` use the same argument order but different callback contracts. The former receives a resolver limited to `deps`; the latter receives the dependency values positionally:

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` replaces an existing non-input registration and `use` applies a module builder. The `override` timing guard checks only the current container's cache. It catches locally cached singleton/scoped values, `registerValue`, and repeated overrides, but never records transient resolutions. In checked mode it also does not record ancestor-owned singletons resolved through a child; a fast child mirrors delegated singletons into its local cache, so the guard catches those. Apply overrides before resolving the dependency graph.

## Scope Inputs and Resolution

`declareScopeInputs<Inputs>()` adds type-only scoped entries. `createScope(inputs)` supplies any subset of missing values and returns a container whose ready-key set reflects the provided required properties. Input values remain application-owned.

| Surface | Accepted keys |
| --- | --- |
| `get()` | Ready keys without `AsyncSpec` |
| `getAsync()` | All ready sync and declarative async keys |
| `has()` | Any string or symbol; proves registration only |

`has()` does not prove that a key is ready or synchronous. Declared scope inputs are type-only rather than registrations, so `has()` returns `false` for them even after `createScope(inputs)` supplies their values. Read [Scope Inputs](../core/scope-inputs) for type-state refinement and [Async Dependencies](../core/async-dependencies) for Promise behavior.

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
| `Container.Providers<C>` | Create a map of provider thunks for tests; declared scope inputs are excluded. |

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

`Spec`, `AsyncSpec`, `LazySpec`, and `AsyncLazySpec` describe entries in the type-level graph; their fields are not properties added to resolved service values.

`ScopeInputMap<M>` maps required finite string and symbol properties to scoped input entries. It rejects optional or numeric keys, `__proto__`, broad index signatures, and unions with different key sets. `WithRequirements<S, K>` attaches required input keys to a graph entry and is useful in named module outputs. Exact conditional definitions remain in the published TypeScript declarations.

## Adapter API Shapes

### HTTP Adapters

Fastify, Hono, Koa, Express, and Elysia export:

- the integration function, such as `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- structural `InferdiScope`, `InferdiRoot`, and `InferdiScopeOf` helpers
- framework-specific option and context helper types

### React Adapter

React exports `inferdiReact` and types for its binding, external `Provider`, managed `ScopeProvider`, service hooks, graph extraction, stable sync/async keys, and scope lifecycle options. It does not export `skipInferdiDispose` because component scopes follow React commit and effect cleanup rather than an HTTP request lifecycle.

Use the adapter pages for exact names and lifecycle details.
