---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/performance#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Руководство"
          "item": "https://inferdi.com/ru/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Производительность"
          "item": "https://inferdi.com/ru/guide/performance"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/performance#article"
      "headline": "Производительность InferDI: тёплый resolve использует один Map.get()"
      "name": "Производительность"
      "description": "InferDI использует явные регистрации, кешированные singleton- и scoped-сервисы, прямые вызовы конструкторов для 0-7 зависимостей и Promise-кеширование async-фабрик."
      "url": "https://inferdi.com/ru/guide/performance"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/performance"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, производительность, бенчмарк, нулевые накладные расходы, горячий путь, внедрение зависимостей, V8, Map.get"
      "articleSection": "Руководство"
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

# Производительность

Тёплый вызов `.get()` - это один `Map.get(key)` и прямой `new Ctor(...)`: без reflection, таблиц метаданных и proxy на пути. Цифры в бенчмарке ниже появляются из конкретных решений в рантайме, а не из отдельного fast mode, который нужно включать вручную:

| Решение | Эффект |
| --- | --- |
| Явные регистрации | Сборка контейнера делает плоский `Map.set` на сервис. Нет побочных эффектов декораторов, парсеров имён конструкторов и таблиц метаданных. |
| Закешированные singleton- и scoped-сервисы | Тёплый вызов `.get()` читает `cache.get(key)` до проверок циклов и времени жизни. Запасной `cache.has(key)` нужен только для явно зарегистрированного `undefined`. |
| Прямые вызовы конструкторов | Классы с 0-7 зависимостями идут по прямому пути `new Ctor(...)`. Конструкторы с большим числом аргументов используют `Reflect.construct`. |
| Асинхронные фабрики | Фабричный `Promise` кешируется как есть, поэтому параллельные вызовы делят одну начатую инициализацию, а `.get()` остаётся синхронным. |
| Граница strict mode | `strict: true` ловит циклы и утечки времени жизни. `strict: false` убирает эти проверки для заранее проверенных горячих transient-графов. |

![Результаты бенчмарков](/benchmarking_results.png)

## Набор бенчмарков

Набор бенчмарков сравнивает InferDI с InversifyJS v8, Awilix v13 в режимах PROXY и CLASSIC, TSyringe v4, TypeDI v0.10 и Typed Inject v5.

Все значения указаны в операциях в секунду на Node 22. Чем выше, тем лучше.

| Сценарий | InferDI | InversifyJS | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. Горячий singleton** (тёплый кеш) | **14.3 M** | 10.7 M | 7.0 M | 7.3 M | 6.7 M | 5.8 M | 6.45 M |
| **2. Transient-сервис** (новый экземпляр на вызов) | **9.75 M** | 6.1 M | 4.1 M | 3.45 M | 3.0 M | 2.5 M | 1.6 M |
| **3. Глубокий граф** (10 уровней, всё transient) | **2.3 M** | 1.5 M | 1.3 M | 716 k | 736 k | 643 k | 222 k |
| **4a. Широкий граф** (4 зависимости, корень transient) | **8.25 M** | 4.9 M | 3.4 M | 2.2 M | 2.3 M | 1.65 M | 1.1 M |
| **4b. Широкий граф** (10 зависимостей, корень transient) | **3.5 M** | 1.9 M | 2.6 M | 1.2 M | 1.3 M | 938 k | 458 k |
| **5. Сборка контейнера и первый вызов** | **400 k** | 13.2 k | 223 k | 10 k | 8.3 k | 206 k | 282 k |
| **6. Жизненный цикл scope** (создание, resolve, очистка) | **2.85 M** | 35 k | 2.45 M | 330 k | 430 k | 1.1 M | 665 k |
| **7. Ленивый resolve** (обёртка с отложенным доступом) | **11.8 M** | 7.6 M | 7.15 M | 5.6 M | 4.7 M | 4.25 M | 2.85 M |

## Что показывают цифры

- Закешированный singleton-resolve в 1,34 раза быстрее ближайшей альтернативы — InversifyJS.
- Сборка контейнера вместе с первым вызовом выигрывает за счёт плоской регистрации. InferDI регистрирует граф с нуля; библиотеки на декораторах уже оплатили часть этой работы при загрузке модулей.
- Сценарии с широким графом показывают пользу развёрнутых вызовов по числу аргументов. При четырёх зависимостях InferDI опережает ближайшую альтернативу в 1,68 раза. На десяти зависимостях он переходит на `Reflect.construct` и остаётся в 1,35 раза быстрее Typed Inject.
- Жизненный цикл scope включает создание scope, resolve и очистку. Сценарий 6 выполняет dispose на каждой итерации, поэтому измеряет владение scope, а не только получение значения.
- InferDI лидирует во всех 8 сценариях. Typed Inject остаётся ближайшей альтернативой в scoped-потоках и широком графе с десятью зависимостями, а InversifyJS — при закешированном singleton, transient, глубоком графе и широком графе с четырьмя зависимостями.

## Быстрый режим

`new Container({ strict: false })` убирает runtime-учёт циклов, отслеживание singleton-стека и `try`/`finally` вокруг защищённого пути resolve. В README пакета показано ускорение примерно на 30% для локальных transient-вызовов на плоском transient-графе. Закешированные singleton- и scoped-вызовы не меняются, потому что возвращаются до этих проверок.

Включайте быстрый режим только после тестов, которые прогнали граф в стандартном strict mode. TypeScript не видит singleton-циклы, transient-циклы, динамические ключи, `as`-касты и фабрики, захватившие внешний контейнер с более широким типом.

Для профилированного production-пути с большим числом transient-resolve `{ strict: false }` даёт максимальную поддерживаемую скорость после такой проверки. В разработке и тестах оставляйте strict mode. На закешированные singleton- и scoped-resolve этот режим не влияет.

## Детали горячего пути

Symbol-ключи могут помочь в плотных циклах resolve, потому что `Map` сравнивает их по идентичности. Строковым ключам нужен хеш, а при коллизии - посимвольное сравнение. В большинстве приложений разница не измеряется, поэтому переходите на symbol-ключи только после сигнала профилировщика.

## Запуск локально

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

Рабочее пространство бенчмарков изолировано от корневого workspace pnpm и имеет собственный lockfile. Методология и фикстуры описаны в [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md).
