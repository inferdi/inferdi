---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/lazy-injection#breadcrumb"
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
          "name": "Lazy Injection"
          "item": "https://inferdi.com/core/lazy-injection"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/lazy-injection#article"
      "headline": "Lazy Injection in InferDI — Lazy<T>"
      "name": "Lazy Injection"
      "description": "Lazy<T> is a deferred-resolution wrapper for delaying construction order or letting two singletons refer to each other without resolving both in their constructors — without breaking the lifetime guard."
      "url": "https://inferdi.com/core/lazy-injection"
      "mainEntityOfPage": "https://inferdi.com/core/lazy-injection"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, lazy injection, Lazy, deferred resolution, circular dependency, singleton, dependency injection"
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

# Lazy Injection

`Lazy<T>` is a small deferred-resolution wrapper. It is useful when construction order needs to be delayed, or when two singleton services need to refer to each other without resolving both in constructors.

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

Passing a `lazyKey` to `registerClass` or `registerFactory` creates a companion registration whose value is `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

## Lifetime Is Preserved

Lazy is not a lifetime escape hatch. A singleton may inject only a `Lazy` companion for a singleton target.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped and transient consumers may use lazy companions for any lifetime because they are not cached globally.

## Circular Dependencies

InferDI detects cycles; it does not auto-break them. For two singleton services, put `Lazy<singleton>` on one side and keep the other side direct. For async factory cycles, the recommended fix is architectural: split shared initialization, hoist one side, or avoid the cycle.
