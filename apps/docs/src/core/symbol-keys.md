---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/symbol-keys#breadcrumb"
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
          "name": "Symbol Keys"
          "item": "https://inferdi.com/core/symbol-keys"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/symbol-keys#article"
      "headline": "Symbol Keys in InferDI"
      "name": "Symbol Keys"
      "description": "Every registration key can be a string or a symbol. Strings suit app-wide public services; symbols give collision-free identity, and local Symbol() keys stay garbage-collectable with the container."
      "url": "https://inferdi.com/core/symbol-keys"
      "mainEntityOfPage": "https://inferdi.com/core/symbol-keys"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, symbol keys, Symbol, string keys, identity, garbage collection, dependency injection"
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

# Symbol Keys

Every registration key can be a `string` or a `symbol`. Strings are convenient for app-wide public services. Symbols are useful when identity matters.

```ts
const DB = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB, PgPool, ['config'])
  .registerClass(CACHE, RedisPool, [])
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)
c.get(CACHE)
c.get('repo')
```

## When To Use Symbols

| Pattern | Token |
| --- | --- |
| Private module-local service | `Symbol('name')` |
| Shared identity without imports | `Symbol.for('name')` |
| Nominal type-level distinction | `unique symbol` constant |

Use local symbols for collectable private services. `Symbol.for(name)` is stored in the global symbol registry and is never garbage-collected.

## Lazy Companions

The lazy companion key can also be a symbol:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

The primary key and companion key do not need to be the same kind.
