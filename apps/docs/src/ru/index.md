---
layout: home
description: "DI-контейнер без зависимостей времени выполнения и декораторов: TypeScript проверяет граф, время жизни и границы скоупов."
---

<script setup>
import HomeShowcase from '../../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="ru" />

## TypeScript видит весь граф

Каждая регистрация возвращает новый тип контейнера. В нём записаны ключ, значение, время жизни, асинхронная связь и требования скоупа.

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
  <a href="/ru/core/type-safety"><strong>Сигнатура конструктора</strong><span>Зависимости должны соответствовать типам и порядку параметров.</span></a>
  <a href="/ru/core/lifetime-guards"><strong>Время жизни</strong><span>Singleton не может захватить scoped или transient-значение.</span></a>
  <a href="/ru/core/scope-inputs"><strong>Готовность скоупа</strong><span>Передайте данные запроса, прежде чем получать зависимые сервисы.</span></a>
  <a href="/ru/core/async-dependencies"><strong>Асинхронные связи</strong><span>Асинхронность распространяется по типу графа.</span></a>
</div>

## Адаптеры фреймворков

<div class="adapter-grid">
  <a href="/ru/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>Типизированный контекст, Suspense-хуки и управляемые скоупы.</span></a>
  <a href="/ru/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>Отдельный типизированный скоуп и освобождение ресурсов после запроса.</span></a>
  <a href="/ru/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>Типизированные переменные контекста для Workers, Bun и Node.</span></a>
  <a href="/ru/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>Скоуп запроса следует жизненному циклу middleware.</span></a>
  <a href="/ru/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>Типизированные скоупы для middleware и маршрутов.</span></a>
  <a href="/ru/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>Сервисы запроса получают данные с типами, заданными маршрутом.</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">Следующий шаг</p>
  <h2 id="home-next-title">Начните с корня композиции</h2>
  <p>Держите граф в одном месте, где все решения легко увидеть и изменить.</p>
  <div class="home-next-links">
    <a class="primary" href="/ru/guide/quick-start">Собрать первый граф <span aria-hidden="true">↗</span></a>
    <a href="/ru/guide/composition-root">Корень композиции <span aria-hidden="true">→</span></a>
  </div>
</section>
