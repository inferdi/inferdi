# Bad Practices

Keep using the container reference returned by the latest `register*` call. An older reference carries an older graph type, even though it points to the same runtime container.

## Reusing an old builder reference

Each `register*` method mutates the container and returns that object with a widened generic type. TypeScript widens the return value. It does not change the type of references created before the call.

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// Compiles because base still has the type Container<{}>.
base.registerAsyncFactory('dependency', async () => 2, [])

// Typed as number, but the new registration supplies Promise<number>.
syncGraph.get('consumer').dependency
```

`base` and `syncGraph` point to the same object. The last registration overwrites the runtime entry for `dependency`, while the `syncGraph` type still describes the original synchronous graph. Classes registered before the overwrite keep their dependency classification.

## Why the compiler permits it

Duplicate-key checking uses the keys in the receiver's graph type. The type of `syncGraph` contains `dependency`, so registering that key through `syncGraph` produces a type error. The type of `base` remains `Container<{}>`, where `keyof T` is `never`.

TypeScript does not update generic arguments across aliases of a mutable object. It also has no linear or affine types that could mark `base` as consumed after a registration. InferDI does not add a registry lookup to every registration to track stale aliases at runtime, since that would add cost to valid graph construction.

## Keep the latest returned reference

Build the graph in one chain and use its result:

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

Do not ignore a `register*` return value and then continue registration through an earlier reference. A module should also return the container produced by its final registration. See [Modules](./modules).

## Do not use `register*` as a replacement API

Choose each production registration once while building the graph. Use normal control flow or `.use()` when configuration selects between implementations.

Tests may use `.override()` before resolution when the replacement preserves the original lifetime, lazy mode, and async mode. `.override()` cannot convert a synchronous registration into a declarative async registration. See [Testing and Overrides](./testing).
