---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/reference/migration#breadcrumb"
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
          "name": "Миграция"
          "item": "https://inferdi.com/ru/reference/migration"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/reference/migration#article"
      "headline": "Руководство по миграции InferDI"
      "name": "Миграция"
      "description": "Breaking changes по major versions и текущий путь миграции на InferDI 5.0, повторяющий packages/inferdi/MIGRATION.md как источник истины."
      "url": "https://inferdi.com/ru/reference/migration"
      "mainEntityOfPage": "https://inferdi.com/ru/reference/migration"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, миграция, breaking changes, обновление, 5.0, major version, внедрение зависимостей"
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

# Миграция

InferDI документирует breaking changes по major versions. Источник истины остаётся в [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md), а текущий путь миграции собран здесь.

## Переход на 5.0

v5 - это релиз адаптеров. Основной пакет не менялся. Повышение версии нужно, чтобы все опубликованные пакеты остались в синхронных версиях, а адаптеры фреймворков использовали общий контракт очистки.

Общие контракты адаптеров:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose` и `onDisposeError` используют одинаковые термины.
- `MaybePromise`, `InferdiScope`, `InferdiRoot` и `InferdiScopeOf` экспортируются во всех адаптерах.
- Если `setupScope` падает, адаптер поднимает только исходную ошибку setup.
- Ошибки очистки во время setup teardown идут в `onDisposeError` или приёмник адаптера.
- Упавший запрос очищает scope даже после `skipInferdiDispose`, кроме документированного ограничения Express.
- Cleanup hooks видят публичный слот scope, пока выполняются.

### Заметки по адаптерам

| Пакет                     | Что изменилось                                                                                                                                                                                         |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | `logDisposeError` переименован в `onDisposeError`; `InferdiScope.dispose()` может вернуть `void` или `Promise<void>`; добавлены `disposeScope`, `autoDispose`, `skipInferdiDispose`, `InferdiScopeOf`. |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)    | Ошибки очистки после `next()` логируются или идут в `onDisposeError`; они больше не заменяют успешный ответ. Setup teardown больше не бросает `AggregateError`.                                        |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` теперь per-error-приёмник для setup teardown и завершения response. Express не может принудительно очистить scope с пропущенной автоочисткой при обработанной ошибке маршрута.        |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)     | Setup teardown поднимает только ошибку setup. Downstream-ошибка очищает scope даже после `skipInferdiDispose(ctx)`.                                                                                    |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)  | Setup teardown поднимает только ошибку setup. Ошибка очистки идёт в `onDisposeError` или `console.error`.                                                                                              |

## Переход на 4.0

v4 ужесточает семантику времени жизни `Lazy<T>`. Managed lazy companion теперь сохраняет время жизни цели. Singleton может инжектить только `Lazy<singleton>`.

Главные изменения:

- `AllowedDeps<T, 'singleton'>` больше не принимает произвольный `Lazy<V>`.
- `LazySpec<V, TargetKind>` стал публичным типом для явных форм контейнера и модуля.
- Runtime-исключение для lazy применяется только когда target kind равен `singleton`.
- Singleton, который инжектил `Lazy<scoped>` или `Lazy<transient>`, должен изменить время жизни цели или потребителя.

Типовые исправления:

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: делаем потребителя scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## Переход на 3.0

v3 переносит безопасность времени жизни в систему типов. Runtime behavior остаётся совместимым, а runtime-защита в strict mode остаётся вторым рубежом.

Главные изменения:

- Записи `DependenciesMap` стали `Spec<V, Kind>` вместо голых типов сервисов.
- `RegistrationKind`, `Spec<V, K>` и `SpecMap<M, K>` стали публичными экспортами.
- `registerFactory` сужает параметр `c` для singleton-фабрик.
- `registerClass` фильтрует `deps` для singleton-регистраций.
- `override(key, value)` сохраняет исходный вид времени жизни.
- `new Container({ strict: false })` может отключить runtime-проверки циклов и времени жизни после аудита графа.

Типовые исправления:

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## Переход на 2.0

В v2 есть два механических breaking changes.

### `container.cradle` удалён

Используйте `.get(key)`:

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` стал `lazyKey`

Передавайте companion-ключ:

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

v2 также добавил string- и symbol-ключи во все методы регистрации и уточнил диагностику очищенного предка.

## Версии в lockstep

Все опубликованные пакеты InferDI имеют одну версию:

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)

При обновлении адаптеров держите пакет адаптера и [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) на совпадающих major-версиях.

## Чеклист обновления

1. Прочитать заметки о миграции для всех major-версий, через которые проходите.
2. Обновить [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) и все установленные адаптеры вместе.
3. Запустить type tests или `tsc --noEmit`, чтобы поймать изменения формы графа.
4. Запустить runtime tests в strict mode.
5. Проверить владение scope запроса, если используются `skipInferdiDispose`, `autoDispose: false` или пользовательский `disposeScope`.

## Стабильные границы

Основной пакет остаётся без декораторов и runtime-зависимостей. Поведение жизненного цикла фреймворков живёт в пакетах адаптеров, а не в [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
