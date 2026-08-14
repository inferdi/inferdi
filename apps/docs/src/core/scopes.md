# Scopes and Disposal

A scope bounds the lifetime of request-local services to a single unit of work. A child scope inherits every parent registration, but caches its own scoped instances and owns their teardown — so the scope created for one request never shares state with, or outlives, another.

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` is a root singleton. The request is an application-owned scope input, while `handler` is created and owned by the request scope.

`scoped` registrations belong to child scopes. With `fast: false` (the default), resolving one from the root throws `Scoped "key" cannot be resolved from the root container. Use createScope().` Call `createScope()`, then resolve the key from its result. `fast: true` skips this runtime guard.

## Scope Inputs

Scope inputs represent external values that exist only when you open a scope, such as a request, authentication context, tenant, or job payload. Declare them once and provide any required subset through `createScope(inputs)`:

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

The container type tracks which inputs have been provided and hides dependent services until they are ready. See [Scope Inputs](./scope-inputs) for named profiles, nested refinement, deps-aware factories, reusable types, and input validation rules.

## Ownership

Each container disposes only instances it created.

| Instance | Owner |
| --- | --- |
| Root singleton | Root container |
| Scoped service | Request scope |
| Singleton first resolved on a child | That child container |
| Transient | Caller |

`root.dispose()` does not cascade into already-created child scopes. Dispose scopes at their own lifecycle boundary.

## Native Resource Management

Container implements both disposal symbols:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Use `await using` or `await container.dispose()` when any owned resource may be async.

## Disposal Protocol

Owned instances are disposed in reverse creation order. The container probes:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

If multiple disposers fail, InferDI collects them in an `AggregateError` so one bad cleanup does not prevent later resources from closing.
