# Lazy Injection

`Lazy<T>` and `AsyncLazy<T>` defer resolution until you call `.get()`. The target's registration mode selects the return type.

| Target                                   | Companion                               |
|------------------------------------------|-----------------------------------------|
| Sync registration                        | `Lazy<T>` with `get(): T`               |
| Declarative async registration           | `AsyncLazy<T>` with `get(): Promise<T>` |
| Class with a sync/async union dependency | `Lazy<T> \| AsyncLazy<T>`               |

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

Passing a `lazyKey` to `registerClass` or `registerFactory` creates a companion registration whose value is `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` takes the companion key as its fifth argument:

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Resolving or injecting `dbLazy` does not call `connectDatabase`. The first
`.get()` starts the target. Singleton and scoped targets return their cached
native Promise, including a cached rejection. A transient target starts on
each call and remains caller-owned.

A Promise-valued `registerFactory` remains part of the sync graph and produces
`Lazy<Promise<T>>`; only declarative async targets produce `AsyncLazy<T>`.

## Lifetime Is Preserved

Lazy companions preserve the target lifetime. A singleton may inject only a `Lazy` or `AsyncLazy` companion for a singleton target. TypeScript rejects possibly short-lived target-lifetime unions and managed/unmanaged unions as well.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped and transient consumers may use lazy companions for any lifetime because they are not cached globally.

## Captured Scope and Disposal

The wrapper captures the container that resolved it. A wrapper obtained from
one child scope keeps using that scope after you create another child. Calling
`AsyncLazy.get()` after disposing the captured scope returns a rejected
Promise.

The owning container disposes resolved singleton and scoped targets. Disposing
before the first `.get()` has no target to clean up. Disposal waits for a
singleton or scoped initialization that has already started. Transient results
stay caller-owned.

## Circular Dependencies

InferDI detects synchronous cycles, including declarative async dependencies during preflight. `Lazy<singleton>` can defer a synchronous singleton edge. `AsyncLazy` can move an edge past the Promise boundary, where the synchronous cycle detector cannot follow it. If an initialization reaches its own cached pending Promise through `AsyncLazy.get()`, both sides wait forever. Split shared initialization, hoist one side, or remove the cycle. See [Async Dependencies](./async-dependencies) for the async boundary.
