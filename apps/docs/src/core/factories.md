---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/factories#breadcrumb"
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
          "name": "Factories"
          "item": "https://inferdi.com/core/factories"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/factories#article"
      "headline": "Factories in InferDI — registerFactory"
      "name": "Factories"
      "description": "Use registerFactory when construction needs more than new Ctor(...deps): reading multiple values, adapting third-party clients, building configuration objects, or returning a promise that InferDI caches verbatim."
      "url": "https://inferdi.com/core/factories"
      "mainEntityOfPage": "https://inferdi.com/core/factories"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, factories, registerFactory, async factory, configuration, third-party clients, dependency injection"
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

# Factories

Use `registerFactory` when construction needs more than `new Ctor(...deps)`: reading multiple values, adapting third-party clients, creating configuration objects, or returning a promise.

```ts
const container = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepo, ['pgPool'])
```

The factory return value becomes the key's resolved type.

## Factory Lifetimes

Factories use the same lifetime model as classes:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

Inside a singleton factory, the `c` parameter is narrowed to singleton-safe dependencies. Scoped and transient keys do not autocomplete and are rejected by TypeScript.

## Binding Interfaces

TypeScript interfaces are erased during compilation and have no runtime value to pass as a constructor. Bind an interface to its implementation through an explicit factory type instead:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

Consumers of `'mailer'` see the `Mailer` abstraction, not the concrete class.

## Async Factories

Factories may return promises. The promise itself is cached, so concurrent callers share initialization:

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

const [a, b] = await Promise.all([c.get('db'), c.get('db')])
await c.dispose()
```

`.get()` stays synchronous. Callers await the returned value when the registration is async.

The runtime cycle and lifetime guards project only the synchronous factory call stack. After `await`, `AllowedDeps` still protects normal typed code, but an `as`-cast or captured outer container is outside runtime guard context. Keep dependency reads in the synchronous factory prelude.
