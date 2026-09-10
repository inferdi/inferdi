# Why InferDI

Manual constructor injection is a sound starting point. It keeps dependencies visible and lets TypeScript check one construction call at a time. InferDI becomes useful when the application graph grows beyond a few calls and you also need lifetime, scope, async-readiness, module, and disposal rules.

## Composition checked as one graph

Each registration returns a new container type. That type records the known keys, service types, lifetimes, async state, and missing scope inputs. A later registration cannot silently ask for an unknown key, pass an incompatible constructor argument, duplicate a key, or make a singleton capture shorter-lived state.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Database {
  find(id: string) {
    return { id }
  }
}

class UserService {
  constructor(readonly database: Database) {}
}

const app = new Container()
  .registerClass('database', Database, [])
  .registerClass('users', UserService, ['database'])

const users = app.get('users')
//    ^?
```

This accumulated state is why InferDI describes the graph as the type. Modules retain the same requirements when composition is split across files.

## What it adds to manual wiring

Manual wiring already checks `new UserService(database)`. It does not, by itself, track which registrations are scoped, which services become async through their dependencies, whether a reusable module's requirements match, or which cached resources a scope owns. InferDI adds those graph-wide contracts and lifecycle behavior while keeping the choices explicit.

You still write assembly code. That is intentional: reviewers can see which implementation was selected and in what order its dependencies arrive.

## A small runtime with real work

Core has zero runtime dependencies, requires no decorators or metadata reflection, and uses no proxy-based resolution. Its production bundle has an enforced budget below 3 KiB gzip. A cached resolve starts with one `Map.get()`; explicit `undefined` values use an internal marker rather than a second lookup.

Types disappear after compilation, but the container still registers providers, creates objects, maintains caches, reports runtime errors, and disposes owned resources. The default mode keeps runtime cycle and lifetime diagnostics. `{ fast: true }` is an opt-in fixed-graph contract that removes some of those checks.

## Business logic stays ordinary

Domain services receive normal constructor or function arguments. They do not need to import InferDI or accept a resolver. The container belongs in the composition root and at lifecycle boundaries, where the application chooses implementations and opens scopes.

This makes direct unit tests boring in the best way: instantiate a service with a fake dependency. Replacing InferDI would still require rewriting registrations and framework glue, but business rules can remain untouched when that boundary has been respected. [Composition Root](./composition-root) shows the complete split.

## Explicit scopes and ownership

A scope can represent an HTTP request, job, tenant operation, or any bounded unit of work. The container disposes cached class and factory results that it owns. Values, overrides, scope inputs, and transient results remain owned by the caller. Parent and child containers never dispose each other automatically.

Framework adapters connect these rules to React, Fastify, Hono, Koa, Express, and Elysia without adding framework behavior to core.

## Where the guarantees stop

TypeScript remains structurally typed. Identical shapes are interchangeable unless you brand values, and `any` or casts can bypass checks. Broad runtime keys reduce graph precision. Dynamic dependency reads after an `await` cannot join synchronous call-stack cycle tracking.

InferDI does not discover architecture, repair dependency cycles, prevent every resource leak, or make every application faster. It checks the relationships you declare and keeps the runtime mechanism small. Continue with the [Quick Start](./quick-start) or inspect the concrete [Type Safety](../core/type-safety) diagnostics.
