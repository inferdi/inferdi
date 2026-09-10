---
layout: home
description: "A zero-dependency, decorator-free DI container with compiler-checked graphs, explicit lifetimes, and predictable disposal."
---

<script setup>
import HomeShowcase from '../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="en" />

## TypeScript sees the whole graph

Each registration returns a new container type that records its key, value, lifetime, async edge, and scope requirements.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(readonly logger: Logger, readonly database: Database) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

<div class="value-grid">
  <a href="/core/type-safety"><strong>Constructor shapes</strong><span>Keys must match parameter types and order.</span></a>
  <a href="/core/lifetime-guards"><strong>Lifetimes</strong><span>Singletons cannot capture scoped or transient values.</span></a>
  <a href="/core/scope-inputs"><strong>Scope readiness</strong><span>Request values must exist before dependent services resolve.</span></a>
  <a href="/core/async-dependencies"><strong>Async edges</strong><span>Async dependencies propagate through the graph type.</span></a>
</div>

## Framework adapters

<div class="adapter-grid">
  <a href="/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>Typed context, Suspense hooks, and managed scopes.</span></a>
  <a href="/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>One typed scope per request with lifecycle cleanup.</span></a>
  <a href="/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>Typed context variables for Workers, Bun, and Node.</span></a>
  <a href="/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>Request scopes that follow the middleware lifecycle.</span></a>
  <a href="/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>Typed request scopes for middleware and routes.</span></a>
  <a href="/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>Route-aware types carried into request services.</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">Next step</p>
  <h2 id="home-next-title">Start at the composition root</h2>
  <p>Keep the graph in one place, where its choices are easy to read and change.</p>
  <div class="home-next-links">
    <a class="primary" href="/guide/quick-start">Build your first graph <span aria-hidden="true">↗</span></a>
    <a href="/guide/composition-root">Composition root <span aria-hidden="true">→</span></a>
  </div>
</section>
