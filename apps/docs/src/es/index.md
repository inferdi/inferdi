---
layout: home
description: "Contenedor de DI sin dependencias en runtime ni decoradores, con grafos, tiempos de vida y scopes comprobados por TypeScript."
---

<script setup>
import HomeShowcase from '../../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="es" />

## TypeScript ve el grafo completo

Cada registro devuelve un tipo de contenedor nuevo que guarda su clave, valor, tiempo de vida, enlace asíncrono y requisitos de scope.

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
  <a href="/es/core/type-safety"><strong>Forma del constructor</strong><span>Las claves deben coincidir con los tipos y el orden de los parámetros.</span></a>
  <a href="/es/core/lifetime-guards"><strong>Tiempos de vida</strong><span>Un singleton no puede capturar valores scoped o transient.</span></a>
  <a href="/es/core/scope-inputs"><strong>Disponibilidad del scope</strong><span>Los valores de petición deben existir antes de resolver servicios dependientes.</span></a>
  <a href="/es/core/async-dependencies"><strong>Enlaces asíncronos</strong><span>El estado asíncrono se propaga por el tipo del grafo.</span></a>
</div>

## Adaptadores para frameworks

<div class="adapter-grid">
  <a href="/es/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>Contexto tipado, hooks con Suspense y scopes gestionados.</span></a>
  <a href="/es/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>Un scope tipado por petición con limpieza por ciclo de vida.</span></a>
  <a href="/es/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>Variables de contexto tipadas para Workers, Bun y Node.</span></a>
  <a href="/es/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>Scopes de petición que siguen el ciclo del middleware.</span></a>
  <a href="/es/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>Scopes de petición tipados para middleware y rutas.</span></a>
  <a href="/es/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>Tipos de ruta llevados hasta los servicios de petición.</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">Siguiente paso</p>
  <h2 id="home-next-title">Empieza por la raíz de composición</h2>
  <p>Mantén el grafo en un solo lugar para que sus decisiones sean fáciles de leer y cambiar.</p>
  <div class="home-next-links">
    <a class="primary" href="/es/guide/quick-start">Crea tu primer grafo <span aria-hidden="true">↗</span></a>
    <a href="/es/guide/composition-root">Raíz de composición <span aria-hidden="true">→</span></a>
  </div>
</section>
