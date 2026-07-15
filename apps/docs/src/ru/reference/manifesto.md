---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/reference/manifesto#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Справочник"
          "item": "https://inferdi.com/ru/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Архитектурный манифест ядра InferDI"
          "item": "https://inferdi.com/ru/reference/manifesto"
    - "@type": "Article"
      "@id": "https://inferdi.com/ru/reference/manifesto#article"
      "headline": "Архитектурный манифест ядра InferDI"
      "name": "Архитектурный манифест ядра InferDI"
      "description": "Архитектурный манифест, стоящий за InferDI: всё, что компилятор может проверить статически, должно проверяться статически, при нулевых накладных расходах во время выполнения, нуле зависимостей, нуле декораторов и сознательных компромиссах, которые из этого следуют."
      "url": "https://inferdi.com/ru/reference/manifesto"
      "mainEntityOfPage": "https://inferdi.com/ru/reference/manifesto"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, манифест, архитектура, принципы проектирования, безопасность типов, нулевые накладные расходы, нуль зависимостей, внедрение зависимостей"
      "articleSection": "Справочник"
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

# Архитектурный манифест ядра InferDI

Этот документ задаёт правила для `@inferdi/inferdi` в `packages/inferdi`. Читайте его перед ревью PR, который меняет публичный API, систему типов, путь resolve в `get()`, форму регистрации, семантику scope или поведение очистки.

## 1. Философия и обещание

### Миссия

InferDI показывает, что DI в TypeScript может сохранять гибкость во время выполнения без отказа от статических гарантий. Граф зависимостей - это TypeScript-тип. Если компилятор может проверить правило, InferDI должен выразить его в публичных сигнатурах. Runtime-проверки нужны для `as`-кастов, захваченных внешних контейнеров, динамических ключей и других мест, где TypeScript не видит весь граф.

### Ценность

Граф и есть тип. Отсутствующий ключ, неверная позиция аргумента конструктора, повторная регистрация или утечка singleton-to-scoped должны падать до запуска боевого кода. Runtime-контракт тоже остаётся маленьким: без runtime-зависимостей, декораторов, рефлексии метаданных, ловушек Proxy и фреймворковой логики в основном пакете.

Resolve с попаданием в кеш остаётся быстрым путём из одного `Map.get()`. Создание классов использует развёрнутые прямые вызовы `new Ctor(...)` для 0-7 зависимостей и измеренный хвостовой путь для 8+ зависимостей.

Если фича ослабляет эти обещания, её нужно отклонить или вынести за пределы core.

## 2. Необсуждаемые опоры

### 2.1 Типобезопасность от начала до конца

Каждая публичная сигнатура должна делать неверные состояния графа невыразимыми там, где TypeScript способен выразить правило.

- `register*` использует `K & ([K] extends [keyof T] ? never : unknown)`, чтобы повторные ключи падали при компиляции, а проблемный ключ оставался виден в ошибке.
- `DepsOf<AllowedDeps<T, Kind>, A>` проверяет кортеж `deps` по позициям конструктора и структурной совместимости.
- `AllowedDeps<T, Kind>` сужает контейнер, переданный в фабрики. Внутри singleton-фабрики `c.get('scoped')` является ошибкой типов.
- `Spec`, `LazySpec`, `SpecMap`, `Module`, `Container.Resolve`, `Container.ResolveUnwrapped`, `Container.UnwrappedValue` и `Container.Providers` входят в контракт. Их изменение считается изменением публичного API.
- Новая или изменённая публичная поверхность типов требует позитивных тестов типов и негативных `// @ts-expect-error` tests в `packages/inferdi/__tests__/container.test-d.ts`.

Известные ограничения TypeScript нужно документировать, а не прятать. Например, две зависимости с одинаковой структурной формой остаются взаимозаменяемыми, пока пользователь не добавит номинальное различие через `unique symbol` keys или branded-типы значений.

### 2.2 Никаких декораторов и reflect metadata

InferDI - это обычный TypeScript с таргетом ES2022. Не добавляйте декораторы, `reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata`, TS transformers или плагины транспайлера.

- Тип конструктора является источником истины для типов зависимостей.
- Явный кортеж `deps` является источником истины для порядка аргументов.
- Runtime не читает имена параметров конструктора, сгенерированные metadata или поля классов.

Декораторы и metadata превращают InferDI в другую библиотеку. Они добавляют runtime-состояние, требования к инструментарию и стоимость холодного старта, которые основной пакет отвергает.

### 2.3 Время жизни является типом

В core есть три вида регистрации: `singleton`, `scoped` и `transient`. Каждая регистрация несёт своё время жизни через `Spec<V, Kind>`.

- Singleton не должен напрямую зависеть от scoped- или transient-сервиса. `AllowedDeps<T, Kind>` обеспечивает это на этапе компиляции, а `strict: true` - во время выполнения для кастов и динамических регистраций.
- `Lazy<V>` сохраняет время жизни цели. Singleton-потребитель может инжектить только `LazySpec<V, 'singleton'>`. `Lazy<scoped>` и `Lazy<transient>` легальны для scoped- и transient-потребителей и нелегальны для singleton-потребителей.
- Runtime-флаг `Registration.lazy` должен быть `true` только для lazy companion-регистраций, у которых target kind равен `'singleton'`.
- Runtime-флаг `Registration.owned` равен `true` только для class/factory-регистраций, созданное значение которых принадлежит контейнеру. Для `registerValue`, `.override()` и lazy companion он равен `false`.
- Значения из `registerValue` и `.override()` принадлежат внешнему коду. Они не попадают в очередь teardown.
- `.override()` - тестовая лазейка. Он должен сохранять исходные `kind` и `lazy`, оставаться локальным для scope, отклонять неизвестные ключи, очищенные контейнеры и ключи, уже resolved на этом контейнере.
- `dispose()` трогает только экземпляры, которыми владеет данный контейнер. Родительские и дочерние контейнеры не очищают друг друга.

### 2.4 Горячий путь resolve остаётся маленьким

Первая операция в `get()` - локальный поиск в кеше:

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

Не добавляйте работу перед этим поиском.

- Явные `undefined`-значения представлены через `UNDEFINED_MARKER`; не возвращайте второй `cache.has(key)` на путь попадания в кеш.
- `_disposed`, поиск локальной регистрации, поиск родителя, `lookupCache`, проверки циклов, проверки времени жизни и мутация singleton-stack находятся после быстрого пути кеша.
- Локальные регистрации проверяются до поиска по цепочке родителей. `lookupCache` - мемоизация холодного пути только для попаданий в родителя.
- Вызов конструктора остаётся развёрнутым по arity для 0-7 аргументов. Путь 8+ использует `Reflect.construct` с packed array, собранным через `push`.
- `get()` остаётся синхронным. Общие `resolving` array и `singletonStack` работают только потому, что один resolve атомарно выполняется на call stack.
- `strict: false` может убрать runtime-проверки циклов и времени жизни после быстрого пути кеша. Он не должен менять наблюдаемую семантику попадания в кеш.

`packages/inferdi/__tests__/container.bench.ts` не проверяется в CI. Ревьюеры должны требовать вывод бенчмарка для изменений в `get()`, форме объекта регистрации, представлении кеша, поиске scope, lazy companions или вызове конструктора. Локальная регрессия больше 5% в релевантном сценарии блокирует merge, если PR не содержит узкого письменного обоснования.

### 2.5 Нулевые runtime-зависимости

У `@inferdi/inferdi` нет runtime dependencies. Так и должно оставаться.

Опубликованный bundle должен оставаться меньше 2.5KB gzip. CI пока не проверяет этот бюджет, поэтому ревьюеры должны проверять размер bundle для PR, которые добавляют код в core implementation или публичные helpers.

## 3. Фильтр PR

Для каждого PR, который трогает `packages/inferdi/src`, `packages/inferdi/package.json`, `packages/inferdi/jsr.json` или core tests, ответьте на ревью:

1. Сохраняет ли изменение compile-time гарантии графа, или переносит правило в runtime-проверки без документированного ограничения TypeScript?
2. Трогает ли оно поведение cache-hit в `get()`, форму объекта регистрации, lookup scope, lazy resolution или вызов конструктора? Если да, где benchmark evidence?
3. Добавляет ли оно runtime-зависимость, поддержку декораторов, рефлексию метаданных, resolve через proxy или требование к транспайлеру в основной пакет?

Отклоняйте PR, если пункт 1 переносит type rule в runtime без причины, пункт 2 не содержит benchmark evidence, или пункт 3 получает ответ "да".

## 4. Чеклист строгого контроля

Любое изменение из списка ниже требует явного обоснования в PR.

### Горячий путь и runtime shape

- [ ] Добавлена работа перед `cache.get(key)` в `get()`?
- [ ] Изменились `UNDEFINED_MARKER`, `cache`, `regs`, `lookupCache` или форма `Registration`?
- [ ] Порядок свойств `Registration` изменился с `{kind, lazy, fn, owned}`?
- [ ] Поиск локальной регистрации перенесён после поиска родителя?
- [ ] В resolve добавлены `Proxy`, `Reflect.get`, `Object.defineProperty` или metadata lookup?
- [ ] `get()` стал `async`?
- [ ] Удалены или изменены развёрнутые ветки arity для 0-7 аргументов конструктора?

### Система типов

- [ ] Ослаблена защита от повторных ключей вне `.override()`?
- [ ] `string | symbol` сужен до `string` в публичном key constraint?
- [ ] Ослаблены `AllowedDeps`, `LazySpec` или lifetime filtering?
- [ ] Изменились `NoKeyOverlap`, `Module`, `SpecMap` или namespace helper types?
- [ ] В `src/` добавлены новые небезопасные `any`, `unknown as` или `// @ts-ignore`?
- [ ] Публичное поведение типов изменилось без type tests?

### Зависимости и сборка

- [ ] Runtime dependency добавлена в `packages/inferdi/package.json`?
- [ ] Добавлен peer dependency на `reflect-metadata`, `tslib` или фреймворковую обвязку?
- [ ] Bundle budget превышен без approval на ревью?
- [ ] Потребовался TS plugin, transformer, флаг декораторов или metadata emit?

### Жизненный цикл и dispose

- [ ] `dispose()` или `[Symbol.dispose]()` перестал выставлять `_disposed` до вызова disposers?
- [ ] Очистка state перенесена после вызова disposers?
- [ ] Удалены detach родителя или очистка `lookupCache`?
- [ ] Изменён порядок LIFO disposal?
- [ ] Порядок проверки disposer изменился с `Symbol.asyncDispose` -> `Symbol.dispose` -> `.dispose()`?
- [ ] Несколько сбоев teardown больше не становятся `AggregateError`?
- [ ] Sync teardown больше не сообщает о неправильном использовании async-resource?

### Escape hatches и динамическое использование

- [ ] `.override()` разрешён после первого resolve?
- [ ] `.override()` перестал сохранять `kind` или `lazy`?
- [ ] `.has()` стал resolver или начал мутировать caches?
- [ ] Runtime-constructed keys продвигаются как основной API?
- [ ] В core добавлены auto-wire, auto-inject, injection по именам параметров, сканирование файловой системы или module discovery?

## 5. Осознанные компромиссы

Эти решения нужно документировать, а не "чинить".

| Компромисс                                                        | Причина                                                                                                                                                                                                                                                           |
|-------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Нет ES5 и target ниже ES2022                                      | `Map`, `Symbol`, `WeakRef`, `Reflect.construct`, `Symbol.dispose` и `Symbol.asyncDispose` фундаментальны. Пакет полифилит только disposal symbols для рантаймов без них. Node 16+ остаётся нижней границей.                                                       |
| Нет decorator API                                                 | DI на декораторах - это другая библиотека.                                                                                                                                                                                                                        |
| Нет runtime metadata                                              | Сигнатуры конструкторов и явные кортежи `deps` задают граф. Runtime introspection добавил бы зависимости и более слабые режимы отказа.                                                                                                                            |
| Нет номинального различия для одинаковых структурных зависимостей | TypeScript использует структурную совместимость. Если два ключа имеют одну форму, `DepsOf` не знает семантический смысл пользователя. Используйте branded-типы или `unique symbol` keys, когда порядок важен между сервисами одинаковой формы.                    |
| Нет async `get()`                                                 | Текущие проверки циклов и времени жизни используют общее синхронное состояние call stack. Асинхронному resolve API нужен отдельный per-resolve bookkeeping.                                                                                                       |
| Нет детекта циклов между async-фабриками                          | После `await` синхронный resolve stack исчезает, а pending promises могут удовлетворять последующие `c.get()`. Детект добавил бы async tracking в resolve. Разделите цикл, поднимите общую инициализацию или используйте `Lazy<singleton>` там, где это легально. |
| Нет runtime-проверки времени жизни после async-границы            | `AllowedDeps` блокирует неверные типизированные фабрики, но `as`-cast и захваченные внешние контейнеры после `await` выполняются уже после очистки `singletonStack`. Полная защита потребовала бы async-context tracking. Читайте зависимости в синхронной части фабрики. |
| Нет auto-cycle-breaking                                           | Циклы - архитектурные дефекты, если одна сторона не является явным lazy singleton companion. InferDI детектирует поддерживаемые runtime cycles и сообщает о них; он не создаёт proxies или partial instances.                                                     |
| Нет generic `<T>(c: Container<T>) => ...` modules                 | `keyof T` схлопывается до верхней границы `DependenciesMap` внутри generic body. Используйте inline `.use()` lambdas или `Module<TIn, TOut>` с известной input shape.                                                                                             |
| Нет dynamic DI resolver API                                       | `.has(key)` - разрешённая динамическая проверка. Статические ключи должны напрямую использовать `.get()`.                                                                                                                                                         |
| Нет production override story                                     | `.override()` существует для тестов и hot-reload fixtures. Выбор production graph должен жить в `.use()` или обычном коде сборщика.                                                                                                                               |
| Нет каскадного parent-to-child disposal                           | Каждый контейнер владеет своими экземплярами. Каскадный disposal сделал бы `dispose()` нелокальным side effect и сломал бы ownership scope.                                                                                                                       |
| Нет hooks, interceptors или middleware на resolve                 | Это AOP. Оно добавило бы работу в hot path и размыло core contract.                                                                                                                                                                                               |
| Нет framework glue в core                                         | Адаптеры фреймворков должны жить в пакетах адаптеров. Core остаётся dependency-free и framework-agnostic.                                                                                                                                                         |

## 6. Не-цели

InferDI не станет:

- универсальным IoC framework;
- decorator или reflection container;
- системой request context или заменой `AsyncLocalStorage`;
- сканером для auto-wiring;
- хостом плагинов для middleware во время resolve;
- слоем совместимости для legacy DI containers.

Финальное правило: граф - это тип, а тип - это контракт.
