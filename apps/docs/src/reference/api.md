---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/reference/api#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Reference"
          "item": "https://inferdi.com/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "API Summary"
          "item": "https://inferdi.com/reference/api"
    - "@type": "APIReference"
      "@id": "https://inferdi.com/reference/api#article"
      "headline": "InferDI Core API Summary"
      "name": "API Summary"
      "description": "A summary of the @inferdi/inferdi v6 core API, including scope inputs, registerAsyncFactory, readiness-aware resolution, overrides, and disposal."
      "url": "https://inferdi.com/reference/api"
      "mainEntityOfPage": "https://inferdi.com/reference/api"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "Explicit registration, fluent builder"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, declareScopeInputs, ScopeInputMap, registerAsyncFactory, getAsync, AsyncSpec, ReadyKeys, dispose"
      "articleSection": "Reference"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

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
  type RegistrationKind,
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
  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?, lazyKey?)
  registerFactory(key, deps, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?, lazyKey?)
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

## Registration Methods

| Method | Callback input | Stored graph type | Resolve with |
| --- | --- | --- | --- |
| `registerClass` | Constructor arguments from `deps` | `Spec` or propagated `AsyncSpec` | `get` or `getAsync` |
| `registerFactory(key, factory, ...)` | Lifetime-filtered container | `Spec<ReturnType>` | `get` |
| `registerFactory(key, deps, factory, ...)` | Resolver limited to `deps` | Requirement-aware `Spec` | `get` |
| `registerAsyncFactory` | Resolved positional values | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | None | Externally owned singleton `Spec` | `get` |

`registerClass` and `registerFactory` accept `singleton`, `scoped`, and `transient` lifetimes, plus an optional `lazyKey` companion. `registerValue` is always singleton and externally owned.

`registerAsyncFactory` accepts the same lifetimes and an optional fifth `lazyKey`. It records the final service type as `AsyncSpec`; the companion is `AsyncLazySpec<Awaited<ReturnType>, Kind>`. Dependent classes inherit async status from the target key, while a consumer of the wrapper remains synchronous. Use `getAsync()` for the target and `get()` for the wrapper.

`registerAsyncFactory` and any `registerClass` call whose tuple may select an async key require readonly dependencies. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples; sync-only `registerClass` calls keep mutable-tuple compatibility.

`registerAsyncFactory` and the deps-aware `registerFactory` use different argument orders and callback contracts:

```ts
registerFactory(key, deps, resolverFactory, kind, lazyKey)
registerAsyncFactory(key, valueFactory, deps, kind, lazyKey)
```

`override` replaces an existing registration and `use` applies a module builder. The `override` timing guard checks only the current container's cache. It catches locally cached singleton/scoped values, `registerValue`, and repeated overrides, but it does not record transient resolutions or ancestor-owned values resolved through a child. Apply overrides before resolving the dependency graph.

## Scope Inputs and Resolution

`declareScopeInputs<Inputs>()` adds type-only scoped entries. `createScope(inputs)` supplies any subset of missing values and returns a container whose ready-key set reflects the provided required properties. Input values remain application-owned.

| Surface | Accepted keys |
| --- | --- |
| `get()` | Ready keys without `AsyncSpec` |
| `getAsync()` | All ready sync and declarative async keys |
| `has()` | Any string or symbol; proves registration only |

`has()` does not prove that a key is ready or synchronous. Read [Scope Inputs and Profiles](../core/scope-inputs) for type-state refinement and [Async Dependency Graph](../core/async-dependency-graph) for Promise behavior.

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
type RegistrationKind = 'singleton' | 'transient' | 'scoped'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, RegistrationKind>
>

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

interface AsyncSpec<V, K extends RegistrationKind = 'singleton'>
  extends Spec<V, K> {
  readonly async: true
}

interface LazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

interface AsyncLazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
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
