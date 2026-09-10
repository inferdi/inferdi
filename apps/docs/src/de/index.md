---
layout: home
description: "DI für TypeScript ohne Abhängigkeiten und Dekoratoren: mit compilergeprüften Graphen, expliziten Lebensdauern und verlässlicher Ressourcenfreigabe."
---

<script setup>
import HomeShowcase from '../../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="de" />

## TypeScript kennt den gesamten Graphen

Jede Registrierung liefert einen neuen Containertyp. Er hält Schlüssel, Wert, Lebensdauer, asynchrone Kanten und Scope-Anforderungen fest.

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
  <a href="/de/core/type-safety"><strong>Konstruktorsignaturen</strong><span>Schlüssel müssen zu Parametertypen und Reihenfolge passen.</span></a>
  <a href="/de/core/lifetime-guards"><strong>Lebensdauern</strong><span>Singletons dürfen keine scoped oder transienten Werte festhalten.</span></a>
  <a href="/de/core/scope-inputs"><strong>Bereitschaft des Scopes</strong><span>Anfragewerte müssen vorliegen, bevor abhängige Services aufgelöst werden.</span></a>
  <a href="/de/core/async-dependencies"><strong>Asynchrone Kanten</strong><span>Asynchrone Abhängigkeiten werden im Graphentyp weitergegeben.</span></a>
</div>

## Framework-Adapter

<div class="adapter-grid">
  <a href="/de/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>Typisierter Kontext, Suspense-Hooks und verwaltete Scopes.</span></a>
  <a href="/de/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>Ein typisierter Scope je Anfrage mit Freigabe im Lebenszyklus.</span></a>
  <a href="/de/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>Typisierte Kontextvariablen für Workers, Bun und Node.</span></a>
  <a href="/de/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>Request-Scopes entlang des Middleware-Lebenszyklus.</span></a>
  <a href="/de/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>Typisierte Request-Scopes für Middleware und Routen.</span></a>
  <a href="/de/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>Routenspezifische Typen bis in die Request-Services.</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">Nächster Schritt</p>
  <h2 id="home-next-title">Beginne am Composition Root</h2>
  <p>Halte den Graphen an einer Stelle, an der seine Entscheidungen leicht zu lesen und zu ändern sind.</p>
  <div class="home-next-links">
    <a class="primary" href="/de/guide/quick-start">Deinen ersten Graphen aufbauen <span aria-hidden="true">↗</span></a>
    <a href="/de/guide/composition-root">Composition Root <span aria-hidden="true">→</span></a>
  </div>
</section>

