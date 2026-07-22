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
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
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

Применяйте overrides до разрешения графа зависимостей:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Вторая строка бросит ошибку, потому что singleton уже находится в локальном кеше контейнера. Проверка намеренно опирается только на кеш: она также обнаруживает scoped-значения в текущем scope, `registerValue` и повторный override. Transient-значения и значения предка, разрешённые через дочерний контейнер, локально не кешируются, поэтому проверка их не видит. Уже выданный transient остаётся у вызывающего кода, а последующие resolve возвращают мок. Это часть контракта, а не разрешение на поздние overrides: применяйте их до разрешения графа, чтобы не расколоть его.

## Владение

Override-значения принадлежат внешнему коду. Как и `registerValue`, override не добавляется в очередь dispose контейнера. Очистка остаётся за тестовой фикстурой.

## Локальность scope

Override меняет только контейнер, на котором вызван:

```ts
const scope = root.createScope().override('db', mockDb)
```

Корневой контейнер и соседние scopes не меняются. Overrides на уровне родителя видны через обычный поиск в родительском контейнере.
