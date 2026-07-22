---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/reference/migration#breadcrumb"
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
          "name": "Migration"
          "item": "https://inferdi.com/reference/migration"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/reference/migration#article"
      "headline": "InferDI Migration guide"
      "name": "Migration"
      "description": "Breaking changes by major version and the current migration path to InferDI 5.0, mirroring packages/inferdi/MIGRATION.md as the source of truth."
      "url": "https://inferdi.com/reference/migration"
      "mainEntityOfPage": "https://inferdi.com/reference/migration"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, migration, breaking changes, upgrade, 5.0, major version, dependency injection"
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

# Migration

InferDI records breaking changes by major version. The source of truth remains [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md), but the current migration path is summarized here.

## Migration to 5.0

v5 is an adapter release. The core package did not change. The version bump keeps all published packages in lockstep and aligns framework adapters around one cleanup contract.

Adapter contracts now share these rules:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose`, and `onDisposeError` use the same vocabulary.
- `MaybePromise`, `InferdiScope`, `InferdiRoot`, and `InferdiScopeOf` are exported across adapters.
- If `setupScope` fails, the adapter surfaces only the original setup error.
- Cleanup failures during setup teardown go to `onDisposeError` or the adapter sink.
- A failed request disposes its scope even after `skipInferdiDispose`, except for the documented Express limitation.
- Cleanup hooks see the public scope slot while they run.

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

v3 moves lifetime safety into the type system. Runtime behavior stays compatible, and strict runtime guards remain defense-in-depth.

Main changes:

- `DependenciesMap` entries became `Spec<V, Kind>` instead of bare service types.
- `RegistrationKind`, `Spec<V, K>`, and `SpecMap<M, K>` became public exports.
- `registerFactory` narrows its `c` parameter for singleton factories.
- `registerClass` filters `deps` for singleton registrations.
- `override(key, value)` preserves the original lifetime kind.
- `new Container({ strict: false })` can disable runtime cycle and lifetime guards after a graph audit.

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

When upgrading adapters, keep the adapter package and [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) on matching major versions.

## Upgrade Checklist

1. Read the migration notes for every major version crossed.
2. Upgrade [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) and all installed adapters together.
3. Run type tests or `tsc --noEmit` to catch graph-shape changes.
4. Run runtime tests in strict mode.
5. Review request-scope ownership if you use `skipInferdiDispose`, `autoDispose: false`, or custom `disposeScope`.

## Stable Boundaries

The core package remains decorator-free and zero-dependency. Framework lifecycle behavior lives in adapter packages, not in [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
