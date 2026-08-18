# Shared Container Builder

`container.ts` is the canonical InferDI example. Start there to see the container graph before reading framework wiring.

Most server examples import their registrations from here, so framework files contain lifecycle wiring. Edge examples with native bindings keep local graphs. Copy the structure into your application and adapt the matching framework example.

## What it demonstrates

- **`registerValue('config', readConfig())`** — static config loaded once at boot.
- **`registerAsyncFactory('db', factory, ['config'])`** registers the final `Database` type as an async graph node. Singleton and scoped async registrations cache one initialization promise, and consumers resolve propagated async nodes through `getAsync()`.
- **LIFO `Symbol.asyncDispose`** — `Database` implements it, so `await root.dispose()` waits for the root-owned pool to close in reverse-creation order.
- **`Lazy<Clock>` companion key** — a singleton target resolved only when `AuditService` first needs it. Lazy injection preserves the target lifetime; it cannot make a scoped or transient dependency safe for a singleton.
- **`Module<TRequirements, TProvides>` + `.use(coreModule)`** — a reusable registration unit with checked requirements and provided registrations.
- **`declareScopeInputs()` + `createScope({ request })`** — request data enters the graph at the lifecycle boundary. The returned scope type records that the input is ready.
- **`Container.Providers<typeof builder>`** (in `testing.ts`) — a typed shape for mock-factory fixtures. Declared scope inputs are supplied by `createScope()` and do not appear in this map.

## Why one shared file

The same `Database`/`Logger`/`AuditService`/`UserService` graph appears in every adapter, so duplicating it in 20+ files would obscure the actual point of each example. In your own application this lives in `src/container.ts` (or `src/di/`), and each framework adapter is a thin file that imports `buildRootContainer` + `createRequestScope`.

## Testing

[`testing.ts`](./testing.ts) shows the test-only APIs that production code should not touch:

- **`.override(key, value)`** — replace a key with a mock. Refuses to run after the key has been resolved, so "mock applied too late" fails loudly at the override call instead of in a confused downstream assertion.
- **`Container.Providers<typeof builder>`** — typed mock-factory fixture; the compiler checks each registered provider while excluding declared scope inputs.
- **`Container.Resolve<typeof builder>`** — flat `{ key: ServiceType }` view of the registered map, useful for typing test helpers and handler arguments.
