---
layout: home
description: "Un conteneur DI sans dépendances ni décorateurs, avec graphes vérifiés, durées de vie explicites et libération prévisible des ressources."
---

<script setup>
import HomeShowcase from '../../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="fr" />

## TypeScript voit tout le graphe

Chaque enregistrement renvoie un nouveau type de conteneur qui conserve sa clé, sa valeur, sa durée de vie, ses relations asynchrones et ses exigences de scope.

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
  <a href="/fr/core/type-safety"><strong>Signatures des constructeurs</strong><span>Les clés doivent respecter les types et l’ordre des paramètres.</span></a>
  <a href="/fr/core/lifetime-guards"><strong>Durées de vie</strong><span>Les singletons ne peuvent pas capturer de valeurs scoped ou transient.</span></a>
  <a href="/fr/core/scope-inputs"><strong>Disponibilité du scope</strong><span>Les données de requête doivent exister avant la résolution des services qui en dépendent.</span></a>
  <a href="/fr/core/async-dependencies"><strong>Relations asynchrones</strong><span>Les dépendances asynchrones se propagent dans le type du graphe.</span></a>
</div>

## Adaptateurs de frameworks

<div class="adapter-grid">
  <a href="/fr/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>Contexte typé, hooks Suspense et scopes gérés.</span></a>
  <a href="/fr/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>Un scope typé par requête, libéré selon son cycle de vie.</span></a>
  <a href="/fr/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>Variables de contexte typées pour Workers, Bun et Node.</span></a>
  <a href="/fr/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>Scopes de requête liés au cycle de vie du middleware.</span></a>
  <a href="/fr/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>Scopes de requête typés pour les middlewares et les routes.</span></a>
  <a href="/fr/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>Types propres aux routes transmis aux services de requête.</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">Étape suivante</p>
  <h2 id="home-next-title">Pars du point de composition</h2>
  <p>Garde le graphe au même endroit pour rendre ses choix faciles à comprendre et à modifier.</p>
  <div class="home-next-links">
    <a class="primary" href="/fr/guide/quick-start">Construire ton premier graphe <span aria-hidden="true">↗</span></a>
    <a href="/fr/guide/composition-root">Point de composition <span aria-hidden="true">→</span></a>
  </div>
</section>

