# Lifetime Guards

InferDI has three lifetimes:

| Kind | Created | Cached on | Disposed by container |
| --- | --- | --- | --- |
| `singleton` | once per owning container | owner container | yes |
| `scoped` | once per scope | scope | yes |
| `transient` | every resolve | never | no |

## The Lifetime Rule

A singleton cannot directly depend on a `scoped` or `transient` service. A singleton is created once and shared across every request, so if it captures a scoped value — the current request's context, user, or transaction — that one request's state silently bleeds into all the others. InferDI makes that edge unrepresentable in the type system instead of leaving it to code review.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

That registration is rejected by TypeScript. In strict mode, the same shape is rejected at runtime if a cast bypasses the type system.

## Strict Mode

`strict: true` is the default. It catches:

- singleton-to-scoped or singleton-to-transient violations introduced by casts
- captured outer-container factory leaks
- synchronous singleton cycles
- synchronous transient cycles
- dynamic-key misuse that bypasses static checking

```ts
const root = new Container({ strict: true })
```

## Fast Mode

Use `strict: false` only after tests prove the graph shape:

```ts
const root = new Container({ strict: false })
```

Fast mode removes runtime cycle and lifetime bookkeeping from the resolve path. It does not change the type-level contract, but it also cannot defend against dishonest casts, captured outer containers, or cycles.

Recommended workflow: develop and test in strict mode, then switch only performance-sensitive production graphs after an audit.
