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

## Override Timing

Overrides must happen before the key is resolved:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

That second line throws. A late override would split the graph: existing consumers would hold the old instance while later resolves returned the mock.

## Ownership

Override values are externally owned. Like `registerValue`, an override is not added to the container's disposal queue. The test fixture owns its cleanup.

## Scope Locality

An override mutates only the container it is called on:

```ts
const scope = root.createScope().override('db', mockDb)
```

The root and sibling scopes are unchanged. Parent-level overrides are visible through the usual parent lookup.
