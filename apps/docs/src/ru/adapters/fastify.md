---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/adapters/fastify#breadcrumb"
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
          "name": "Адаптер Fastify"
          "item": "https://inferdi.com/ru/adapters/fastify"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/adapters/fastify#article"
      "headline": "Адаптер Fastify для InferDI — @inferdi/fastify"
      "name": "Адаптер Fastify"
      "description": "@inferdi/fastify — это плагин для Fastify v5: в режиме со scope он выставляет root как app.di, создаёт один scope запроса в onRequest, выставляет его как request.di и освобождает в onResponse — с типизированными cleanup-хуками и обработкой отмены запроса клиентом."
      "url": "https://inferdi.com/ru/adapters/fastify"
      "mainEntityOfPage": "https://inferdi.com/ru/adapters/fastify"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Fastify v5, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Fastify, Fastify v5, плагин, scope запроса, request.di, onRequest, onResponse, dependency injection"
      "articleSection": "Адаптеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/fastify"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=20"
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

# Адаптер Fastify

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) - это плагин для Fastify v5. В режиме со scope он выставляет root как `app.di`, создаёт scope запроса в `onRequest`, выставляет его как `request.di` и очищает в `onResponse`.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
```

## Scope запроса

Опубликуйте конкретные типы контейнеров через расширение модуля:

```ts
const root = buildRootContainer()
const app = Fastify()

type RootContainer = typeof root
type RequestContainer = ReturnType<RootContainer['createScope']>

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

await app.register(inferdiFastify, {
  container: root,
  setupScope: (scope: RequestContainer, request) => {
    const ctx = scope.get('request')
    ctx.requestId = request.id
    ctx.ip = request.ip
  },
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

Fastify `app.register` не может глубоко вывести generics плагина для inline hooks, поэтому параметры hook лучше аннотировать явно.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер, выставленный как `app.di`. |
| `scopePerRequest` | `true` | `false` для режима без scope запроса. |
| `createScope` | `root.createScope()` | Пользовательское создание scope запроса. |
| `setupScope` | нет | Наполняет scope в `onRequest`. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. |
| `autoDispose` | `true` | `false` или предикат `false` передаёт владение. |
| `disposeRootOnClose` | `false` | Очищает root во время `fastify.close()`. |
| `onDisposeError` | `request.log.error` | Приёмник ошибок очистки scope запроса. |

## Режим без scope запроса

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

В этом режиме адаптер не устанавливает request decoration и hooks жизненного цикла запроса.

## Заметки о жизненном цикле

- `request.di` выставляется только после успешного setup.
- Ошибка setup очищает полусобранный scope и поднимает только исходную ошибку setup.
- Cleanup hooks видят `request.di`, пока выполняются.
- Упавший запрос игнорирует `skipInferdiDispose` и всё равно очищает scope, с учётом `autoDispose`.
- Очистка при client abort выполняется в `onRequestAbort` после выставления scope.
- Ошибки очистки root проходят через `fastify.close()` только с `disposeRootOnClose`.
