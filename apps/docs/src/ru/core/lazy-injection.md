---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/lazy-injection#breadcrumb"
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
          "name": "Ленивое внедрение"
          "item": "https://inferdi.com/ru/core/lazy-injection"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/lazy-injection#article"
      "headline": "Ленивое внедрение в InferDI — Lazy<T>"
      "name": "Ленивое внедрение"
      "description": "Lazy<T> — это обёртка с отложенным resolve для задержки порядка создания или для того, чтобы два singleton-сервиса ссылались друг на друга, не создавая оба в конструкторах, не нарушая при этом контроль времени жизни."
      "url": "https://inferdi.com/ru/core/lazy-injection"
      "mainEntityOfPage": "https://inferdi.com/ru/core/lazy-injection"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, ленивое внедрение, Lazy, отложенный resolve, циклическая зависимость, singleton, внедрение зависимостей"
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

# Ленивое внедрение

`Lazy<T>` и `AsyncLazy<T>` откладывают resolve до вызова `.get()`. Для sync-цели метод возвращает `T`, для декларативной async-цели — `Promise<T>`. Класс с union-ключом, который может выбрать оба режима, получает `Lazy<T> | AsyncLazy<T>`.

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

`lazyKey`, переданный в `registerClass`, `registerFactory` или `registerAsyncFactory`, создаёт companion-регистрацию со значением `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

Для `registerAsyncFactory` ключ companion передаётся пятым аргументом:

```ts
const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy = c.get('dbLazy') // AsyncLazy<Database>
const db = await dbLazy.get()
```

Получение и внедрение wrapper не запускает фабрику. Для singleton и scoped
`.get()` возвращает закешированный native Promise, включая rejection. Transient
запускается при каждом вызове и остаётся во владении caller. Promise-valued
`registerFactory` сохраняет sync-контракт и создаёт `Lazy<Promise<T>>`.

## Время жизни сохраняется

Lazy companion сохраняет lifetime цели. Singleton может инжектить только `Lazy` или `AsyncLazy` для singleton-цели. TypeScript также отклоняет union с возможным short-lived lifetime и union управляемого и обычного wrapper.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped- и transient-потребители могут использовать lazy companions для любого времени жизни, потому что они не кешируются глобально.

Wrapper захватывает контейнер, в котором его получили. Wrapper из первого child
scope продолжает работать через этот scope после создания второго. После
disposal захваченного scope `AsyncLazy.get()` возвращает rejected Promise.
Владелец освобождает разрешённые singleton/scoped-цели и ждёт уже запущенную
инициализацию; незапущенная цель не создаёт ресурс.

## Циклические зависимости

InferDI обнаруживает синхронные циклы, включая декларативные async-зависимости во время preflight. Динамический цикл через `AsyncLazy.get()` после Promise-границы не попадает в этот detector. Если инициализация снова получает собственный pending Promise, обе стороны ждут бесконечно. Вынесите общую инициализацию или уберите цикл. Async-граница описана в разделе [Асинхронный граф зависимостей](./async-dependency-graph).
