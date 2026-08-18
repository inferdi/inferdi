# Lifetimes

InferDI has three lifetimes:

| Lifetime    | Created                   | Cached on       | Disposed by container |
|-------------|---------------------------|-----------------|-----------------------|
| `singleton` | once per owning container | owner container | yes                   |
| `scoped`    | once per child scope      | child scope     | yes                   |
| `transient` | every resolve             | never           | no                    |

With the default `{fast: false}`, resolving a `scoped` key from the root throws `Scoped "key" cannot be resolved from the root container. Use createScope().` Call `createScope()`, then resolve scoped services from its result.

## The Lifetime Rule

A singleton cannot directly depend on a `scoped` or `transient` service. A singleton is created once and shared across every request, so if it captures a scoped value — the current request's context, user, or transaction — that one request's state silently bleeds into all the others. InferDI makes that edge unrepresentable in the type system instead of leaving it to code review.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

TypeScript rejects that registration. With `fast: false`, runtime checks reject the same shape if a cast bypasses the type system.

Declared scope inputs count as scoped dependencies. Register a consumer that reads a request, auth context, tenant, or job payload as `scoped` or `transient`; the compiler rejects a singleton consumer before runtime. See [Scope Inputs](./scope-inputs).

## Default Runtime Checks

`fast` defaults to `false`. This contract keeps the graph mutable and catches:

- direct resolution of a scoped key from the root container
- singleton-to-scoped or singleton-to-transient violations introduced by casts
- captured outer-container factory leaks
- synchronous singleton cycles
- synchronous transient cycles
- dynamic-key misuse that bypasses static checking

```ts
const root = new Container()
const explicitRoot = new Container({ fast: false })
```

## `fast: true`

Use `fast: true` only after tests prove the graph shape:

```ts
const root = new Container({ fast: true })
```

The option keeps the type-level lifetime contract but removes the runtime cycle and lifetime bookkeeping. It also treats the activated container tree as fixed and skips the root-scoped guard.

Develop and test with `fast: false`. Use `fast: true` only for an audited, immutable production graph. [Performance](../guide/performance#fast-true) documents the exact runtime trade-offs and activation rules.
