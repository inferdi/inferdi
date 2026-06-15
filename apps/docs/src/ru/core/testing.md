---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/testing#breadcrumb"
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
          "name": "Тестирование"
          "item": "https://inferdi.com/ru/core/testing"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/testing#article"
      "headline": "Тестирование и переопределения в InferDI — .override()"
      "name": "Тестирование"
      "description": "Используйте .override(), чтобы заменить существующую регистрацию на мок в тестах, подменяя реализации без изменения продакшен-обвязки и остального типизированного графа."
      "url": "https://inferdi.com/ru/core/testing"
      "mainEntityOfPage": "https://inferdi.com/ru/core/testing"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, тестирование, override, моки, тестовые двойники, подмена реализации, dependency injection"
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

# Тестирование

Используйте `.override()`, когда тестам нужно заменить существующую регистрацию на мок.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

Значение override должно быть совместимо с исходным зарегистрированным типом. Отсутствующие ключи и несовместимые моки дают ошибки TypeScript.

## Когда делать override

Overrides должны происходить до первого resolve ключа:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Вторая строка бросит ошибку. Поздний override расколол бы граф: существующие потребители держали бы старый экземпляр, а новые resolve возвращали бы мок.

## Владение

Override-значения принадлежат внешнему коду. Как и `registerValue`, override не добавляется в очередь dispose контейнера. Очистка остаётся за тестовой фикстурой.

## Локальность scope

Override меняет только контейнер, на котором вызван:

```ts
const scope = root.createScope().override('db', mockDb)
```

Корневой контейнер и соседние scopes не меняются. Overrides на уровне родителя видны через обычный поиск в родительском контейнере.
