---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/adapters/hono#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Адаптеры"
          "item": "https://inferdi.com/ru/adapters/"
        - "@type": "ListItem"
          "position": 3
          "name": "Адаптер Hono"
          "item": "https://inferdi.com/ru/adapters/hono"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/adapters/hono#article"
      "headline": "Адаптер Hono для InferDI — @inferdi/hono"
      "name": "Адаптер Hono"
      "description": "@inferdi/hono — это middleware для Hono v4: оно создаёт один scope запроса на каждый вызов, выставляет его через переменные контекста Hono и освобождает после завершения ограниченного pipeline маршрута — подходит для Cloudflare Workers и Bun на edge."
      "url": "https://inferdi.com/ru/adapters/hono"
      "mainEntityOfPage": "https://inferdi.com/ru/adapters/hono"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Hono v4, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Hono, Hono v4, middleware, переменные контекста, edge, Cloudflare Workers, Bun, dependency injection"
      "articleSection": "Адаптеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/hono"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=16, Bun, Cloudflare Workers"
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

# Адаптер Hono

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) - это middleware для Hono v4. Он создаёт один scope запроса на вызов middleware, выставляет его через переменные контекста Hono и очищает после завершения ограниченного pipeline маршрута.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
```

## Scope запроса

```ts
const root = buildRootContainer()
type AppEnv = InferdiHonoEnv<typeof root>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  setupScope: (scope, c) => {
    const ctx = scope.get('request')
    ctx.requestId = crypto.randomUUID()
    ctx.userId = c.req.header('x-user-id')
  },
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` эквивалентен `c.var.di`.

## Собственный ключ

```ts
type AppEnv = InferdiHonoEnv<typeof root, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({ container: root, key: 'container' }))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

Адаптер не делает global augmentation для Hono `ContextVariableMap`, поэтому пропущенное middleware остаётся видимым для TypeScript.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `key` | `'di'` | Ключ переменной контекста. |
| `createScope` | `root.createScope()` | Пользовательское создание scope запроса. |
| `setupScope` | нет | Наполняет scope до обработчиков маршрутов. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. |
| `autoDispose` | `true` | `false` или предикат `false` передаёт владение. |
| `onDisposeError` | `console.error` | Приёмник ошибок очистки. |

## Стриминг

Helpers для стриминга в Hono могут вернуть `Response` до завершения stream callback. В таких маршрутах вызывайте `skipInferdiDispose(c)` и очищайте scope из жизненного цикла stream.

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

`skipInferdiDispose` подавляет очистку только для успешного ответа. Пути с ошибкой всё равно очищают scope.
