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
      "dateModified": "2026-06-15"
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
