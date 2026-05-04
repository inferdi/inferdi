# InferDI

![npm version](https://img.shields.io/npm/v/@inferdi/inferdi.svg)
![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
![License](https://img.shields.io/npm/l/@inferdi/inferdi.svg)

A zero-dependency, **decorator-free**, strongly typed DI container for modern TypeScript.

Build your dependency graph using a fluent API that infers types automatically, prevents memory leaks with strict lifetime guards, and handles teardown natively via the Explicit Resource Management API (`using` / `await using`).

## Why InferDI?

Legacy DI is slow, bloated with decorators, and prone to memory leaks. **InferDI is built for 2026:** it’s ruthlessly fast, strictly typed, and built for the modern edge.

- ☁️ **Zero-Weight Edge Native**  
  Just 1.5KB gzipped. Zero dependencies. The perfect fit for all serverless platforms, including Cloudflare Workers, Vercel Edge, Deno Deploy, and Supabase. While other frameworks trigger cold starts, InferDI is already running.

- ⚡ **Raw Engine Speed**  
  Built to outperform the competition. Highly optimized for V8 and JSC inline caching. It doesn't just resolve dependencies — it executes at native engine speed.

- 🛡️ **Zero Magic. 100% Type-Safe**  
  No `@Inject()`. No `reflect-metadata`. The compiler strictly enforces your constructor signatures. Wrong argument order or type? It simply won't compile.

- 🛑 **Impossible Memory Leaks**  
  Silent cross-user data leaks are a thing of the past. InferDI physically blocks you from injecting short-lived scoped resources into global singletons. Architectural flaws crash instantly in development, guaranteeing zero leaks in production.

- ♻️ **Native `using` Teardown**  
  Full support for modern resource management. Scopes destroy instances in strict **LIFO order**, safely catching multiple disconnect failures in a single clean `AggregateError`.

- 🧠 **Crash-Proof Destructuring**  
  InferDI intelligently filters hidden protocol probes, guaranteeing absolute runtime stability and saving hours of debugging.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Factories](#factories)
- [Binding Interfaces](#binding-interfaces)
- [Compiler-enforced Signatures](#compiler-enforced-signatures)
- [Scopes & Native Teardown](#scopes--native-teardown)
- [Strict Lifetime Guards](#strict-lifetime-guards)
- [Lazy Injection](#lazy-injection)
- [Modularity with `.use()`](#modularity-with-use)
- [Typing a Built Container — `Container.Resolve<C>`](#typing-a-built-container--containerresolvec)
- [Cradle (Proxy Access)](#cradle-proxy-access)
- [Errors](#errors)
- [API Summary](#api-summary)
- [License](#license)

## Install

InferDI is published to **two registries** with identical contents:

- **npm** as `@inferdi/inferdi` — for Node, Bun, and any tooling that resolves npm.
- **JSR** as `@inferdi/inferdi` — for Deno and any runtime that prefers TypeScript sources directly.

Pick the channel that matches your runtime — the import code below stays the same.

### Node.js

```bash
npm  i   @inferdi/inferdi   # npm
pnpm add @inferdi/inferdi   # pnpm
yarn add @inferdi/inferdi   # yarn
```

```ts
import { Container } from '@inferdi/inferdi'
```

### Bun

```bash
bun add @inferdi/inferdi          # from npm
# or
bun add jsr:@inferdi/inferdi      # from JSR (TypeScript sources)
```

```ts
import { Container } from '@inferdi/inferdi'
```

### Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

Or import via the full JSR specifier without an `add` step:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

### Requirements

- **Node ≥ 16.** On Node < 20.4 `Symbol.dispose` / `Symbol.asyncDispose` are auto-polyfilled via `Symbol.for` on import, so `using` / `await using` interop is preserved.
- **Bun ≥ 1.0** and **Deno ≥ 1.40** ship native `Symbol.dispose` / `Symbol.asyncDispose` — the polyfill is a no-op there.
- **TypeScript ≥ 5.2** is recommended on the consumer side if you want to use `using` / `await using` syntax. The library itself works with older TypeScript versions — only the explicit-resource-management syntax requires 5.2+.

## Quick Start

Notice how you don't need any `@Injectable()` decorators. The dependency types are inferred directly from the strings you pass.

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(msg: string) { console.log(`[LOG] ${msg}`) }
}

class UserRepo {
  // Plain TypeScript class, no decorators!
  constructor(private readonly logger: Logger, private readonly dsn: string) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  // The deps tuple is type-checked positionally against UserRepo's constructor.
  // Swapping the order to ['dsn', 'logger'] is rejected at compile time.
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

// Type-safe resolve — TypeScript knows `userRepo` is `UserRepo`:
container.get('userRepo').find('42')
```

`.get(key)` is the primary, type-safe way to resolve. `container.cradle` is a Proxy alternative for ergonomic destructuring (see [Cradle](#cradle-proxy-access) below).

## Factories

Use `registerFactory` when construction is more than `new Class(deps)` — for example, when you need to read multiple values from the container, build a config object, or wrap a third-party connection. The factory receives the container; the type `V` is inferred from its return value.

```ts
import { Pool } from 'pg'

const container = new Container()
  .registerValue('config', { dsn: 'postgres://...', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  // ^ container.get('pgPool') is now typed as `Pool` automatically.
  .registerClass('userRepo', UserRepo, ['pgPool'])
```

Factories follow the same lifetime rules as classes — pass the kind as the third argument: `registerFactory('cache', factory, 'scoped')`.

## Binding Interfaces

TypeScript interfaces do not exist at runtime, so you cannot pass them to `registerClass` — the key would be inferred as the concrete class, not the abstraction. To bind an interface to a concrete implementation, use `registerFactory` with an explicit type argument:

```ts
interface Mailer { send(msg: string): void }

class SendGridMailer implements Mailer {
  send(msg: string) { /* ... */ }
}

const container = new Container()
  // Explicitly tell InferDI this key yields a `Mailer`, not a `SendGridMailer`.
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

Now any consumer that depends on `'mailer'` sees the `Mailer` abstraction, and you can swap `SendGridMailer` for another implementation (e.g. `MockMailer` in tests) without touching downstream types.

## Compiler-enforced Signatures

In traditional DI frameworks, injection errors — like swapping the argument order, passing the wrong type, or forgetting a dependency entirely — only surface as runtime crashes.
**InferDI validates your dependency graph at compile time.** Thanks to advanced TypeScript mapping (`DepsOf`), the array of dependency keys is strictly checked against the types and positional order of the target class's constructor arguments.

```typescript
class Logger {
  log(msg: string) {}
}

class UserRepo {
  // The constructor strictly expects: (Logger, string)
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string
  ) {}
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger,[])

  // ❌ TypeScript Error: Type '"dsn"' is not assignable to type '"logger"'.
  // The compiler knows the 1st arg needs a Logger, but 'dsn' yields a string.
  .registerClass('userRepo', UserRepo, ['dsn', 'logger'])

  // ✅ Compiles perfectly. 
  // If you change the UserRepo constructor later, this line will break at compile time!
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])
```

**Fearless Refactoring:**  If you ever change the `UserRepo` constructor signature (add a parameter, remove one, or just swap their order), TypeScript will instantly highlight the error at the `.registerClass()` call. Your production app will never crash due to a misaligned dependency again.

## Scopes & Native Teardown

Container itself implements `Symbol.dispose` and `Symbol.asyncDispose`, so it works with `using` / `await using` directly. Owned instances are torn down in reverse-creation order (LIFO).

```ts
const root = new Container()
  .registerClass('db', Db, [])                     // singleton on root
  .registerClass('reqCtx', RequestCtx, [], 'scoped')

async function handle(request: Request) {
  // The scope's owned instances (its scoped/singleton-on-scope services) are
  // auto-disposed in LIFO order when the function exits. Transient instances
  // are owned by the caller — the container neither caches nor disposes them.
  // Singletons live on `root` and stay alive until root is disposed.
  await using scope = root.createScope()

  const ctx = scope.get('reqCtx') // cached on this scope only
  // ... handle request ...
}

// At application shutdown, dispose the root explicitly:
await root[Symbol.asyncDispose]()           // or: await root.dispose()
```

The container probes each owned instance in order: `Symbol.asyncDispose` → `Symbol.dispose` → plain `.dispose()`. If multiple disposers throw, all errors are collected into a single `AggregateError` so one failing resource never leaves the rest unclosed.

> **What gets disposed by which container.** Each container disposes only the instances it created. `root.dispose()` does **not** propagate into already-created child scopes — give scopes their own `await using` (or `dispose()` call) to release their resources. Forgetting to dispose a scope leaks every singleton/scoped instance it created.

```ts
try {
  await root.dispose()
} catch (e) {
  // Catch multiple DB/Redis disconnect failures at once!
  if (e instanceof AggregateError) {
    console.error(e.errors)
  }
}
```

## Strict Lifetime Guards

| Kind        | Created                                         | Cached on                | Disposed by container |
| ----------- | ----------------------------------------------- | ------------------------ | --------------------- |
| `singleton` | once per container that owns the registration | the owner container      | yes |
| `scoped`    | once per scope                                  | the scope                | yes |
| `transient` | every time requested                            | never                    | no (caller owns it)   |

**The Lifetime Rule:** A singleton cannot directly depend on a scoped or transient service. That would freeze a short-lived value inside a long-lived cache. `InferDI` prevents this design flaw by throwing at resolve time:

```
Error: Singleton "userService" cannot depend on scoped "requestCtx".
Use Lazy<T> (register with lazy: true) to get a fresh instance per access.
```

## Lazy Injection

When a singleton legitimately needs a fresh per-access view of a short-lived service, register the target with `lazy: true`. This auto-generates a sibling `${key}Lazy` of type `Lazy<T>`:

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock { now() { return Date.now() } }

class Audit {
  constructor(private readonly clockLazy: Lazy<Clock>) {}
  record(event: string) { console.log(event, this.clockLazy.get().now()) }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'transient', true)
  // ^ registers BOTH 'clock' (transient) AND 'clockLazy' (Lazy<Clock>).
  //   The compiler infers the Lazy<Clock> type — you don't declare it.
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')

c.get('audit').record('login')   // a fresh Clock instance per .record()
```

> ⚠️ **Pitfall — `Lazy<scoped>` injected into a singleton.**
> The lazy wrapper captures the container in which it was *resolved*, not in which it is later *called*. A singleton resolves on its owning container (usually root), so its captured `c` is root. The first `lazyWrapper.get()` then resolves the scoped target on root and caches it there — effectively turning it into a singleton. `Lazy<T>` legalizes the injection per the lifetime check, but it does **not** make a scoped target truly per-scope when used from a long-lived consumer. For request-scoped values inside long-lived services, use `AsyncLocalStorage` instead. (Transient is unaffected: it is never cached, every `.get()` creates a new instance.)

> **Note on circular dependencies.** True mutual recursion (A's constructor needs B, B's constructor needs A) cannot be expressed in fluent registration — both sides would forward-reference each other's keys, which the type system rejects by design. The container's runtime cycle detector exists to catch accidental cycles introduced via factories, not to "break" them automatically. If you have a real A↔B cycle, restructure: extract a shared dependency, switch to event-based communication, or split one of the classes.

## Modularity with `.use()`

For large applications, split your container setup into chunks via `.use()`. The idiomatic shape is an **inline lambda** — TypeScript infers the lambda's container type from the call site, so `c.registerXyz(...)` typechecks against the full accumulated key set without you re-listing prior keys. Inside the lambda you can also read previously registered values to make dynamic registration decisions:

```ts
import { Container } from '@inferdi/inferdi'

const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

For named, **fixed-shape** module builders (e.g., test fixtures that always start from a specific base), use the exported `Module<TIn, TOut>` type — `TIn` must match the container's T exactly at the `.use()` call site:

```ts
import { Container, type Module } from '@inferdi/inferdi'

// Always invoked on a container whose T is exactly { config: { env: string } }.
const fixtureMailer: Module<{ config: { env: string } }, { mailer: Mailer }> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

const fixture = new Container()
  .registerValue('config', { env: 'test' })
  .use(fixtureMailer)
```

> **Why no portable generic modules?** A function like `<T>(c: Container<T>) => c.registerClass('db', ...)` cannot type-check inside the body — `keyof T` collapses to `string` from the `DependenciesMap` upper bound and `Exclude<'db', string>` becomes `never`, blocking the call. This is the cost of the compile-time uniqueness guarantee on registration. Use inline lambdas for one-shot grouping; use `Module<TIn, TOut>` when input shape is known.

## Typing a Built Container — `Container.Resolve<C>`

Once you build your container fluently, the resulting type captures every registered key. You usually want to factor this into a builder function and reuse the inferred map elsewhere (DTOs, factories, tests). Use `Container.Resolve<typeof builder>` to extract it:

```ts
import { Container } from '@inferdi/inferdi'

function buildContainer(config: AppConfig) {
  return new Container()
    .registerValue('config', config)
    .registerClass('logger', Logger, [])
    .registerClass('db', Db, ['config'])
    .registerClass('userRepo', UserRepo, ['logger', 'db'])
}

// Extract the full DI map type from the builder's return:
type AppContainer = ReturnType<typeof buildContainer>
type AppDeps      = Container.Resolve<AppContainer>
//   ^? { config: AppConfig; logger: Logger; db: Db; userRepo: UserRepo }

// Now you can type code that consumes the container without re-listing keys:
function buildHandler(c: AppContainer) {
  return async (req: Request) => c.get('userRepo').find(req.userId)
}
```

This pattern keeps registration (the builder) and consumption (handlers, tests) in separate places without duplicating type information.

## Cradle (Proxy Access)

`container.cradle` provides a soft-mode proxy for ergonomic destructuring.
Unlike basic proxies, `InferDI`'s cradle safely ignores symbol probes and Promise `then` checks, meaning `Promise.resolve(cradle)` won't crash your app with "Key 'then' not found".

```ts
// Safely destructure your entire graph, fully typed!
const { db, logger, mailer } = container.cradle
```

> ⚠️ **Type warning — the cradle is optimistically typed.**
> The return type is `T` (the registered map) for ergonomic destructuring, but the
> Proxy is permissive at runtime: a typo like `cradle.userRpo` (instead of
> `cradle.userRepo`) will silently return `undefined` with **no compile-time error**,
> because the Proxy's `get` trap is not reflected in the declared type.
> If you need a hard failure on missing keys, use `container.get(key)` — it throws
> synchronously and is fully typed (`K extends keyof T`).

> ⚡ **Performance note.** While `cradle` is highly ergonomic, property access through a JavaScript `Proxy` is slower than a direct method call or a plain object read. For performance-critical hot paths (e.g. per-row processing of a large database result, or tight rendering loops), prefer resolving once via `container.get('key')` at the top of the function, or destructure the cradle **outside** the hot loop and reuse the bindings.

## Errors

The container throws structured errors with actionable messages — surface these in your test assertions so registration mistakes show up early:

| Trigger | Message |
|---|---|
| `.get(k)` on unregistered key | `Key "k" not found` |
| Singleton depends on scoped/transient | `Singleton "x" cannot depend on scoped "y". Use Lazy<T> ...` |
| Resolution loop | `Circular dependency detected: a -> b -> a. Consider breaking the cycle with Lazy<T> ...` |
| Use of disposed container | `Container is disposed (key: "k")` / `Container is disposed (cradle access)` |
| `createScope()` after dispose | `Cannot create scope from a disposed container` |
| Sync `[Symbol.dispose]` over an async resource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. Use \`await using\` / container.dispose() for async teardown.` |

## API Summary

```ts
import { Container, type Lazy, type Module, type DependenciesMap } from '@inferdi/inferdi'

class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(parent?: Container<T>)

  // Registration — each call returns a Container with T widened by Record<K, V>.
  registerClass<K extends string, V, A extends readonly unknown[], L extends boolean = false>(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<T, A>,
    kind?: 'singleton' | 'transient' | 'scoped',  // default: 'singleton'
    lazy?: L,                                      // default: false; true also registers `${K}Lazy`
  ): Container<T & Record<K, V> & (L extends true ? Record<`${K}Lazy`, Lazy<V>> : {})>

  registerFactory<K extends string, V>(
    key: Exclude<K, keyof T>,
    factory: (c: Container<T>) => V,
    kind?: 'singleton' | 'transient' | 'scoped',  // default: 'singleton'
  ): Container<T & Record<K, V>>

  registerValue<K extends string, V>(
    key: Exclude<K, keyof T>,
    value: V,
  ): Container<T & Record<K, V>>

  use<R extends DependenciesMap>(fn: Module<T, R>): Container<T & R>

  // Scopes & resolution
  createScope(): Container<T>
  get<K extends keyof T>(key: K): T[K]
  get cradle(): T            // optimistically typed Proxy — see Cradle section

  // Lifecycle
  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}

namespace Container {
  // Extract the registered map from a built container:
  //   type Deps = Container.Resolve<typeof builtContainer>
  type Resolve<C> = C extends Container<infer U> ? U : never
}

// Public types
type Lazy<T> = { readonly get: () => T }
type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
type DependenciesMap = Record<string, unknown>
```

## License

MIT — see [LICENSE](./LICENSE).