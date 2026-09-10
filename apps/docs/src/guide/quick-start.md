# Quick Start

Start with two ordinary classes and one explicit composition chain. Request scopes come later, after the basic graph is clear.

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

<<< ../../snippets/quick-start-sync.ts

`UserService` has no InferDI import. The composition code chooses `Logger`, names both registrations, and states the constructor order. The returned `root` type now contains both services.

Change the constructor without updating the graph and the registration fails where you assemble the application:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class UserService {
  constructor(readonly logger: Logger, readonly region: string) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger']) // [!code error]
```

That feedback is the practical meaning of graph type state: registrations refine the container type, and later operations must fit the graph already declared.

## Resolve Services

`root.get('users')` returns `UserService` synchronously. Singleton is the default lifetime, so repeated calls return the cached instance.

Request data needs a shorter boundary. Declare it as a scope input, then provide it when opening a child scope:

<<< ../../snippets/quick-start-scope.ts

The `finally` block closes the child even when request work throws. `scope.dispose()` releases the scoped `RequestLog`; the supplied `request` value remains owned by the application. You can use `await using` instead when your TypeScript toolchain supports Explicit Resource Management.

## Choose Lifetimes

| Lifetime | Instance policy | Cache owner | Disposal owner |
|---|---|---|---|
| `singleton` | one per registry owner | root or registration owner | that container |
| `scoped` | one per resolving scope | child scope | that scope |
| `transient` | one per resolution | none | caller |

Values passed through `registerValue`, `.override()`, or scope inputs also remain application-owned. A singleton cannot depend directly on a scoped or transient service; InferDI rejects the declared relationship in types and checks it again in the default runtime contract.

## Choose the Next Page

Read [Why InferDI](./why-inferdi) for the design trade-offs, then [Type Safety](../core/type-safety) for the full set of graph checks. [Scopes and Disposal](../core/scopes) covers ownership, and [Framework Adapters](../adapters/) connects scopes to application lifecycles.
