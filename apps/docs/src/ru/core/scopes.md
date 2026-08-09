---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/scopes#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Базовые принципы"
          "item": "https://inferdi.com/ru/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Скоупы и очистка"
          "item": "https://inferdi.com/ru/core/scopes"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/scopes#article"
      "headline": "Скоупы и очистка в InferDI"
      "name": "Скоупы и очистка"
      "description": "Scope ограничивает request-local-сервисы одной единицей работы: дочерний scope наследует все регистрации родителя, но кеширует собственные экземпляры и владеет их очисткой, с LIFO-очисткой и поддержкой using и await using."
      "url": "https://inferdi.com/ru/core/scopes"
      "mainEntityOfPage": "https://inferdi.com/ru/core/scopes"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, скоупы, очистка, освобождение ресурсов, дочерний scope, using, await using, LIFO, внедрение зависимостей"
      "articleSection": "Базовые принципы"
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

# Скоупы и очистка

Scope ограничивает время жизни request-local-сервисов одной единицей работы. Дочерний scope наследует все регистрации родителя, но кеширует собственные scoped-экземпляры и владеет их очисткой. Поэтому scope, созданный для одного запроса, не делит состояние с другим запросом и не переживает его.

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` является корневым singleton. `request` создаётся один раз на scope и освобождается при dispose этого scope.

`scoped`-регистрации принадлежат дочерним scope. При `strict: true` (по умолчанию) вызов `root.get('request')` выбрасывает `Scoped "request" cannot be resolved from the root container. Use createScope().` Получайте ключ из контейнера, который вернул `createScope()`. Режим `strict: false` отключает эту runtime-проверку.

## Scope inputs и профили

Scope inputs описывают внешние значения, которые появляются при создании scope: request, auth context, tenant или данные job. `declareScopeInputs()` добавляет эти ключи только в типовой граф и не создаёт runtime-регистраций:

```ts
const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass('accountService', AccountService, ['request', 'auth'], 'scoped')
```

Declaration map принимает обязательные конечные string- и symbol-ключи. Optional- и numeric-ключи, `__proto__`, широкие string/symbol index signatures и union-варианты с разными наборами ключей не компилируются. Объявлять inputs можно на root и на существующем child, но само объявление не предоставляет значение.

`createScope(inputs)` принимает любое подмножество недостающих inputs. InferDI переносит требования через class-регистрации, lazy companions и factories с явным tuple зависимостей:

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth ещё не предоставлен
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')

root.registerFactory(
  'userId',
  ['auth'],
  (c) => c.get('auth').userId,
  'scoped'
)
```

Tuple factory влияет только на типы. Callback получает resolver с `.get()` для перечисленных ключей и `.has()` для проверок. В runtime InferDI вызывает `factory(container)`.

Именованные профили остаются обычными функциями:

```ts
const publicScope = (request: RequestContext) =>
  root.createScope({request})

const authenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})
```

Child делает shallow snapshot собственных enumerable string- и symbol-свойств record. Вложенные children наследуют input values, но создают отдельные scoped-инстансы. Input values принадлежат приложению. При уточнении через новый child сначала освобождайте уточнённый child, затем parent.

Runtime не хранит input schema. JavaScript, `any` или cast могут добавить неизвестный ключ либо затенить регистрацию в cache child. Передавайте пассивный record: object spread вызывает getters и Proxy traps, а реентрантные мутации из них не входят в контракт. В Strict Mode регистрация на partial child видна его refined child. Fast Mode поддерживает уточнение inputs, но сохраняет правило неизменяемого графа: завершите регистрации до первого `.get()` или `.createScope()`.

## Владение

Каждый контейнер освобождает только экземпляры, которые создал сам.

| Экземпляр                                             | Владелец                |
|-------------------------------------------------------|-------------------------|
| Корневой singleton                                    | Корневой контейнер      |
| Scoped-сервис                                         | Request scope           |
| Singleton, впервые полученный из дочернего контейнера | Этот дочерний контейнер |
| Transient                                             | Вызывающий код          |

`root.dispose()` не запускает каскадную очистку уже созданных дочерних scope. Каждый scope нужно очищать на его собственной границе жизненного цикла.

## Нативное управление ресурсами

Container реализует оба символа очистки:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Используйте `await using` или `await container.dispose()`, если принадлежащий контейнеру ресурс может очищаться асинхронно.

## Порядок очистки

Принадлежащие контейнеру экземпляры освобождаются в обратном порядке создания. Container проверяет:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

Если несколько disposers падают, InferDI собирает ошибки в `AggregateError`, чтобы один сбой очистки не мешал закрытию остальных ресурсов.
