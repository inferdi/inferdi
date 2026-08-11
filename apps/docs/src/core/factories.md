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
      "dateModified": "2026-08-09"
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

`registerAsyncFactory` stores the final service type in `AsyncSpec` and receives positional dependency values. A dependent `registerClass` entry inherits async status through the graph.

```ts
class Repository {
  constructor(readonly db: Database) {}
}

const root = new Container()
  .registerValue('config', {url: 'postgres://localhost/app'})
  .declareScopeInputs<{request: RequestContext}>()
  .registerAsyncFactory(
    'db',
    async (config) => connectDatabase(config.url),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (request) => loadSession(request),
    ['request'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])

const scope = root.createScope({request})
const repository = await scope.getAsync('repository')

// @ts-expect-error — async graph keys require getAsync()
scope.get('repository')
```

`getAsync()` accepts ready sync and async keys and returns a Promise. TypeScript rejects `get()` when a key or key union may contain an `AsyncSpec`. `has()` proves registration existence only; it does not prove a sync key or provide missing scope inputs.

The container starts declared dependencies in tuple order and waits only for entries marked as declarative async. Singleton and scoped registrations cache one native Promise. Transient registrations start per call and stay caller-owned. Declarative cycles and cold lifetime violations fail during synchronous preflight.

The async callback receives no container. Calls through captured containers after the Promise boundary create dynamic edges outside graph analysis. InferDI does not add async `Lazy<T>` companions, retry, cancellation, or rollback. If a later sibling fails during preflight, earlier initializations keep their existing cache and ownership state; an orphaned async transient may continue without a teardown handle.

Owned async singleton and scoped entries keep the Promise in cache after fulfillment. Close their containers with `await using`, `await container.dispose()`, or `Symbol.asyncDispose`. Sync `using` reports that it cannot unwrap the cached Promise.

Pass readonly dependency tuples to `registerAsyncFactory` and to `registerClass` when the tuple may select an async key. InferDI retains the tuple and classifies async positions once; inline literals infer readonly automatically.
