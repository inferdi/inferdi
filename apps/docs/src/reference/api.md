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
      "description": "A summary of the public @inferdi/inferdi core API: the Container class, register, registerFactory, registerValue, get, has, scopes, override, dispose, and the Lazy, DependenciesMap, and Module types."
      "url": "https://inferdi.com/reference/api"
      "mainEntityOfPage": "https://inferdi.com/reference/api"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "Explicit registration, fluent builder"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, register, registerFactory, get, scope, override, dispose, Lazy, Module"
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
  registerFactory(key, factory, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
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
| `registerValue` | Register an externally owned singleton value. |
| `override` | Replace an existing registration before first resolve. |
| `use` | Apply a module builder. |

`registerClass` and `registerFactory` accept `singleton`, `scoped`, and `transient` lifetimes. `registerValue` is always singleton and externally owned.

## Namespace Types

```ts
namespace Container {
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Type | Use |
| --- | --- |
| `Container.Resolve<C>` | Extract a flat `{ key: Value }` map from a built container. |
| `Container.ResolveUnwrapped<C>` | Like `Resolve`, but unwraps `Lazy<T>` entries to `T`. |
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
