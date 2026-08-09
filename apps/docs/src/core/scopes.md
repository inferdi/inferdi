---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/scopes#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Core Concepts"
          "item": "https://inferdi.com/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Scopes and Teardown"
          "item": "https://inferdi.com/core/scopes"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/scopes#article"
      "headline": "Scopes and Teardown in InferDI"
      "name": "Scopes and Teardown"
      "description": "A scope bounds request-local services to one unit of work: a child scope inherits every parent registration but caches its own instances and owns their teardown, with LIFO disposal and support for using and await using."
      "url": "https://inferdi.com/core/scopes"
      "mainEntityOfPage": "https://inferdi.com/core/scopes"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, scopes, teardown, disposal, child scope, using, await using, LIFO, dependency injection"
      "articleSection": "Core Concepts"
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

# Scopes and Teardown

A scope bounds the lifetime of request-local services to a single unit of work. A child scope inherits every parent registration, but caches its own scoped instances and owns their teardown — so the scope created for one request never shares state with, or outlives, another.

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` is a root singleton. `request` is created once per scope and disposed when the scope is disposed.

`scoped` registrations belong to child scopes. With `strict: true` (the default), `root.get('request')` throws `Scoped "request" cannot be resolved from the root container. Use createScope().` Call `createScope()`, then resolve the key from its result. `strict: false` skips this runtime guard.

## Scope Inputs and Profiles

Scope inputs represent external values that exist only when you open a scope, such as a request, authentication context, tenant, or job payload. `declareScopeInputs()` adds those keys to the type-level graph without creating runtime registrations:

```ts
const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass('accountService', AccountService, ['request', 'auth'], 'scoped')
```

The declaration map accepts required finite string and symbol keys. It rejects optional keys, numeric keys, `__proto__`, broad string or symbol index signatures, and unions whose variants use different key sets. A declaration may appear on a root or an existing child, but declaration alone does not provide a value.

`createScope(inputs)` accepts any subset of missing inputs. InferDI carries each requirement through class registrations, lazy companions, and factories that declare a dependency tuple:

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth is missing
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')

root.registerFactory(
  'userId',
  ['auth'],
  (c) => c.get('auth').userId,
  'scoped'
)
```

The factory tuple affects types only. The callback receives a resolver with `.get()` for the listed keys and `.has()` for probes. InferDI calls `factory(container)` at runtime.

Use ordinary functions for named profiles:

```ts
const publicScope = (request: RequestContext) =>
  root.createScope({request})

const authenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})
```

A child takes a shallow snapshot of enumerable own string and symbol properties. Nested children inherit input values but create their own scoped instances. Input values remain application-owned. If you refine a scope through another child, dispose the refined child before its parent.

The runtime stores no input schema. JavaScript, `any`, or a cast can add unknown keys or shadow a registration in the child cache. Pass a passive data record because object spread invokes getters and Proxy traps; reentrant mutations from those hooks are outside the contract. Strict Mode keeps registrations added to a partial child visible to its refined child. Fast Mode supports input refinement but retains its immutable-graph rule: finish registration before the first `.get()` or `.createScope()`.

## Ownership

Each container disposes only instances it created.

| Instance | Owner |
| --- | --- |
| Root singleton | Root container |
| Scoped service | Request scope |
| Singleton first resolved on a child | That child container |
| Transient | Caller |

`root.dispose()` does not cascade into already-created child scopes. Dispose scopes at their own lifecycle boundary.

## Native Resource Management

Container implements both disposal symbols:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Use `await using` or `await container.dispose()` when any owned resource may be async.

## Disposal Protocol

Owned instances are disposed in reverse creation order. The container probes:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

If multiple disposers fail, InferDI collects them in an `AggregateError` so one bad cleanup does not prevent later resources from closing.
