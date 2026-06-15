---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/type-safety#breadcrumb"
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
          "name": "Type Safety"
          "item": "https://inferdi.com/core/type-safety"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/type-safety#article"
      "headline": "Type Safety in InferDI — the graph is the type"
      "name": "Type Safety"
      "description": "InferDI keeps the dependency graph in the type system: a wrong argument order, an unregistered key, or a singleton reaching for scoped state is a compile error in your editor, not a runtime stack trace you find under load."
      "url": "https://inferdi.com/core/type-safety"
      "mainEntityOfPage": "https://inferdi.com/core/type-safety"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, type safety, TypeScript, type inference, constructor signatures, compile-time, dependency injection"
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

# Type Safety

InferDI's central rule: the dependency graph lives in the type system. An invalid graph — a wrong argument order, a key that was never registered, a singleton reaching for scoped state — is a type error you see in your editor, not a stack trace you discover under load. Anything the compiler can prove statically is checked statically; runtime guards exist only to catch what `as` casts and dynamic keys slip past.

## Constructor Signatures

`registerClass` checks the dependency tuple against the constructor parameter list.

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

If the constructor changes, the registration changes with it. Swapping `['db', 'logger']` is rejected because the first constructor parameter expects `Logger`.

## Key Uniqueness

Every registration returns a widened container type. Re-registering the same key through the fluent API is rejected:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

Tests use `.override()` when replacement is intentional.

## Lifetime in the Type

Each entry carries both the value type and its lifetime kind. The type system filters dependencies so a singleton cannot depend directly on scoped or transient services.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

Runtime strict mode remains defense-in-depth for `as` casts, dynamic keys, captured outer containers, and dependency cycles.
