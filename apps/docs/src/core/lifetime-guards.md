# Lifetimes

InferDI has three lifetimes:

| Lifetime    | Created                   | Cached on       | Disposed by container |
|-------------|---------------------------|-----------------|-----------------------|
| `singleton` | once per owning container | owner container | yes                   |
| `scoped`    | once per child scope      | child scope     | yes                   |
| `transient` | every resolve             | never           | no                    |

Resolve `scoped` keys from a child returned by `createScope()`. The default checked contract rejects attempts to resolve them from the root container.

## The Lifetime Rule

A singleton cannot directly depend on a `scoped` or `transient` service. A singleton is created once and shared across every request, so if it captures a scoped value — the current request's context, user, or transaction — that one request's state silently bleeds into all the others. InferDI makes that edge unrepresentable in the type system instead of leaving it to code review.

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

TypeScript rejects that registration in every runtime contract. The default checked contract also rejects the same shape at runtime if a cast bypasses the type system.

Declared scope inputs count as scoped dependencies. Register a consumer that reads a request, auth context, tenant, or job payload as `scoped` or `transient`; the compiler rejects a singleton consumer before runtime. See [Scope Inputs](./scope-inputs).

<!-- Preserve deep links from before the container-option sections moved -->
<h6 id="default-runtime-checks" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>
<h6 id="fast-true" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>

Runtime enforcement is controlled by the container contract. See
[Container Options](../reference/api#container-options) for the exact behavior of
the default and `fast` contracts.
