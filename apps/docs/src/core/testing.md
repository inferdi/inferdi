# Testing and Overrides

Use `.override()` when tests need to replace an existing registration with a mock.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

The override value must be assignable to the original registered type. Missing keys and incompatible mocks are TypeScript errors.

## Typed Providers

`Container.Providers<C>` converts a built container type into provider thunks. It is useful when a test helper should construct mocks without resolving the production graph.

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

The helper preserves every service type, including values behind managed lazy companions. It does not register the providers or transfer their ownership; the test decides how to apply and dispose them.

## Override Timing

Apply overrides before resolving the dependency graph:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

The second line throws because the singleton value is already cached on this container. The guard is deliberately cache-based: it also catches scoped values cached on the current scope, `registerValue`, and repeated overrides. With `fast: false`, transient resolutions and ancestor-owned values resolved through a child are not cached locally, so they are not tracked. Fast scopes may mirror delegated singletons locally and do not support mutation after activation. A previously returned transient remains with its caller while later resolves return the mock. Treat this as part of the contract, not permission for late overrides: applying every override before graph resolution avoids split graphs.

## Ownership

Override values are externally owned. Like `registerValue`, an override is not added to the container's disposal queue. The test fixture owns its cleanup.

## Scope Locality

An override mutates only the container it is called on:

```ts
const scope = root.createScope().override('db', mockDb)
```

The root and sibling scopes are unchanged. Parent-level overrides are visible through the usual parent lookup.
