# @inferdi/inferdi

Type-safe fluent DI container for TypeScript with scopes, lazy injection, lifetime guards and proper async teardown.

- **Strongly typed** — `registerClass` / `registerFactory` accumulate the dependency map at the type level. The compiler refuses to inject a wrong-typed key, and `c.get('foo')` infers the registered type with no manual generics.
- **Lifetimes that don't lie** — `singleton`, `scoped`, `transient`. Singleton-eats-scoped is rejected at resolve time (with a helpful error) instead of silently turning your scoped service into a long-lived singleton.
- **First-class scopes** — `createScope()` produces a child container that inherits registrations and isolates its own caches. Singletons live where they were registered, not always at the root.
- **Lazy injection** — `lazy: true` registers a sibling `${key}Lazy: Lazy<T>` so a singleton can pull a fresh per-resolve value without breaking the lifetime contract.
- **Cycle detection** — circular dependencies are caught with the full chain printed in the error message.
- **Proper teardown** — `Symbol.dispose` / `Symbol.asyncDispose` / plain `.dispose()` are called in LIFO order; multiple errors are surfaced as `AggregateError`. Works with `using` / `await using`.

## Install

```bash
npm i @inferdi/inferdi
# or
pnpm add @inferdi/inferdi
# or
yarn add @inferdi/inferdi
```

## Quick start

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(msg: string) { console.log(msg) }
}

class UserRepo {
  constructor(private logger: Logger, private dsn: string) {}
  find(id: string) { this.logger.log(`finding ${id} in ${this.dsn}`) }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

`deps` is a tuple of keys, not values — the compiler will reject `['dsn', 'logger']` here because the order doesn't match `UserRepo`'s constructor signature.

## Lifetimes

| Kind        | Created                                 | Cached on                | Disposed by container |
| ----------- | --------------------------------------- | ------------------------ | --------------------- |
| `singleton` | once per container that owns the registration | the owner container | yes |
| `scoped`    | once per scope                          | the scope                | yes |
| `transient` | every `.get()`                          | never                    | no (caller owns it)   |

The default kind is `singleton`. Pass the kind as the 4th argument to `registerClass` or the 3rd to `registerFactory`:

```ts
container
  .registerClass('cache', Cache, [], 'singleton')
  .registerClass('requestCtx', RequestCtx, [], 'scoped')
  .registerClass('uuid', Uuid, [], 'transient')
```

**Lifetime rule.** A singleton cannot directly depend on a scoped or transient service — that would either freeze the scoped value into a long-lived cache or break the transient "fresh on every access" contract. The container throws at resolve time:

```
Singleton "userService" cannot depend on scoped "requestCtx".
Use Lazy<T> (register with lazy: true) to get a fresh instance per access.
```

## Lazy injection

When a long-lived service legitimately needs a fresh per-access view of a short-lived one, register the target with `lazy: true` — this auto-generates a sibling `${key}Lazy` of type `Lazy<T>`:

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock { now() { return Date.now() } }

class Audit {
  constructor(private clockLazy: Lazy<Clock>) {}
  record(event: string) { console.log(event, this.clockLazy.get().now()) }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'transient', true)
  // ^^ now both 'clock' (transient) and 'clockLazy' (Lazy<Clock>) are registered
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

`Lazy<T>` is also the canonical fix for circular dependencies between singletons — register one side as lazy and inject the `*Lazy` key into the other.

## Scopes and teardown

```ts
const root = new Container()
  .registerClass('db', Db, [])                     // singleton on root
  .registerClass('reqCtx', RequestCtx, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('reqCtx')                  // cached on this scope only
  // ... handle request ...
}                                                   // scope.dispose() runs here, db survives
```

`dispose()` walks owned instances in reverse-creation order and tries `Symbol.asyncDispose`, then `Symbol.dispose`, then a plain `.dispose()`. Errors don't short-circuit the chain — they're collected and re-thrown as `AggregateError` at the end.

## Cradle (proxy access)

`container.cradle` is a soft-mode proxy: `cradle.foo` calls `get('foo')` for registered keys, returns `undefined` for unknown string keys (so `await cradle` / `Promise.resolve(cradle)` don't crash on a `then` probe), and ignores symbol probes entirely. Use `.get(key)` directly when you want a hard error on unknown keys.

```ts
const userRepo = container.cradle.userRepo
```

## API summary

```ts
class Container<T = {}> {
  registerClass<K, V, A, L>(
    key: K, Ctor: new (...args: A) => V,
    deps: DepsOf<T, A>, kind?: 'singleton' | 'transient' | 'scoped',
    lazy?: L,
  ): Container<T & Record<K, V> & (L extends true ? Record<`${K}Lazy`, Lazy<V>> : {})>

  registerFactory<K, V>(key: K, factory: (c: Container<T>) => V, kind?): Container<T & Record<K, V>>
  registerValue<K, V>(key: K, value: V): Container<T & Record<K, V>>
  use<R>(fn: (c: Container<T>) => Container<T & R>): Container<T & R>

  createScope(): Container<T>
  get<K extends keyof T>(key: K): T[K]
  get cradle(): T

  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
  get disposed(): boolean
}

namespace Container {
  type Resolve<C> = C extends Container<infer U> ? U : never
}

type Lazy<T> = { readonly get: () => T }
type Module<TIn, TOut> = (c: Container<TIn>) => Container<TIn & TOut>
```

## Requirements

- **Node**: `>=20` (native `Symbol.dispose` / `Symbol.asyncDispose`).
- **TypeScript**: `>=5.2` is recommended on the consumer side if you want to use `using` / `await using`. The package itself does not require it.

## License

MIT — see [LICENSE](./LICENSE).
