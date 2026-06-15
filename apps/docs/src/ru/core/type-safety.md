---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/type-safety#breadcrumb"
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
          "name": "Типобезопасность"
          "item": "https://inferdi.com/ru/core/type-safety"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/type-safety#article"
      "headline": "Типобезопасность в InferDI — граф и есть тип"
      "name": "Типобезопасность"
      "description": "InferDI держит граф зависимостей в системе типов: неверный порядок аргументов, незарегистрированный ключ или singleton, тянущийся к scoped-состоянию, — это ошибка компиляции в вашем редакторе, а не stack trace, который вы находите под нагрузкой."
      "url": "https://inferdi.com/ru/core/type-safety"
      "mainEntityOfPage": "https://inferdi.com/ru/core/type-safety"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, типобезопасность, TypeScript, вывод типов, сигнатуры конструкторов, время компиляции, внедрение зависимостей"
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

# Типобезопасность

Главное правило InferDI: граф зависимостей живёт в системе типов. Неверный граф - перепутанный порядок аргументов, незарегистрированный ключ, singleton, который тянется к scoped-состоянию - это ошибка типа прямо в редакторе, а не stack trace, который вы найдёте под нагрузкой. Всё, что компилятор может доказать статически, проверяется статически; runtime-защита нужна только для того, что проскользнуло через `as`-касты и динамические ключи.

## Сигнатуры конструкторов

`registerClass` проверяет кортеж зависимостей по параметрам конструктора.

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

Если конструктор изменится, регистрация должна измениться вместе с ним. Кортеж `['db', 'logger']` будет отклонён, потому что первый параметр ожидает `Logger`.

## Уникальность ключей

Каждая регистрация возвращает расширенный тип контейнера. Повторная регистрация того же ключа через fluent API отклоняется:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory')
```

В тестах для намеренной замены используется `.override()`.

## Время жизни в типе

Каждая запись хранит тип значения и вид времени жизни. Система типов фильтрует зависимости так, чтобы singleton не мог напрямую зависеть от scoped- или transient-сервисов.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

Runtime-проверки в strict mode остаются вторым рубежом защиты для `as`-кастов, динамических ключей, захваченных внешних контейнеров и циклов зависимостей.
