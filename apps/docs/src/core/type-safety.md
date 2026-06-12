# Type Safety

InferDI's central rule: the dependency graph lives in the type system. An invalid graph — a wrong argument order, a key that was never registered, a singleton reaching for scoped state — is a type error you see in your editor, not a stack trace you discover under load. Anything the compiler can prove statically is checked statically; runtime guards exist only to catch what `as` casts and dynamic keys slip past.

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

## Lifetime in the Type

Each entry carries both the value type and its lifetime kind. The type system filters dependencies so a singleton cannot depend directly on scoped or transient services.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

Runtime strict mode remains defense-in-depth for `as` casts, dynamic keys, captured outer containers, and dependency cycles.
