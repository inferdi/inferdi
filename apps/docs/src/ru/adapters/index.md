---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/adapters/#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Адаптеры"
          "item": "https://inferdi.com/ru/adapters/"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/adapters/#article"
      "headline": "Адаптеры фреймворков InferDI — обзор"
      "name": "Адаптеры фреймворков"
      "description": "Каждый адаптер InferDI создаёт scope запроса, публикует его через нативный объект фреймворка и освобождает в безопасной точке жизненного цикла."
      "url": "https://inferdi.com/ru/adapters/"
      "mainEntityOfPage": "https://inferdi.com/ru/adapters/"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, @inferdi/inferdi, Fastify, Hono, Koa, Express, Elysia"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, адаптеры, scope запроса, Fastify, Hono, Koa, Express, Elysia, middleware, dependency injection"
      "articleSection": "Адаптеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
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

# Адаптеры фреймворков

Каждый адаптер создаёт ровно один scope на запрос, кладёт его в нативное для фреймворка место и освобождает в безопасной точке жизненного цикла. При этом сохраняется конкретный тип контейнера, которым владеет приложение: `request.di` остаётся полностью типизированным, а не `any` и не базовым контейнером.

Это вся их работа. Адаптеры - тонкая обвязка жизненного цикла: тот же дизайн, который оставляет [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) без зависимостей, не добавляет в core декораторы, сканирование контроллеров, injection параметров обработчика и поиск маршрутов. Вы подключаетесь к жизненному циклу запроса во фреймворке, а не к его представлению о dependency injection.

## Пакеты

| Пакет | Фреймворк | Где хранится scope | Режим без scope запроса |
| --- | --- | --- | --- |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di` | да |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Hono v4 | `c.var.di` | нет |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | Koa v3 | `ctx.state.di` | нет |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5 | `req.di` | нет |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | Elysia v1 | `context.di` | да |

## Общий контракт жизненного цикла

В режиме со scope каждый адаптер проходит одни и те же шаги на каждый запрос:

1. **Создать** - создаёт scope из корневого контейнера (`createScope`, по умолчанию `root.createScope()`) в начале запроса.
2. **Выставить** - кладёт его в нативное место фреймворка (`request.di`, `ctx.state.di`, `c.var.di` или ключ контекста Elysia) *до* setup, чтобы и ошибка setup, и ваши cleanup-хуки видели один и тот же слот.
3. **Настроить** - `setupScope` наполняет scope данными запроса: идентификатор запроса, авторизованный пользователь, IP клиента. Может быть асинхронным.
4. **Обработать** - обработчики маршрутов и ошибок фреймворка резолвят сервисы из выставленного scope.
5. **Очистить** - освобождает scope в безопасной точке завершения жизненного цикла (`disposeScope`, по умолчанию `scope.dispose()`), если владение не было передано приложению.

### Общие опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер, доступный приложению. Адаптеры его не очищают, кроме opt-in `disposeRootOnClose` у Fastify. |
| `createScope` | `root.createScope()` | Создание scope на запрос. Может быть асинхронным. |
| `setupScope` | нет | Наполнение scope до обработчиков. Может быть асинхронным. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. Синхронная или асинхронная. |
| `autoDispose` | `true` | `false` или предикат, вернувший `false`, передаёт dispose вашему коду. |
| `onDisposeError` | приёмник адаптера | Принимает ошибки очистки scope запроса: Fastify `request.log.error`, Koa `ctx.app.emit('error')`, остальные `console.error`. |
| `skipInferdiDispose(...)` | - | Помечает один запрос как принадлежащий приложению для стриминга или фоновой работы. |

### Правила ошибок и владения

- **Ошибка setup поднимает только исходную ошибку.** Если `setupScope` бросает, адаптер очищает полусобранный scope и пробрасывает именно эту ошибку. Сбой teardown во время такой очистки идёт в `onDisposeError` или приёмник ошибок и никогда не добавляется к проброшенной ошибке.
- **Упавший запрос всё равно очищается.** `skipInferdiDispose` подавляет очистку только при *успешном* ответе; путь с ошибкой очищает scope независимо от маркера. Express - исключение: его callback middleware не видит обработанную ошибку маршрута, поэтому упавший Express-запрос с пропущенной автоочисткой остаётся во владении приложения.
- **`autoDispose: false` и `skipInferdiDispose` передают владение.** Тогда ваш код сам очищает scope в правильной точке жизненного цикла фреймворка.
- **Ошибки очистки после отправленного ответа уходят в приёмник ошибок и проглатываются.** Ответ уже отправлен, поэтому поздний сбой teardown не может его испортить.

## Важные различия

| Адаптер | Разница |
| --- | --- |
| Fastify | Очищает scope в `onResponse`; очистка при abort идёт через `onRequestAbort`; очистка root включается через `disposeRootOnClose`. |
| Hono | Очищает scope после `await next()`; streaming helpers могут вернуть ответ до завершения работы stream, поэтому часто нужен `skipInferdiDispose`. |
| Koa | Ждёт события Node response `finish` или `close`, поэтому обычные тела потоковых ответов не требуют skip. |
| Express | Не может увидеть обработанную downstream-ошибку маршрута из callback middleware; упавший запрос с пропущенной автоочисткой остаётся во владении приложения. |
| Elysia | Очистка привязана к `onAfterResponse`; если hook не достигается, адаптер не может освободить ресурсы внутри scope. |
