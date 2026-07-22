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
      "dateModified": "2026-06-15"
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
