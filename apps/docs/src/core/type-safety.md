# Type Safety

InferDI models the dependency graph in the type system. A wrong argument order, an unregistered key, and a singleton dependency on scoped state produce type errors in your editor. Runtime guards handle cast-based and dynamic-key bypasses that TypeScript cannot prove.

## Constructor Signatures

`registerClass` checks the dependency tuple against the constructor parameter list.

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

If the constructor changes, the registration changes with it. Swapping `['db', 'logger']` is rejected because the first constructor parameter expects `Logger`.

## Key Uniqueness

Every registration returns a widened container type. Re-registering the same key through the fluent API is rejected:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

Tests use `.override()` when replacement is intentional.

Keep using the widened container returned by each registration. Reusing an older builder reference bypasses the graph type carried by the current chain; see [Bad Practices](./bad-practices).

The uniqueness guard checks the complete set of values represented by the key type. If a candidate is typed as `'dsn' | 'replica'` after `'dsn'` has been registered, TypeScript rejects the call because the runtime value may overwrite `'dsn'`. The same rule applies to a broad `string` or `symbol` and to `lazyKey`, which must not overlap the primary key or any existing key.

Broad and union keys remain valid when their possible values do not overlap the graph. A broad string is valid on an empty container or after symbol-only registrations. Narrow a runtime key to a known fresh member before registering it; use `.override()` when replacement is the goal.

## Dynamic Keys

Static keys are checked directly by `.get()`. When a key comes from runtime input, narrow it with `.has()` first:

```ts
const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

The concrete graph above has no missing scope inputs, and `.getAsync()` accepts either registered key regardless of its sync or async mode. `.has()` proves registration only. It returns `false` for disposed containers, but it does not prove that required scope inputs are ready or that a key can be passed to `.get()`.

## Lifetime in the Type

Each entry carries both the value type and its lifetime. The type system filters dependencies so a singleton cannot depend directly on scoped or transient services.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

The default runtime checks remain defense-in-depth for `as` casts, dynamic keys, captured outer containers, and dependency cycles.

## Readiness and Async Status

The graph type also records scope-input requirements and declarative async registrations. A key disappears from `.get()` until its inputs are provided, and an `AsyncSpec` key moves to `.getAsync()` together with classes that depend on it.

```ts
const root = new Container()
  .declareScopeInputs<{request: Request}>()
  .registerAsyncFactory('db', openDatabase, [])
  .registerClass('handler', Handler, ['request', 'db'], 'scoped')

const scope = root.createScope({request})

// @ts-expect-error: handler is async
scope.get('handler')

await scope.getAsync('handler')
```

Use [Scope Inputs](./scope-inputs) to model readiness and [Async Dependencies](./async-dependencies) to choose the correct Promise contract.
