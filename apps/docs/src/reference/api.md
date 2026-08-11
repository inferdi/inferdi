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
      "description": "A summary of the @inferdi/inferdi core API, including registerAsyncFactory, getAsync, AsyncSpec, scopes, overrides, and disposal."
      "url": "https://inferdi.com/reference/api"
      "mainEntityOfPage": "https://inferdi.com/reference/api"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "Explicit registration, fluent builder"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, scope, dispose"
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
  type LazySpec,
  type AsyncSpec,
  type Module,
  type RegistrationKind,
  type Spec,
  type SpecMap,
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
  getAsync(key): Promise
  has(key)

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Registration Methods

| Method | Use |
| --- | --- |
| `registerClass` | Register a constructor and dependency tuple. |
| `registerFactory` | Register custom construction logic. |
| `registerAsyncFactory` | Register positional dependencies in the declarative async graph. |
| `registerValue` | Register an externally owned singleton value. |
| `override` | Replace an existing registration; rejects a key already cached locally. |
| `use` | Apply a module builder. |

`registerClass` and `registerFactory` accept `singleton`, `scoped`, and `transient` lifetimes, plus an optional `lazyKey` companion. `registerValue` is always singleton and externally owned.

`registerAsyncFactory` accepts the same lifetimes without `lazyKey`. It records the final service type as `AsyncSpec`, and dependent classes inherit async status. Use `getAsync()` for these keys. `get()` remains available for sync keys, including Promise-valued `registerFactory` services.

`registerAsyncFactory` and any `registerClass` call whose tuple may select an async key require readonly dependencies. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples; sync-only `registerClass` calls keep mutable-tuple compatibility.

The `override` timing guard checks only the current container's cache. It catches locally cached singleton/scoped values, `registerValue`, and repeated overrides, but it does not record transient resolutions or ancestor-owned values resolved through a child. Apply overrides before resolving the dependency graph.

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
| `Container.ResolveUnwrapped<C>` | Like `Resolve`, but unwraps managed `LazySpec` companion entries to `T`; ordinary services with a `.get()` method stay unchanged. |
| `Container.UnwrappedValue<C, K>` | Look up one unwrapped service type. |
| `Container.Providers<C>` | Create a map of provider thunks for tests. |

## Public Types

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

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

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

## Adapter API Shapes

Every adapter exports:

- the integration function, such as `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- structural `InferdiScope`, `InferdiRoot`, and `InferdiScopeOf` helpers
- framework-specific option and context helper types

Use the adapter pages for framework-specific generic names and lifecycle details.
