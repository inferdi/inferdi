---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/lifetime-guards#breadcrumb"
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
          "name": "Lifetime Guards"
          "item": "https://inferdi.com/core/lifetime-guards"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/lifetime-guards#article"
      "headline": "Lifetime Guards in InferDI — singleton, scoped, and transient"
      "name": "Lifetime Guards"
      "description": "InferDI's three lifetimes — singleton, scoped, and transient — and the compile-time and runtime guards that stop a longer-lived service from capturing a shorter-lived one and leaking state across requests."
      "url": "https://inferdi.com/core/lifetime-guards"
      "mainEntityOfPage": "https://inferdi.com/core/lifetime-guards"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, lifetimes, singleton, scoped, transient, lifetime guard, captive dependency, dependency injection"
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

# Lifetime Guards

InferDI has three lifetimes:

| Kind | Created | Cached on | Disposed by container |
| --- | --- | --- | --- |
| `singleton` | once per owning container | owner container | yes |
| `scoped` | once per child scope | child scope | yes |
| `transient` | every resolve | never | no |

With `strict: true`, resolving a `scoped` key from the root throws `Scoped "key" cannot be resolved from the root container. Use createScope().` Call `createScope()`, then resolve scoped services from its result.

## The Lifetime Rule

A singleton cannot directly depend on a `scoped` or `transient` service. A singleton is created once and shared across every request, so if it captures a scoped value — the current request's context, user, or transaction — that one request's state silently bleeds into all the others. InferDI makes that edge unrepresentable in the type system instead of leaving it to code review.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

That registration is rejected by TypeScript. In strict mode, the same shape is rejected at runtime if a cast bypasses the type system.

Declared scope inputs count as scoped dependencies. Register a consumer that reads a request, auth context, tenant, or job payload as `scoped` or `transient`; the compiler rejects a singleton consumer before runtime. See [Scope Inputs and Profiles](./scope-inputs).

## Strict Mode

`strict: true` is the default. It catches:

- direct resolution of a scoped key from the root container
- singleton-to-scoped or singleton-to-transient violations introduced by casts
- captured outer-container factory leaks
- synchronous singleton cycles
- synchronous transient cycles
- dynamic-key misuse that bypasses static checking

```ts
const root = new Container({ strict: true })
```

## Fast Mode

Use `strict: false` only after tests prove the graph shape:

```ts
const root = new Container({ strict: false })
```

Fast mode removes runtime cycle and lifetime bookkeeping from the resolve path. Scopes read the immutable root registry directly instead of walking the parent chain, and delegated singletons are mirrored into the scope cache. Strict scopes walk their exact parent chain on every local miss, so mutations remain observable without retained lookup metadata. Owned-instance identity de-duplication runs during disposal in both modes. Fast mode does not change the type-level contract, but it cannot defend against dishonest casts, captured outer containers, or cycles. It also skips the root-scoped guard. Application code must resolve scoped keys from child scopes.

Recommended workflow: develop and test in strict mode, register each runtime key once through one linear fluent chain, and complete registration before the first resolve or scope. Then switch only audited, immutable production graphs and dispose child scopes before their ancestors.
