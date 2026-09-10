# Async Dependencies

`registerAsyncFactory` records an explicit async edge. The graph stores the final service type, awaits declared async dependencies, and propagates async status through dependent classes.

## Choose the Promise Model

InferDI supports two contracts because a Promise can be either the service itself or the initialization boundary for a service.

| API                                             | Graph value               | Injection                      | Resolve with |
|-------------------------------------------------|---------------------------|--------------------------------|--------------|
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>`       | The Promise object by identity | `get()`      |
| `registerAsyncFactory('db', connect, [])`       | `Database` in `AsyncSpec` | The fulfilled `Database`       | `getAsync()` |

Use `registerAsyncFactory` when downstream services need the fulfilled value. Keep a Promise-valued `registerFactory` only when the Promise itself belongs in your synchronous graph.

The distinction also controls lazy companions. A Promise-valued
`registerFactory(..., lazyKey)` produces `Lazy<Promise<T>>`; a declarative
`registerAsyncFactory(..., lazyKey)` produces `AsyncLazy<T>`.

## Register Async Factories

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

The compiler also rejects `root.getAsync('dashboard')` because the root has no `auth` input. Read [Scope Inputs](./scope-inputs) for profile construction.

## Resolve and Propagate

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

## Scheduling and Caching

| Lifetime    | Initialization                             | Ownership        |
|-------------|--------------------------------------------|------------------|
| `singleton` | One native Promise in the owning container | Owning container |
| `scoped`    | One native Promise per resolving scope     | Resolving scope  |
| `transient` | A new initialization for each call         | Caller           |

Concurrent callers share singleton and scoped initialization. A rejected cached Promise stays as the failed state; InferDI does not retry it. Open a new scope or rebuild the root when retry belongs to the application lifecycle.

`has()` checks registration without starting initialization. It does not prove that a key is synchronous and does not provide missing scope inputs.

## AsyncLazy Companions

Pass a fifth `lazyKey` to defer a declarative async target:

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

Wrapper creation stays synchronous, so a class that injects `AsyncLazy<T>`
does not inherit async status from that dependency. An async-propagated class
with its own `lazyKey` produces `AsyncLazy<Class>`. A class dependency key that
may choose a sync or async registration produces a
`Lazy<Class> | AsyncLazy<Class>` companion.

The wrapper captures the resolving container. Scoped targets stay isolated by
that captured scope. Transients start per call and remain caller-owned.

## Teardown and Failures

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

Sync disposal attaches a rejection observer to a cached native Promise before throwing that misuse error, which prevents a later rejection from reaching `unhandledRejection`. It does not await the Promise or assimilate a custom thenable.

A rejected singleton or scoped initialization remains cached. InferDI does not retry it. Rebuild the root or open a new scope when retry belongs to the application lifecycle. If a later dependency fails during preflight, earlier initializations retain their cache and ownership state.

Dependency failure can propagate through several cached initialization Promises. Async disposal reports the same `Error` object once; distinct error objects remain distinct `AggregateError` causes, including objects with equal messages.

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

## Dynamic Boundaries

- Pass readonly dependency tuples to `registerAsyncFactory` and to `registerClass` when the tuple may select an async key. InferDI classifies async positions once and retains the tuple reference. Inline literals infer readonly tuples.
- Declarative cycles and cold lifetime violations fail during synchronous preflight. Calls through a captured container after a Promise boundary create dynamic edges outside that analysis.
- `AsyncLazy<T>` defers resolution; it does not add retry, cancellation, or rollback.
- An already-started async transient may continue without a teardown handle if a later dependency fails during preflight.
- A dynamic cycle through `AsyncLazy.get()` after a Promise boundary can wait on its own cached pending Promise. The synchronous cycle detector cannot report that deadlock.

See [Factories](./factories) for synchronous construction and [Scopes and Disposal](./scopes) for the ownership model.

## Compiler Check

A declarative async registration is excluded from synchronous `.get()` and remains available through `.getAsync()`:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Database {
  query() {}
}

const container = new Container()
  .registerAsyncFactory('database', async () => new Database(), [])

container.get('database') // [!code error]

const database = await container.getAsync('database')
//    ^?
```
