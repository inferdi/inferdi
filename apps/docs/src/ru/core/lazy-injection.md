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

`Lazy<T>` - это небольшая обёртка с отложенным resolve. Она полезна, когда порядок создания нужно отложить или два singleton-сервиса должны ссылаться друг на друга без немедленного создания обоих объектов в конструкторах.

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

`lazyKey`, переданный в `registerClass` или `registerFactory`, создаёт companion-регистрацию со значением `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

## Время жизни сохраняется

Lazy не является лазейкой вокруг времени жизни. Singleton может инжектить только `Lazy` companion для singleton-цели.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped- и transient-потребители могут использовать lazy companions для любого времени жизни, потому что они не кешируются глобально.

## Циклические зависимости

InferDI обнаруживает синхронные циклы, включая декларативные async-зависимости во время preflight, но не разрывает их автоматически. `Lazy<singleton>` может разорвать синхронное singleton-ребро, однако у декларативных async-регистраций нет lazy companion. Динамический цикл после Promise-границы требует архитектурного решения: вынести общую инициализацию, поднять одну сторону выше или убрать цикл. Async-граница описана в разделе [Асинхронный граф зависимостей](./async-dependency-graph).
