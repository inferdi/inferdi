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
      "description": "Use registerFactory for custom synchronous construction and registerAsyncFactory for a declarative async dependency graph."
      "url": "https://inferdi.com/core/factories"
      "mainEntityOfPage": "https://inferdi.com/core/factories"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, factories, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, dependency injection"
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

## Hot Transient Graphs

`registerClass` is the default for transient services. Keep it unless profiling identifies construction as a meaningful part of a hot path.

V8 can slow a narrow pattern: one graph repeatedly resolves many different transient classes that have the same dependency count. Register only those measured services with factories when the application artifact confirms the hotspot:

```ts
const container = new Container()
  .registerClass('context', RequestContext, [], 'scoped')
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    'transient',
  )
```

Each factory should contain its own `new Service(...)` call. Do not route several services through one generic construction helper if this optimization matters. Factories repeat dependency wiring, so use them for measured hotspots rather than converting every transient registration.

## Factory Lifetimes

Factories use the same lifetime model as classes:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

Inside a singleton factory, the `c` parameter is narrowed to singleton-safe dependencies. Scoped and transient keys do not autocomplete and are rejected by TypeScript.

Pass an optional fourth `lazyKey` to register a lifetime-preserving `Lazy<V>` companion, exactly as with `registerClass`:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get() // Cache
```

When using the default singleton lifetime, pass `undefined` before the companion key: `registerFactory('cache', factory, undefined, 'cacheLazy')`.

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

## Promise-valued sync factories

`registerFactory` treats a returned Promise as the service value. The key remains synchronous, `get()` returns that Promise, and another factory receives it by identity.

```ts
const c = new Container()
  .registerFactory('dbPromise', () => connectDatabase())

const promise = c.get('dbPromise') // Promise<Database>
```

This legacy form supports single-flight caching. A cycle created after `await` through captured container calls falls outside the synchronous cycle and lifetime guards.

## Declarative async graphs

`registerAsyncFactory` stores the final service type in `AsyncSpec`, resolves its dependency tuple, and passes positional values to the callback. Classes inherit async status from declared dependencies.

```ts
const container = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .registerAsyncFactory(
    'db',
    (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )

const db = await container.getAsync('db')
```

Read [Async Dependency Graph](./async-dependency-graph) for the two Promise models, async propagation through classes, single-flight caching, failure semantics, and async teardown.
