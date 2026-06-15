---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/adapters/koa#breadcrumb"
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
          "name": "Адаптер Koa"
          "item": "https://inferdi.com/ru/adapters/koa"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/adapters/koa#article"
      "headline": "Адаптер Koa для InferDI — @inferdi/koa"
      "name": "Адаптер Koa"
      "description": "@inferdi/koa — это middleware для Koa v3: оно создаёт один scope запроса, выставляет его как ctx.state.di и освобождает после события Node response finish или close — с типизированными ключами state и cleanup-хуками."
      "url": "https://inferdi.com/ru/adapters/koa"
      "mainEntityOfPage": "https://inferdi.com/ru/adapters/koa"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Koa v3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Koa, Koa v3, middleware, ctx.state.di, жизненный цикл ответа, dependency injection"
      "articleSection": "Адаптеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/koa"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=18"
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

# Адаптер Koa

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) - это middleware для Koa v3. Оно создаёт один scope запроса, выставляет его как `ctx.state.di` и очищает после события Node response `finish` или `close`.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
```

## Scope запроса

```ts
const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    di: InferdiScopeOf<typeof root>
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  setupScope: (scope, ctx) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = ctx.get('x-user-id') || undefined
    request.ip = ctx.ip
  },
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## Собственный ключ state

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState, type InferdiScopeOf } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<InferdiScopeOf<typeof root>, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({ container: root, key: 'container' }))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `key` | `'di'` | Ключ в Koa state. |
| `createScope` | `root.createScope()` | Пользовательское создание scope запроса. |
| `setupScope` | нет | Наполняет scope до следующего middleware. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. |
| `autoDispose` | `true` | `false` или предикат `false` передаёт владение. |
| `onDisposeError` | `ctx.app.emit('error')` | Приёмник ошибок очистки. |

## Стриминг

Обычные тела потоковых ответов в Koa не требуют skip. Адаптер ждёт `finish` или `close`.

Используйте `skipInferdiDispose(ctx)` только когда код приложения намеренно держит scope дольше границы HTTP-ответа:

```ts
import { skipInferdiDispose } from '@inferdi/koa'

app.use(async (ctx) => {
  skipInferdiDispose(ctx)
  const scope = ctx.state.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  ctx.body = { status: 'queued' }
})
```

Downstream-ошибка всегда очищает scope; успешные запросы с пропущенной автоочисткой переходят во владение приложения.
