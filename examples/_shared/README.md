# Shared Container Builder

`container.ts` is the **flagship** InferDI example. It is the file to read if you want to see the patterns InferDI was designed for, before getting distracted by framework wiring.

Every adapter in `examples/` imports its registrations from here, so the per-framework files contain only the wiring that is actually framework-specific. Copy `container.ts` (or its idea) into your own project and adapt the framework adapter from this directory.

## What it demonstrates

- **`registerValue('config', readConfig())`** — static config loaded once at boot.
- **`registerFactory('db', async (c) => …)`** — an async factory whose `Promise` is cached, awaited on every consumer, and unwrapped on dispose so `Symbol.asyncDispose` runs on the resolved pool.
- **LIFO `Symbol.asyncDispose`** — `Database` implements it, so `await scope.dispose()` waits for the pool to close in reverse-creation order.
- **`Lazy<Clock>` companion key** — a singleton target resolved only when `AuditService` first needs it. Lazy injection preserves the target lifetime; it cannot make a scoped or transient dependency safe for a singleton.
- **`Module<TIn, TOut>` + `.use(coreModule)`** — a reusable registration unit with documented inputs and outputs.
- **`declareScopeInputs()` + `createScope({ request })`** — request data enters the graph at the lifecycle boundary. The returned scope type records that the input is ready.
- **`Container.Providers<typeof builder>`** (in `mocks.ts` example below) — a typed shape for mock-factory fixtures in tests.

## Why one shared file

The same `Database`/`Logger`/`AuditService`/`UserService` graph appears in every adapter, so duplicating it in 20+ files would obscure the actual point of each example. In your own application this lives in `src/container.ts` (or `src/di/`), and each framework adapter is a thin file that imports `buildRootContainer` + `createRequestScope`.

## Testing

[`testing.ts`](./testing.ts) shows the test-only APIs that production code should not touch:

- **`.override(key, value)`** — replace a key with a mock. Refuses to run after the key has been resolved, so "mock applied too late" fails loudly at the override call instead of in a confused downstream assertion.
- **`Container.Providers<typeof builder>`** — typed mock-factory fixture; the compiler enforces that every registered key has a thunk returning the correct shape.
- **`Container.Resolve<typeof builder>`** — flat `{ key: ServiceType }` view of the registered map, useful for typing test helpers and handler arguments.
