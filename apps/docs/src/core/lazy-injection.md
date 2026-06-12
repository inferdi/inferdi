# Lazy Injection

`Lazy<T>` is a small deferred-resolution wrapper. It is useful when construction order needs to be delayed, or when two singleton services need to refer to each other without resolving both in constructors.

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

Passing a `lazyKey` creates a companion registration whose value is `{ get: () => target }`.

## Lifetime Is Preserved

Lazy is not a lifetime escape hatch. A singleton may inject only a `Lazy` companion for a singleton target.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped and transient consumers may use lazy companions for any lifetime because they are not cached globally.

## Circular Dependencies

InferDI detects cycles; it does not auto-break them. For two singleton services, put `Lazy<singleton>` on one side and keep the other side direct. For async factory cycles, the recommended fix is architectural: split shared initialization, hoist one side, or avoid the cycle.
