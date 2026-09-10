# Type Safety

InferDI carries the declared dependency graph in the container's type. Each registration adds a key, service type, lifetime, sync or async state, and any scope-input requirements. Later calls are checked against that accumulated graph type state.

## Constructor Signatures

`registerClass` checks dependency keys against constructor parameters by position and structural assignability.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

The two dependencies have different public shapes, so swapping them produces the error claimed by the example:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript uses structural typing. Two empty classes, or two classes with identical public members, are assignable to each other and cannot prove semantic order. Give contracts distinct shapes. If two values must remain different despite sharing a shape, brand the value types as described under [Symbol Keys](./symbol-keys#same-value-shape).

## Key Uniqueness

Every fluent registration returns a container with a wider graph type. Registering an existing key again is an error:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

Use `.override()` when a test intentionally replaces a service. Keep the returned container from every registration; an older reference does not carry later graph state. [Bad Practices](./bad-practices#stale-builder-references) shows the failure mode.

The uniqueness guard checks every possible value of a key type. After registering `'dsn'`, a candidate typed as `'dsn' | 'replica'` is rejected because it might overwrite `'dsn'` at runtime. Broad `string` and `symbol` keys remain valid when they cannot overlap the known graph, although widening a key also makes the graph less precise.

## Dynamic Keys

Literal keys are checked directly by `.get()`. Narrow a key obtained at runtime with `.has()`:

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` proves registration. It does not prove that missing scope inputs are ready or that an async key is accepted by synchronous `.get()`.

## Lifetime in the Type

Each entry records its lifetime. A singleton cannot capture a scoped or transient dependency:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

The default runtime contract repeats cycle and lifetime checks for casts, dynamic keys, and captured containers that TypeScript cannot inspect. `{ fast: true }` is a separate fixed-graph contract with fewer runtime checks.

## Readiness and Async Status

Scope inputs and declarative async dependencies also change which keys are ready and whether they resolve through `.get()` or `.getAsync()`:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

The root lacks `request`, and the ready `handler` remains async because it depends on `database`. Continue with [Scope Inputs](./scope-inputs) and [Async Dependencies](./async-dependencies).
