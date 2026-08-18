# Quick Start

This walkthrough builds one complete graph, resolves a root service, then opens a request scope. No decorators or metadata setup are required.

## Install

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## Build the Graph

```ts
import { Container } from '@inferdi/inferdi'

type RequestContext = {
  requestId: string
}

class Logger {
  info(message: string) {
    console.info(message)
  }
}

class Database {
  constructor(readonly dsn: string) {}
}

class UserService {
  constructor(
    private readonly request: RequestContext,
    private readonly database: Database,
    private readonly logger: Logger
  ) {}

  find(id: string) {
    this.logger.info(`request=${this.request.requestId} user=${id}`)
    return { id, database: this.database.dsn }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, ['dsn'])
  .registerClass(
    'users',
    UserService,
    ['request', 'database', 'logger'],
    'scoped'
  )
```

Each dependency tuple is checked against its constructor. Swapping `database` and `logger`, omitting `request`, or using an unknown key is a TypeScript error.

The graph above has one external input and four registrations:

```text
dsn ───────────────▶ database (singleton) ─┐
logger (singleton) ────────────────────────┼─▶ users (scoped)
request (scope input) ─────────────────────┘
```

## Resolve Services

Root singletons resolve synchronously with `.get()`:

```ts
const database = root.get('database')
```

`users` needs the `request` input, so open a scope before resolving it:

```ts
const request = { requestId: crypto.randomUUID() }

await using scope = root.createScope({ request })
const users = scope.get('users')

users.find('42')
```

The returned scope type records that `request` is ready. Calling `root.get('users')` is rejected because the root has no request input.

## Choose Lifetimes

Registrations default to `singleton`. Pass a lifetime when a value belongs to a scope or to the caller.

| Lifetime    | Created              | Cached by                     | Disposal owner |
|-------------|----------------------|-------------------------------|----------------|
| `singleton` | once                 | the container that creates it | that container |
| `scoped`    | once per child scope | the child scope               | that scope     |
| `transient` | on every resolve     | nobody                        | the caller     |

A singleton cannot directly depend on a scoped or transient service. InferDI enforces this in types and, by default, checks it again at runtime.

## Choose the Next Page

| If you need to…                             | Continue with                                    |
|---------------------------------------------|--------------------------------------------------|
| understand compile-time graph checks        | [Type Safety](../core/type-safety)               |
| model request, tenant, or job data          | [Scope Inputs](../core/scope-inputs)             |
| initialize a dependency asynchronously      | [Async Dependencies](../core/async-dependencies) |
| close databases and other resources safely  | [Scopes and Disposal](../core/scopes)            |
| connect scopes to a web framework           | [Framework Adapters](../adapters/)               |
| see complete framework and runtime examples | [Examples](./examples)                           |
