# InferDI

![npm version](https://img.shields.io/npm/v/@inferdi/inferdi.svg)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/%40inferdi%2Finferdi)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
[![codecov](https://codecov.io/gh/inferdi/inferdi/graph/badge.svg?token=IHAXLIFHF3)](https://codecov.io/gh/inferdi/inferdi)
![License](https://img.shields.io/npm/l/@inferdi/inferdi.svg)

A zero-dependency, **decorator-free**, strongly typed DI container for modern TypeScript.

Build your dependency graph using a fluent API that infers types automatically, prevents memory leaks with strict lifetime guards, and handles teardown natively via the Explicit Resource Management API (`using` / `await using`).

## Why InferDI?

Legacy DI is slow, bloated with decorators, and prone to memory leaks. **InferDI is built for 2026:** it’s ruthlessly fast, strictly typed, and built for the modern edge.

- ☁️ **Zero-Weight Edge Native**  
  Just 2KB gzipped. Zero dependencies. The perfect fit for all serverless platforms, including Cloudflare Workers, Vercel Edge, Deno Deploy, and Supabase. While other frameworks trigger cold starts, InferDI is already running.

- ⚡ **Raw Engine Speed**  
  Built to outperform the competition. Highly optimized for V8 and JSC inline caching. It doesn't just resolve dependencies — it executes at native engine speed.

- 🛡️ **Zero Magic. 100% Type-Safe**  
  No `@Inject()`. No `reflect-metadata`. The compiler strictly enforces your constructor signatures. Wrong argument order or type? It simply won't compile.

- 🛑 **Impossible Memory Leaks**  
  Silent cross-user data leaks are a thing of the past. InferDI physically blocks you from injecting short-lived scoped resources into global singletons. Architectural flaws crash instantly in development, guaranteeing zero leaks in production.

- ♻️ **Native `using` Teardown**  
  Full support for modern resource management. Scopes destroy instances in strict **LIFO order**, safely catching multiple disconnect failures in a single clean `AggregateError`.

- 🔣 **String *or* Symbol keys**  
  Register services under either a plain string or a `symbol`. Use `Symbol.for('shared')` for cross-module identity without imports, `unique symbol` constants for type-level branding, or local `Symbol()` for collision-free private DI.

## Performance

InferDI is built for raw engine speed. Static type checking instead of runtime reflection, no `Proxy` traps on resolve, and arity-unrolled constructor calls (0–4 args take a direct `new Ctor(...)` path) translate into measurable wins across every common DI workload.

The repository ships a comprehensive benchmark suite in [`benchmarks/`](./benchmarks) comparing InferDI against the five widely used TypeScript DI containers — **InversifyJS v8, Awilix v13 (both PROXY and CLASSIC modes), TSyringe v4, TypeDI v0.10, and Typed Inject v5**. All numbers below are operations per second on Node 22 — higher is better. Reproduce locally with `cd benchmarks && npm install && npm run bench`.

![benchmarks](assets/benchmarking_results.png)

| Scenario                                              | InferDI    | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | InversifyJS | TSyringe | TypeDI |
|-------------------------------------------------------|------------|--------------|----------------|------------------|-------------|----------|--------|
| **1. Hot singleton resolve** (warm cache)             | **14.2 M** | 7.0 M        | 7.2 M          | 6.9 M            | 6.3 M       | 6.2 M    | 6.4 M  |
| **2. Transient resolve** (new instance per call)      | **8.4 M**  | 4.3 M        | 3.4 M          | 2.9 M            | 3.4 M       | 2.4 M    | 1.6 M  |
| **3. Deep graph** (10 levels, all transient)          | **1.85 M** | 1.28 M       | 701 k          | 739 k            | 750 k       | 601 k    | 214 k  |
| **4a. Wide graph** (4 deps, root transient)           | **7.3 M**  | 3.2 M        | 2.2 M          | 2.3 M            | 2.3 M       | 1.6 M    | 1.1 M  |
| **4b. Wide graph** (10 deps, root transient)          | **3.5 M**  | 2.6 M        | 1.2 M          | 1.3 M            | 1.6 M       | 1.0 M    | 437 k  |
| **5. Container build + first resolve**                | **400 k**  | 228 k        | 10 k           | 8 k              | 13 k        | 202 k    | 272 k  |
| **6. Scoped lifecycle** (create + resolve + cleanup)  | **2.66 M** | 2.39 M       | 492 k          | 413 k            | 28 k        | 1.08 M   | 637 k  |
| **7. Lazy resolve** (deferred wrapper)                | **12.1 M** | 7.0 M        | 5.5 M          | 4.7 M            | 4.2 M       | 4.0 M    | 2.8 M  |

### Highlights

- **~2× faster on the hot path** than every competitor. A cached singleton resolve in InferDI effectively reduces to a hot `Map.get()` fast path — no Proxy, no metadata lookup, no parent-chain walk for warm services.
- **30× faster than InversifyJS and 48× faster than Awilix** at building a fresh container with a 30+ key graph and resolving its first service. Registration is a flat `Map.set` per service — no fluent-builder chains, no AST parsing of constructor signatures, no decorator side-effects to apply.
- **Wide-graph leadership confirms the arity-unrolling fast path:** for 4 dependencies V8 inlines the direct `new Ctor(a, b, c, d)` call instead of going through `Reflect.construct`. Even at 10 dependencies — where InferDI falls back to `Reflect.construct` — it stays **1.35× ahead** of the next-fastest non-reflection-based competitor (Typed Inject) and up to **3.5× ahead** of reflection-based containers.
- **Clean sweep across all eight scenarios.** InferDI now leads every workload, including the previously close ones: the deep-graph 10-level chain (**1.44× over Typed Inject**) and the scope lifecycle (Scenario 6, **1.11× over Typed Inject**) — while including a synchronous `Symbol.dispose` on every iteration of the latter and beating InversifyJS by **94×**.
- **Typed Inject is the strongest non-InferDI baseline.** Its compile-time-known graph and `static inject = [...] as const` design let it close the gap on deep graphs and scoped flows where reflection-based containers fall apart. InferDI still pulls ahead in every scenario, but the proximity is real and worth crediting.
- **Scenario 5 caveat:** decorator-based libraries (TypeDI, TSyringe) register classes at *import time* via decorator side-effects, so their registration cost is paid during module evaluation — what's measured for them at "build time" is only child-context creation. InferDI still beats them while registering an entire graph from scratch in under 3 μs.

Full methodology, fairness notes, fixture sources, and per-scenario reasoning: see [`benchmarks/README.md`](./benchmarks/README.md).

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Factories](#factories)
- [Binding Interfaces](#binding-interfaces)
- [Compiler-enforced Signatures](#compiler-enforced-signatures)
- [Scopes & Native Teardown](#scopes--native-teardown)
- [Strict Lifetime Guards](#strict-lifetime-guards)
- [Lazy Injection](#lazy-injection)
- [Symbol Keys](#symbol-keys)
- [Modularity with `.use()`](#modularity-with-use)
- [Test Overrides](#test-overrides)
- [Typing a Built Container — `Container.Resolve<C>`](#typing-a-built-container--containerresolvec)
- [Errors](#errors)
- [Migration](#migration)
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

`.get(key)` is the only way to resolve a registration: it is fully typed (`K extends keyof T`), throws synchronously on a missing key, and stays out of the way at runtime — there is no Proxy overhead.

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

Factories follow the same lifetime rules as classes — pass the kind as the third argument: `registerFactory('cache', factory, 'scoped')`. Inside a **singleton** factory the container parameter is narrowed via `AllowedDeps<T, 'singleton'>`, so `c.get(...)` will only autocomplete (and accept) singleton keys and `Lazy<*>` companions. A `scoped`/`transient` key inside a singleton factory body is a TypeScript error, not a runtime exception.

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
  .registerClass('logger', Logger, [])

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

### Async Factories

Factories can be async without any special API. The factory's `Promise` is cached verbatim, so every concurrent `c.get(key)` sees the same in-flight Promise — initialization runs exactly once even under request bursts (Edge functions, serverless cold starts). Callers `await` the value at the use site. On `await container.dispose()` the container unwraps the Promise and probes the resolved instance for the disposer protocol; rejections fold into the same `AggregateError` as any other teardown error. Sync `using` on a container that cached a Promise is a misuse — use `await using` / `await container.dispose()`.

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

// Concurrent callers share the same in-flight Promise — no race, one connect.
const [a, b] = await Promise.all([c.get('db'), c.get('db')])

await c.dispose() // unwraps the cached Promise and closes the pool
```

## Strict Lifetime Guards

| Kind        | Created                                         | Cached on                | Disposed by container |
| ----------- | ----------------------------------------------- | ------------------------ | --------------------- |
| `singleton` | once per container that owns the registration | the owner container      | yes |
| `scoped`    | once per scope                                  | the scope                | yes |
| `transient` | every time requested                            | never                    | no (caller owns it)   |

**The Lifetime Rule:** A singleton cannot directly depend on a scoped or transient service. That would freeze a short-lived value inside a long-lived cache. `InferDI` enforces this **at compile time**:

```ts
new Container()
  .registerClass('requestCtx', RequestCtx, [], 'scoped')
  // ❌ TS error: '"requestCtx"' is not assignable to type 'never'.
  //    AllowedDeps<T, 'singleton'> filters scoped/transient keys out of
  //    the deps tuple visible to a singleton target.
  .registerClass('userService', UserService, ['requestCtx'], 'singleton')
```

Inside a singleton **factory**, the container parameter is structurally narrowed
so only legal keys autocomplete:

```ts
new Container()
  .registerClass('requestCtx', RequestCtx, [], 'scoped')
  .registerFactory('userService', (c) => {
    // ❌ TS error: 'requestCtx' is not a key of the narrowed container.
    const ctx = c.get('requestCtx')
    return new UserService(ctx)
  }, 'singleton')
```

The same check fires at runtime as defense-in-depth — if you bypass the type
system with an `as`-cast, you still get a clear diagnostic:

```
Error: Singleton "userService" cannot depend on scoped "requestCtx".
Use Lazy<T> (register with a lazyKey companion) to get a fresh instance per access.
```

### Fast Mode: `new Container({ strict: false })`

If you fully trust the compile-time guard and want maximum throughput on the
hot path, opt out of the runtime cycle / lifetime checks:

```ts
const root = new Container({ strict: false })
  .registerClass('logger', Logger, [])
```

In `strict: false` mode `get()` drops the cycle bookkeeping (`resolving`
push/pop + `Array#includes`), the singleton-stack push/pop, and the
surrounding `try`/`finally` from the resolve path. Local transient resolves
collapse to a bare `fn(this)` call — measured ~30% faster on a flat
transient graph; cached singleton/scoped resolves are unaffected because
the cache fast-path runs upstream of any guard. The flag is inherited by
every child created via `createScope()`.

**`strict: true` is a floor under two independent problem classes — not
just "type-substitution defense".** The compile-time guard covers a strict
subset of what the runtime guard catches:

| Problem | Compile-time | Runtime (`strict: true`) |
|---|---|---|
| Singleton depends on scoped/transient directly via `deps` or the narrowed `c` parameter | ✓ | ✓ |
| Singleton depends on scoped/transient via a **captured outer container reference** inside a factory body | ✗ | ✓ |
| Singleton ↔ Singleton cycle | ✗ | ✓ |
| Transient ↔ Transient cycle | ✗ | ✓ |
| Lifetime violation introduced via an `as`-cast (`as never`, `as any`, `as Container<...>`) | ✗ | ✓ |
| Dynamic key construction (`c.get(computedKey as keyof T)`) | ✗ | ✓ |

In particular, **the type system cannot see cycles**. A `Singleton →
Singleton` cycle compiles cleanly (both ends pass the `AllowedDeps`
filter); only `strict: true` reports it as `Circular dependency detected:
a -> b -> a`, while `strict: false` lets V8 recurse until
`RangeError: Maximum call stack size exceeded`. The same applies to
`Transient ↔ Transient` cycles, which `AllowedDeps` never filters at all.

The narrowing of `c` inside a factory is also **per-parameter, not
per-scope**. If you capture an outer container reference in the closure,
that reference still has its wider type:

```ts
const root = new Container().registerClass('req', ReqCtx, [], 'scoped')
root.registerFactory('logger', () => {
  // `root` here is the wide Container<T>, NOT the narrowed AllowedDeps view.
  // TypeScript happily compiles this:
  return new Logger(root.get('req'))   // 💀 leaks scoped into singleton
}, 'singleton')
```

`strict: true` catches this at runtime; `strict: false` does not.

**Use `strict: false` only when you're certain that:**

- Your graph has no cycles (including `transient ↔ transient`).
- Every factory reads dependencies **only** through its own `c` parameter —
  no captured outer container references.
- All registrations go through the fluent API without `as`-casts to bypass
  `AllowedDeps`.
- Any `Module<TIn, TOut>` declarations honestly describe their input shape.

**Recommended workflow.** Develop and test in `strict: true` (the default).
Your runtime tests transitively prove the graph is cycle-free and that no
factory leaks short-lived state through a captured closure. Only after that
audit, switch to `strict: false` for production builds where the ~30%
transient-path speed-up matters.

## Lazy Injection

When a singleton legitimately needs a fresh per-access view of a short-lived service, pass a `lazyKey` to its registration. The container then registers a companion `Lazy<T>` under that explicit key — the wrapper key is yours to pick (string or symbol):

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock { now() { return Date.now() } }

class Audit {
  constructor(private readonly clockLazy: Lazy<Clock>) {}
  record(event: string) { console.log(event, this.clockLazy.get().now()) }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'transient', 'clockLazy')
  // ^ registers BOTH 'clock' (transient) AND 'clockLazy' (Lazy<Clock>).
  //   The companion key is passed explicitly — TS infers Lazy<Clock>.
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')

c.get('audit').record('login')   // a fresh Clock instance per .record()
```

> ⚠️ **Pitfall — `Lazy<scoped>` injected into a singleton.**
> The lazy wrapper captures the container in which it was *resolved*, not in which it is later *called*. A singleton resolves on its owning container (usually root), so its captured `c` is root. The first `lazyWrapper.get()` then resolves the scoped target on root and caches it there — effectively turning it into a singleton. `Lazy<T>` legalizes the injection per the lifetime check, but it does **not** make a scoped target truly per-scope when used from a long-lived consumer. For request-scoped values inside long-lived services, use `AsyncLocalStorage` instead. (Transient is unaffected: it is never cached, every `.get()` creates a new instance.)

> **Note on circular dependencies.** True mutual recursion (A's constructor needs B, B's constructor needs A) cannot be expressed in fluent registration — both sides would forward-reference each other's keys, which the type system rejects by design. The container's runtime cycle detector exists to catch accidental cycles introduced via factories, not to "break" them automatically. If you have a real A↔B cycle, restructure: extract a shared dependency, switch to event-based communication, or split one of the classes.

## Symbol Keys

Every `register*` method also accepts a `symbol` for the key. String and symbol keys mix freely in the same container — `deps` arrays, the `lazyKey` companion, factory bodies and `Module<TIn, TOut>` all accept both interchangeably. Using symbols unlocks three patterns that string keys cannot express:

- **Collision-free private DI.** A local `Symbol(desc)` exists only inside the module that created it. Registering under it makes the service unreachable from outside without explicitly exporting the token.
- **Cross-module sharing via `Symbol.for(name)`.** Two parts of the codebase agree on a name; `Symbol.for` returns the same token everywhere, so they share identity without importing each other.
- **Type-level branding.** A symbol token is nominally typed: two structurally identical services keyed by distinct symbols are no longer interchangeable in `DepsOf`. (For maximum nominal precision, annotate as `unique symbol` — but ordinary `const` declarations are enough for runtime identity and most type checking.)

```ts
import { Container } from '@inferdi/inferdi'

const DB    = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  // String key for plain config, symbol keys for the privately-shared services.
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB,    PgPool,    ['config'])
  .registerClass(CACHE, RedisPool, [])
  // `deps` mixes string and symbol keys in a single tuple — both are typed.
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)     // typed as PgPool
c.get(CACHE)  // typed as RedisPool
c.get('repo') // typed as UserRepo
```

Lazy companions follow the same rule — pass any string or symbol as `lazyKey` to expose the `Lazy<V>` wrapper. The companion key kind does not have to match the primary key kind:

```ts
const DB       = Symbol('db')
const DB_LAZY  = Symbol('dbLazy')

const c = new Container()
  // Symbol primary, symbol companion.
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)
  // String primary, string companion.
  .registerClass('clock', Clock, [], 'transient', 'clockLazy')
  // String primary, symbol companion (or vice versa) — also accepted.
  .registerClass('cache', RedisPool, [], 'singleton', Symbol('cacheLazy'))

c.get(DB_LAZY).get()      // typed as Lazy<PgPool>
c.get('clockLazy').get()  // typed as Lazy<Clock>
```

> **⚡ Performance tip — prefer symbol keys for the absolute limit.**

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

For named, **fixed-shape** module builders (e.g., test fixtures that always start from a specific base), use the exported `Module<TIn, TOut>` type — `TIn` must match the container's T exactly at the `.use()` call site. Because v3 carries lifetime kind alongside each entry, wrap flat `{ key: ServiceType }` shapes in `SpecMap<...>` (defaults every entry to singleton) or write `Spec<V, 'scoped' | 'transient'>` for mixed-kind modules:

```ts
import { Container, type Module, type Spec, type SpecMap } from '@inferdi/inferdi'

// Always invoked on a container whose T is exactly { config: { env: string } } (singleton).
const fixtureMailer: Module<SpecMap<{ config: { env: string } }>, SpecMap<{ mailer: Mailer }>> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

// Mixed-kind: TIn requires a scoped `req` and a singleton `cfg`.
type ReqHandlerIn = SpecMap<{ cfg: Config }> & { req: Spec<ReqCtx, 'scoped'> }
const reqHandler: Module<ReqHandlerIn, SpecMap<{ handler: Handler }>> = (c) =>
  c.registerClass('handler', Handler, ['cfg', 'req'])

const fixture = new Container()
  .registerValue('config', { env: 'test' })
  .use(fixtureMailer)
```

> **Why no portable generic modules?** A function like `<T>(c: Container<T>) => c.registerClass('db', ...)` cannot type-check inside the body — `keyof T` collapses to `string` from the `DependenciesMap` upper bound and `Exclude<'db', string>` becomes `never`, blocking the call. This is the cost of the compile-time uniqueness guarantee on registration. Use inline lambdas for one-shot grouping; use `Module<TIn, TOut>` when input shape is known.

## Test Overrides

In tests you almost always need to swap a real dependency for a mock. The `Exclude<K, keyof T>` guard on every `register*` method intentionally prevents re-registering a key in production — but in tests it gets in the way. Use `.override(key, value)`:

```ts
import { Container } from '@inferdi/inferdi'

function buildAppContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('userRepo', UserRepo, ['logger', 'db'])
}

// Test setup
const c = buildAppContainer()
  .override('logger', new MockLogger())   // ✅ TS verifies MockLogger is assignable to ConsoleLogger
  .override('db', mockDb)                 // same
// .override('missing', x)                ❌ TS error — key not registered
// .override('logger', 42)                ❌ TS error — number is not assignable to ConsoleLogger

c.get('userRepo').save(/* ... */)         // uses the mocks
```

**Strict guarantees:**

- 🛡️ **Type-safe.** `value` must satisfy the originally registered type (`T[K]`). Mocks have to structurally implement the production interface — no `as any` escape hatch.
- ⛔ **Fail-fast on late overrides.** `.override()` throws if the key has already been resolved on this container. A late override would leave existing consumers holding the original reference while new resolves see the mock — a split dependency graph. Always override **before** the first `.get()`.
- 💥 **Disposed-container guard.** Throws on a disposed container.
- 🧹 **Externally owned.** Like `registerValue`, the override value is **not** added to the container's disposal queue. The test suite owns the mock's lifetime.
- 🔒 **Scope-local.** `.override()` mutates only the container it was called on. `root.createScope().override('db', mock)` leaves `root` untouched and is invisible to sibling scopes; a parent-level override propagates via the standard parent walk-up.

> ⚠️ **Production code should not call `.override()`.** It exists for tests and hot-reload-style fixtures. Use `.use()` for conditional registration in production builders.

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

## Errors

The container throws structured errors with actionable messages — surface these in your test assertions so registration mistakes show up early:

| Trigger | Message |
|---|---|
| `.get(k)` on unregistered key | `Key "k" not found` |
| Singleton depends on scoped/transient | `Singleton "x" cannot depend on scoped "y". Use Lazy<T> ...` |
| Resolution loop | `Circular dependency detected: a -> b -> a. Consider breaking the cycle with Lazy<T> ...` |
| Use of disposed container | `Container is disposed (key: "k")` |
| Resolving across a disposed ancestor | `Ancestor container is disposed (key: "k")` |
| `createScope()` after dispose | `Cannot create scope from a disposed container` |
| Sync `[Symbol.dispose]` over an async resource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. Use \`await using\` / container.dispose() for async teardown.` |
| `.override()` after first resolve | `Cannot override "k" because it has already been resolved. Overrides must be applied before any .get() calls...` |
| `.override()` on a disposed container | `Cannot override on a disposed container (key: "k")` |

## Migration

Upgrading from a previous major version? See **[MIGRATION.md](./MIGRATION.md)** for the full per-version checklist (breaking changes, one-line rewrites, and what's new).

## API Summary

```ts
import {
  Container,
  type Lazy,
  type Module,
  type DependenciesMap,
  type RegistrationKind,
  type Spec,
  type SpecMap,
  type ContainerOptions,
} from '@inferdi/inferdi'

class Container<T extends DependenciesMap = Record<never, never>> {
  // Public — use this to construct a root container.
  constructor(options?: ContainerOptions)
  // Internal overload used by createScope() to wire the parent chain.
  constructor(parent: Container<T>)

  // Registration — each call returns a Container widened by Record<K, Spec<V, Kind>>.
  // The `deps` tuple and the factory `c` are narrowed via `AllowedDeps<T, Kind>`:
  // for a singleton target, only singleton entries and Lazy<*> companions are visible.
  registerClass<
    K extends string | symbol,
    V,
    A extends readonly unknown[],
    Kind extends RegistrationKind = 'singleton',
    LK extends string | symbol = never,
  >(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<AllowedDeps<T, Kind>, A>,
    kind?: Kind,                                     // default: 'singleton'
    lazyKey?: Exclude<LK, keyof T | K>,              // optional companion key for `Lazy<V>`
  ): Container<
       T
       & Record<K, Spec<V, Kind>>
       & ([LK] extends [never] ? {} : Record<LK, Spec<Lazy<V>, 'transient'>>)
     >

  registerFactory<
    K extends string | symbol,
    V,
    Kind extends RegistrationKind = 'singleton',
  >(
    key: Exclude<K, keyof T>,
    factory: (c: Container<AllowedDeps<T, Kind>>) => V,
    kind?: Kind,                                     // default: 'singleton'
  ): Container<T & Record<K, Spec<V, Kind>>>

  registerValue<K extends string | symbol, V>(
    key: Exclude<K, keyof T>,
    value: V,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  // Test-only: replace an existing registration with a static value.
  // Walks the parent chain to read the original kind and preserves it locally,
  // so `root.createScope().override('db', mock)` keeps the scoped semantics.
  // Throws if the container is disposed, the key was already resolved, or
  // the key is not registered anywhere in the chain.
  override<K extends keyof T>(key: K, value: T[K]['type']): this

  use<R extends DependenciesMap>(fn: Module<T, R>): Container<T & R>

  // Scopes & resolution
  createScope(): Container<T>
  get<K extends keyof T>(key: K): T[K]['type']

  // Lifecycle
  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}

namespace Container {
  // Extract the registered map from a built container as a **flat**
  // `{ key: ServiceType }` view — the Spec wrapper is unwrapped, so consumers
  // see the same shape they always did pre-v3.
  type Resolve<C> = C extends Container<infer U>
    ? { [K in keyof U]: U[K]['type'] }
    : never

  // Same as Resolve, but unwraps Lazy<T> entries to T — useful for typing mocks.
  type ResolveUnwrapped<C> = {
    [K in keyof Resolve<C>]: Resolve<C>[K] extends Lazy<infer V> ? V : Resolve<C>[K]
  }

  // Look up a single key's unwrapped service type.
  // For a Lazy<T>-registered key returns T (no wrapper); useful when overriding
  // a Lazy<T> companion in tests:
  //   const mock: Container.UnwrappedValue<typeof c, 'clockLazy'> = { now: () => 0 }
  //   c.override('clockLazy', { get: () => mock })
  type UnwrappedValue<C, K extends keyof Resolve<C>> = ResolveUnwrapped<C>[K]
}

// Public types
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

// Construction options.
interface ContainerOptions {
  // Toggle runtime cycle / lifetime guard inside get(). Default true.
  // Inherited by child scopes spawned via createScope().
  readonly strict?: boolean
}

// Single registry entry — service type V plus its lifetime kind. `interface`
// (not type alias) so TS caches instantiations across long fluent chains.
interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

// Brand a flat `{ key: ServiceType }` map as a SpecMap (defaults to singleton).
type SpecMap<M, K extends RegistrationKind = 'singleton'> =
  { [P in keyof M]: Spec<M[P], K> }

type DependenciesMap = Record<string | symbol, Spec<unknown, RegistrationKind>>

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

## License

MIT — see [LICENSE](./LICENSE).