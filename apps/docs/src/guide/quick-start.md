---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/quick-start#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guide"
          "item": "https://inferdi.com/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Quick Start"
          "item": "https://inferdi.com/guide/quick-start"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/quick-start#article"
      "headline": "InferDI Quick Start: build your first typed dependency graph"
      "name": "Quick Start"
      "description": "Build a dependency graph with InferDI's fluent API. TypeScript checks constructor arguments as you register services, and cached resolves use one Map.get() lookup."
      "url": "https://inferdi.com/guide/quick-start"
      "mainEntityOfPage": "https://inferdi.com/guide/quick-start"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, quick start, dependency injection, TypeScript DI, container, fluent API, type-safe"
      "articleSection": "Guide"
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

# Quick Start

Build the dependency graph through a fluent API. TypeScript matches each dependency tuple to the target constructor, so swapped and missing arguments fail at compile time. The wiring uses plain code, without `@Injectable()` decorators or `reflect-metadata`.

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string,
  ) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

The call to `registerClass('userRepo', UserRepo, ['logger', 'dsn'])` is checked positionally. If you swap the tuple to `['dsn', 'logger']`, TypeScript reports the mismatch before the app runs.

## Resolve Values

Use `.get(key)` for resolution:

```ts
const repo = container.get('userRepo')
```

The key must be registered in the container type. Unknown static keys are compile errors. Dynamic keys should be probed with `.has(key)` before `.get(key)`.

## Choose Lifetimes

Registrations default to `singleton`. Pass the lifetime as the fourth argument for classes, or the third argument for factories.

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| Kind | Created | Cached | Disposed by container |
| --- | --- | --- | --- |
| `singleton` | once per owning container | yes | yes |
| `scoped` | once per scope | yes | yes |
| `transient` | every resolve | no | no |

Singletons cannot directly depend on `scoped` or `transient` services. That rule is enforced by types and, in strict mode, by runtime guards.
