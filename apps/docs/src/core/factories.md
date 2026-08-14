# Factories

Use `registerClass` when construction is exactly `new Ctor(...deps)`. Use `registerFactory` when construction needs configuration, a third-party API, an interface binding, or other explicit logic.

```ts
const container = new Container()
  .registerValue('config', {
    dsn: 'postgres://localhost/app',
    poolSize: 10
  })
  .registerFactory('pool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepository, ['pool'])
```

The return type becomes the registered service type.

## Container-aware Factories

The basic callback receives a lifetime-filtered container. A singleton factory can resolve only singleton-safe dependencies; scoped and transient keys are rejected by TypeScript.

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

Use this form when the factory needs conditional or multi-step resolution. Keep all `.get()` calls synchronous. For an initialization boundary that should propagate through the graph, use `registerAsyncFactory` instead.

## Declared Factory Dependencies

The deps-aware overload makes factory requirements visible in the graph and limits the callback resolver to those keys:

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('logger', Logger, [])
  .registerFactory(
    'requestLog',
    (deps) => new RequestLog(
      deps.get('request'),
      deps.get('logger')
    ),
    ['request', 'logger'],
    'scoped'
  )
```

Declared dependencies carry scope-input readiness and lifetime requirements through modules and other registrations. Unlike `registerAsyncFactory`, this callback receives a resolver, not positional values.

## Factory Lifetimes

Factories use the same lifetimes as classes:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

Singleton and scoped results are cached and owned by their container. Transient results are not cached or disposed by InferDI.

Pass a fourth `lazyKey` to create a lifetime-preserving companion:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

A companion requires an explicit lifetime, including `'singleton'`. See [Lazy Injection](./lazy-injection) for lifetime and disposal rules.

## Bind Interfaces

Interfaces have no runtime constructor. Give the factory an explicit service type when consumers should depend on an abstraction:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>(
    'mailer',
    () => new SendGridMailer()
  )
```

Consumers of `mailer` now see `Mailer`, not `SendGridMailer`.

## Choose the Promise Contract

A Promise returned by `registerFactory` is the service value itself: `.get()` returns `Promise<T>` and dependent factories receive that same Promise. Use this only when the Promise belongs in the synchronous graph.

Use `registerAsyncFactory` when `T` is the service and the Promise is its initialization boundary. That form propagates async status and resolves through `.getAsync()`. [Async Dependencies](./async-dependencies) documents both contracts, caching, lazy companions, failure behavior, and teardown.
