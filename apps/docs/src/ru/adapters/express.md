---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/adapters/express#breadcrumb"
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
          "name": "Адаптер Express"
          "item": "https://inferdi.com/ru/adapters/express"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/adapters/express#article"
      "headline": "Адаптер Express для InferDI — @inferdi/express"
      "name": "Адаптер Express"
      "description": "@inferdi/express — это middleware для Express 5: оно создаёт один scope запроса, выставляет его как req.di и освобождает после события Node response finish или close — с declaration merging для полностью типизированного req.di."
      "url": "https://inferdi.com/ru/adapters/express"
      "mainEntityOfPage": "https://inferdi.com/ru/adapters/express"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Express 5, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Express, Express 5, middleware, req.di, declaration merging, жизненный цикл ответа, dependency injection"
      "articleSection": "Адаптеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/express"
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

# Адаптер Express

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) - это middleware для Express 5. Оно создаёт один scope запроса, выставляет его как `req.di` и очищает после события Node response `finish` или `close`.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
```

## Scope запроса

```ts
const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  setupScope: (scope, req) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = req.get('x-user-id') || undefined
    request.ip = req.ip
  },
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

Адаптер не делает global augmentation `Express.Request` через `any`, `unknown` или базовый контейнер. Конкретный тип request принадлежит приложению.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `createScope` | `root.createScope()` | Пользовательское создание scope запроса. |
| `setupScope` | нет | Наполняет scope до обработчиков маршрутов. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. |
| `autoDispose` | `true` | `false` или предикат `false` передаёт владение. |
| `onDisposeError` | `console.error` | Приёмник ошибок очистки. |

## Стриминг и фоновая работа

Обычные потоковые ответы в Express не требуют skip, потому что адаптер ждёт `finish` или `close`.

Используйте `skipInferdiDispose(req)`, когда работа намеренно переживает HTTP-ответ:

```ts
import { skipInferdiDispose } from '@inferdi/express'

app.get('/background', (req, res) => {
  skipInferdiDispose(req)
  const scope = req.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  res.status(202).json({ status: 'queued' })
})
```

## Ограничение для упавших запросов

В отличие от других адаптеров, Express не может надёжно принудительно очистить scope с пропущенной автоочисткой при обработанной ошибке маршрута. Express middleware работает в callback-стиле: после `next()` адаптер не видит ошибку ниже по цепочке, которую позже обработал error handler. Если route вызвал `skipInferdiDispose(req)` и затем упал, scope остаётся во владении приложения. Делайте dispose в своём error path или не совмещайте skips с маршрутами, которые могут бросать ошибки.
