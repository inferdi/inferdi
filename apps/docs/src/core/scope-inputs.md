---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/scope-inputs#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Core Concepts"
          "item": "https://inferdi.com/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Scope Inputs and Profiles"
          "item": "https://inferdi.com/core/scope-inputs"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/scope-inputs#article"
      "headline": "Scope Inputs and Profiles in InferDI"
      "name": "Scope Inputs and Profiles"
      "description": "Declare request-local inputs, build typed scope profiles, and let InferDI prevent resolution until each service has the values it needs."
      "url": "https://inferdi.com/core/scope-inputs"
      "mainEntityOfPage": "https://inferdi.com/core/scope-inputs"
      "inLanguage": "en-US"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, scope inputs, scope profiles, declareScopeInputs, createScope, ReadyKeys, TypeScript dependency injection"
      "articleSection": "Core Concepts"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

# Scope Inputs and Profiles

Scope inputs are values supplied by the code that opens a scope: an HTTP request, authenticated user, tenant, job payload, or trace context. InferDI carries those requirements through the graph and prevents you from resolving a service before its inputs exist.

## Declare the Inputs

`declareScopeInputs()` adds keys to the type-level graph. It does not create runtime registrations or values.

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

Scope inputs have scoped lifetime. A singleton cannot depend on one, so the compiler rejects an omitted or explicit `singleton` kind for both services above.

## Open Typed Profiles

`createScope(inputs)` accepts any subset of missing inputs. Each returned container records which requirements are ready.

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth has not been provided
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

Use functions to name the profiles used by your application. Their return types preserve the exact ready-key set without handwritten container annotations.

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

Open the profile at the request, message, or job boundary. Keep the root graph independent from framework objects.

## Requirements Follow the Graph

InferDI propagates input requirements through classes, lazy companions, deps-aware sync factories, and declarative async factories.

```ts
const app = root
  .registerFactory(
    'requestId',
    ['request'],
    (c) => c.get('request').requestId,
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

The dependency tuple in the deps-aware `registerFactory` overload declares type-level edges and limits the callback to a resolver for those keys. InferDI still calls the callback with that resolver. `registerAsyncFactory` has a different contract: it resolves the tuple and passes positional values to the callback.

The distinction also changes argument order:

```ts
registerFactory(key, deps, factory, kind)
registerAsyncFactory(key, factory, deps, kind)
```

## Nested Scope Ownership

A child inherits input values and creates its own scoped instances. Input values remain application-owned and are not disposed by the container.

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript disposes these declarations in reverse order, so the refined child closes before its parent. `root.dispose()` does not close either scope.

## Reusable Type Contracts

`ScopeInputMap` describes inputs in a named `Module`. `WithRequirements` attaches input requirements to a module output.

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

Generic helpers must also preserve readiness:

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## Input Contract

- Declarations require finite, required string or symbol keys. Optional keys, numeric keys, `__proto__`, broad index signatures, and unions with different key sets are rejected.
- A required property with value `undefined` counts as provided. InferDI tracks property presence, not truthiness.
- `createScope(inputs)` takes a shallow snapshot of enumerable own string and symbol properties. Getters and Proxy traps run during that copy, so pass a passive data record.
- The input schema exists only in TypeScript. JavaScript, `any`, or a cast can add unknown keys or shadow a registration in the child cache.
- Fast Mode supports input refinement but keeps its immutable-graph rule: finish registration before the first `.get()` or `.createScope()`.

See [Scopes and Teardown](./scopes) for ownership rules and [Async Dependency Graph](./async-dependency-graph) for async services that depend on scope inputs.
