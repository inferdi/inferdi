---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/async-dependency-graph#breadcrumb"
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
          "name": "Async Dependency Graph"
          "item": "https://inferdi.com/core/async-dependency-graph"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/async-dependency-graph#article"
      "headline": "Declarative Async Dependency Graphs in InferDI"
      "name": "Async Dependency Graph"
      "description": "Build typed asynchronous dependency graphs with registerAsyncFactory, getAsync, single-flight caching, scope isolation, and explicit teardown."
      "url": "https://inferdi.com/core/async-dependency-graph"
      "mainEntityOfPage": "https://inferdi.com/core/async-dependency-graph"
      "inLanguage": "en-US"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, async dependency graph, registerAsyncFactory, getAsync, AsyncSpec, single-flight, TypeScript dependency injection"
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

# Async Dependency Graph

`registerAsyncFactory` records an explicit async edge. The graph stores the final service type, awaits declared async dependencies, and propagates async status through dependent classes.

## Choose the Promise Model

InferDI supports two contracts because a Promise can be either the service itself or the initialization boundary for a service.

| API | Graph value | Injection | Resolve with |
| --- | --- | --- | --- |
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | The Promise object by identity | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` in `AsyncSpec` | The fulfilled `Database` | `getAsync()` |

Use `registerAsyncFactory` when downstream services need the fulfilled value. Keep a Promise-valued `registerFactory` only when the Promise itself belongs in your synchronous graph.

## Build an Async Request Graph

The following graph initializes one database for the root and one session per authenticated scope. Classes become async when any declared dependency is async.

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard belongs to the async graph
scope.get('dashboard')
```

The compiler also rejects `root.getAsync('dashboard')` because the root has no `auth` input. Read [Scope Inputs and Profiles](./scope-inputs) for profile construction.

## Resolution and Scheduling

`getAsync()` accepts ready sync and async keys and returns a Promise. A synchronous lookup, cycle, lifetime, or disposal error becomes a rejected Promise.

InferDI starts declared dependencies in tuple order. It waits for entries marked as declarative async, then calls the factory with positional values. Independent async dependencies can initialize at the same time.

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

The callback receives values rather than a container. This keeps the async edges visible to TypeScript and the runtime preflight.

Annotate each callback parameter, or pass a function with an existing signature, when `deps` is not empty. The tuple checks those parameter types and their order; it does not provide contextual parameter inference.

## Caching by Lifetime

| Lifetime | Initialization | Ownership |
| --- | --- | --- |
| `singleton` | One native Promise in the owning container | Owning container |
| `scoped` | One native Promise per resolving scope | Resolving scope |
| `transient` | A new initialization for each call | Caller |

Concurrent callers share singleton and scoped initialization. A rejected cached Promise stays as the failed state; InferDI does not retry it. Open a new scope or rebuild the root when retry belongs to the application lifecycle.

`has()` checks registration without starting initialization. It does not prove that a key is synchronous and does not provide missing scope inputs.

## Async Resource Teardown

Singleton and scoped registrations keep their Promise in the cache after fulfillment. Dispose their container asynchronously so InferDI can await initialization and probe the resolved resource.

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

`await using`, `dispose()`, and `Symbol.asyncDispose` support owned async resources. Sync `using` cannot unwrap a cached Promise and reports the misuse.

## Legacy Promise Values

A Promise returned from `registerFactory` remains a synchronous service value. Declarative async factories receive that Promise by identity because it has no `AsyncSpec` marker.

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

At the top-level, `getAsync('dbPromise')` follows JavaScript await semantics and resolves to `Database`.

## Boundaries and Failure Semantics

- Pass readonly dependency tuples to `registerAsyncFactory` and to `registerClass` when the tuple may select an async key. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples.
- Declarative cycles and cold lifetime violations fail during synchronous preflight. Calls through a captured container after a Promise boundary create dynamic edges outside that analysis.
- InferDI does not provide async `Lazy<T>`, retry, cancellation, or rollback. Split a cycle or move shared initialization into a separate service.
- If a later dependency fails during preflight, earlier initializations keep their cache and ownership state. An already-started async transient may continue without a teardown handle.
- A class with an async dependency cannot receive a synchronous lazy companion. `registerAsyncFactory` has no `lazyKey` parameter.

See [Factories](./factories) for synchronous construction and [Scopes and Teardown](./scopes) for the ownership model.
