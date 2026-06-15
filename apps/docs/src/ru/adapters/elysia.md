---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/adapters/elysia#breadcrumb"
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
          "name": "Адаптер Elysia"
          "item": "https://inferdi.com/ru/adapters/elysia"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/adapters/elysia#article"
      "headline": "Адаптер InferDI для Elysia — @inferdi/elysia"
      "name": "Адаптер Elysia"
      "description": "@inferdi/elysia — это плагин для Elysia v1: в режиме со scope он создаёт один scope запроса, выставляет его в контекст Elysia, оставляет доступным для обработчиков ошибок и очищает из onAfterResponse — с режимом без scope запроса для приложений на Bun."
      "url": "https://inferdi.com/ru/adapters/elysia"
      "mainEntityOfPage": "https://inferdi.com/ru/adapters/elysia"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Elysia v1, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Elysia, Elysia v1, плагин, Bun, scoped derive, onAfterResponse, без scope запроса, внедрение зависимостей"
      "articleSection": "Адаптеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/elysia"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=20, Bun"
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

# Адаптер Elysia

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) - это плагин для Elysia v1. В режиме со scope он создаёт один scope запроса, выставляет его в контекст Elysia, оставляет доступным для пользовательских обработчиков ошибок и очищает из `onAfterResponse`.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
```

## Scope запроса

```ts
const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    setupScope: (scope, { request }) => {
      const ctx = scope.get('request')
      ctx.requestId = crypto.randomUUID()
      ctx.userId = request.headers.get('x-user-id') ?? undefined
    },
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

Собственный ключ контекста:

```ts
const app = new Elysia()
  .use(inferdiElysia({ container: root, key: 'container' }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

Routes должны регистрироваться после `.use(inferdiElysia(...))` в типизированной цепочке Elysia.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. |
| `key` | `'di'` | Ключ контекста Elysia. |
| `scopePerRequest` | `true` | `false` для режима без scope запроса. |
| `createScope` | `root.createScope()` | Пользовательское создание scope запроса. |
| `setupScope` | нет | Наполняет scope до validation и обработчиков маршрутов. |
| `setupValidatedScope` | нет | Наполняет scope после validation Elysia. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. |
| `autoDispose` | `true` | `false` или предикат `false` передаёт владение. |
| `onDisposeError` | `console.error` | Приёмник ошибок очистки. |

## Режим без scope запроса

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

В этом режиме адаптер выставляет корневой контейнер и не устанавливает hooks жизненного цикла scope запроса. Опции, допустимые только для scoped mode, отклоняются статически.

## Заметки о жизненном цикле

Очистка привязана к `onAfterResponse`. Если Elysia не доходит до этого hook, адаптер не может освободить ресурсы, удерживаемые scope запроса. Учёт на каждый запрос хранится через weak-ссылки, но для dispose ресурсов всё равно нужен hook жизненного цикла.

`setupScope` подходит для значений до validation. `setupValidatedScope` подходит для данных из проверенных body, query, params, headers или cookies.

## Стриминг

Elysia может вернуть streaming `Response` до завершения stream. Если scoped-сервисы используются после возврата route, вызывайте `skipInferdiDispose(context)` и очищайте scope самостоятельно.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` подавляет только очистку успешного ответа. Пути с ошибкой всё равно очищают scope.
