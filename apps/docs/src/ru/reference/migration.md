# Миграция

Несовместимые изменения InferDI описаны отдельно для каждой основной версии. Полный список находится в [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md); здесь собраны инструкции по переходу.

## Переход на 6.0

Этот раздел описывает переход со стабильной `5.0.7`. Обновите все установленные
пакеты `@inferdi/*` до `6.0.0`: адаптеры требуют
`@inferdi/inferdi@^6.0.0`.

- Замените `RegistrationKind` на `Lifetime`, а `Spec.kind` на `Spec.lifetime`. Псевдонимы старых имён не сохранены.
- В стабильной v5 у `registerFactory` не было перегрузки с объявленными зависимостями. V6 добавляет `registerFactory(key, factory, deps, ...)`. Порядок аргументов нужно менять только тем, кто использовал предварительную версию с формой `registerFactory(key, deps, factory, ...)`. Для ленивой обёртки синхронной фабрики время жизни указывается явно, включая `singleton`.
- Замените `{strict: false}` из v5 на `{fast: true}`, а `{strict: true}` на значение по умолчанию или `{fast: false}`. Смысл логического флага обратный. Опция `mode` из предварительных версий удалена.
- Именованный `Module<TRequirements, TProvides>` принимает граф с дополнительными регистрациями и сохраняет их. Требования проверяются точно, добавляемые ключи не должны пересекаться с существующими. Конструктор `new Container(parent)` больше не входит в публичный API; используйте `createScope()`.
- Регистрация отклоняет любой тип ключа, который может пересечься с существующим основным ключом или ключом ленивой обёртки. Сузьте широкий тип или объединение до заведомо нового значения. Для намеренной подмены используйте `.override()`.
- В V6 входные данные скоупа объявляются только в типах через `declareScopeInputs<Inputs>()`, а передаются через `createScope(inputs)`. Вызов без аргументов сохраняет поведение v5.
- V6 добавляет `registerAsyncFactory`, `AsyncSpec` и `getAsync()` для декларативных асинхронных зависимостей. Фабрика `registerFactory`, возвращающая Promise, остаётся синхронной записью графа и доступна через `get()`.
- При асинхронном освобождении ресурсов один и тот же объект ошибки сообщается один раз, даже если он прошёл через несколько закэшированных Promise. Синхронное освобождение подписывается на отклонение нативного Promise до того, как сообщить об ошибочном использовании асинхронного ресурса.

### Обобщённые функции используют готовые ключи {#generic-resolver-использует-готовые-ключи}

`.get()` теперь принимает готовые синхронные ключи, для которых предоставлены входные данные скоупа. У конкретных контейнеров без входных данных скоупа набор синхронных ключей не меняется. Обобщённые вспомогательные функции с `K extends keyof T` должны учитывать готовность и асинхронность.

```ts
// Before
function resolve<T extends DependenciesMap, K extends keyof T>(
  container: Container<T>,
  key: K
) {
  return container.get(key)
}

// After
function resolve<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}
```

Для обобщённой функции, вызывающей `getAsync()`, используйте `Container.ReadyKeys<Container<T>>`. Параметр типа `T extends DependenciesMap` может включать декларативные асинхронные записи или сервисы, которым ещё не переданы входные данные скоупа.

### Именованные типы ленивых обёрток {#именованные-specs-для-lazy-companion}

В `LazySpec` появился закрытый маркер режима, существующий только в системе типов; v6 также добавляет `AsyncLazySpec`. В явных описаниях `Container` и `Module` используйте эти экспортируемые типы вместо структуры `{type, lifetime, lazyOf}`. Маркер не создаёт поля во время выполнения.

Пятый аргумент `lazyKey` у `registerAsyncFactory` создаёт `AsyncLazy<T>`. Асинхронный класс использует такую же обёртку. Если ключ зависимости допускает синхронный или асинхронный сервис, класс получает `Lazy<T> | AsyncLazy<T>`. Фабрика `registerFactory`, возвращающая Promise, сохраняет `Lazy<Promise<T>>`. Тип `Container.ResolveUnwrapped` разворачивает все управляемые варианты, в том числе каждый вариант объединения.

Новые наборы ключей описаны в [Справочнике API](./api), [Входных данных скоупа](../core/scope-inputs) и [Асинхронных зависимостях](../core/async-dependencies).

## Переход на 5.0

Первый релиз v5 затрагивал только адаптеры. Повышение версии нужно, чтобы все опубликованные пакеты остались на одной версии, а адаптеры фреймворков использовали общий контракт очистки. Более поздние сборки v5 также закрепляют владение через дочерний скоуп и ужесточают описанный ниже контракт `{fast: true}`.

Общие контракты адаптеров:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose` и `onDisposeError` используют одинаковые термины.
- `MaybePromise`, `InferdiScope`, `InferdiRoot` и `InferdiScopeOf` экспортируются во всех адаптерах.
- Если `setupScope` падает, адаптер передаёт дальше только исходную ошибку настройки.
- Ошибки очистки при освобождении скоупа после ошибки настройки идут в `onDisposeError` или стандартный обработчик адаптера.
- Упавший запрос освобождает скоуп даже после `skipInferdiDispose`, кроме документированного ограничения Express.
- Хуки очистки видят публичное поле скоупа, пока выполняются.

### Получайте scoped-сервисы из дочернего скоупа {#scoped-разрешение-требует-дочернии-scope}

При `{fast: false}` (по умолчанию) получение scoped-сервиса из корневого контейнера теперь выбрасывает `Scoped "key" cannot be resolved from the root container. Use createScope().` Создайте дочерний контейнер через `const scope = root.createScope()`, вызовите `scope.get(scopedKey)` и освободите скоуп на его границе жизненного цикла. `{fast: true}` отключает эту проверку во время выполнения, но scoped-сервисы всё равно следует получать из дочерних скоупов.

### Контракт фиксированного графа `fast: true`

При `new Container({fast: true})` скоуп обращается напрямую к неизменяемому корневому реестру, пропуская цепочку родителей. Singleton-значения, полученные у предка, также сохраняются в кэше скоупа. В проверяемом режиме локальный промах каждый раз запускает поиск по точной цепочке родителей. Снимки результатов поиска не хранятся, поэтому изменения видны без инвалидации и дополнительных метаданных в скоупах. В обоих режимах повторяющиеся ссылки на принадлежащие контейнеру экземпляры удаляются при освобождении ресурсов. Регистрируйте каждый ключ один раз в одной последовательной цепочке вызовов. Завершите регистрацию до первого получения сервиса или создания скоупа, не меняйте активированное дерево и освобождайте дочерние скоупы раньше предков. Для горячей перезагрузки и деревьев, меняющихся после активации, используйте `{fast: false}`.

### Заметки по адаптерам

| Пакет                     | Что изменилось                                                                                                                                                                                         |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | `logDisposeError` переименован в `onDisposeError`; `InferdiScope.dispose()` может вернуть `void` или `Promise<void>`; добавлены `disposeScope`, `autoDispose`, `skipInferdiDispose`, `InferdiScopeOf`. |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)    | Ошибки очистки после `next()` логируются или идут в `onDisposeError`; они больше не заменяют успешный ответ. Освобождение скоупа после ошибки настройки больше не выбрасывает `AggregateError`.                                        |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` теперь обработчик каждой ошибки очистки после сбоя настройки или завершения ответа. Express не может принудительно очистить скоупы с пропущенной автоочисткой при обработанной ошибке маршрута.        |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)     | При сбое настройки передаётся только исходная ошибка. При ошибке последующего обработчика адаптер освобождает скоуп даже после `skipInferdiDispose(ctx)`.                                                                                    |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)  | При сбое настройки передаётся только исходная ошибка. Ошибка очистки идёт в `onDisposeError` или `console.error`.                                                                                              |

## Переход на 4.0

v4 ужесточает семантику времени жизни `Lazy<T>`. Управляемая ленивая обёртка теперь сохраняет время жизни цели. Singleton может получать только `Lazy<singleton>`.

Главные изменения:

- `AllowedDeps<T, 'singleton'>` больше не принимает произвольный `Lazy<V>`.
- `LazySpec<V, TargetKind>` стал публичным типом для явных форм контейнера и модуля.
- Исключение из проверки времени жизни для ленивой обёртки действует только при времени жизни цели `singleton`.
- Singleton, который получал `Lazy<scoped>` или `Lazy<transient>`, должен изменить время жизни цели или потребителя.

Типовые исправления:

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
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

v3 переносит проверки времени жизни в систему типов. Поведение во время выполнения остаётся совместимым, а проверки режима по умолчанию продолжают служить дополнительной защитой.

Главные изменения:

- Записи `DependenciesMap` стали `Spec<V, Kind>` вместо голых типов сервисов.
- `RegistrationKind`, `Spec<V, K>` и `SpecMap<M, K>` стали публичными экспортами.
- `registerFactory` сужает параметр `c` для singleton-фабрик.
- `registerClass` фильтрует `deps` для singleton-регистраций.
- `override(key, value)` сохраняет исходный вид времени жизни.
- `new Container({fast: true})` может отключить проверки циклов и времени жизни во время выполнения после аудита графа.

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

В v2 два несовместимых изменения, которые требуют простых замен в коде.

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

Передавайте ключ ленивой обёртки:

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

v2 также добавил строковые и символьные ключи во все методы регистрации и уточнил диагностику очищенного предка.

## Единая версия пакетов {#версии-в-lockstep}

Все опубликованные пакеты InferDI имеют одну версию:

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)
- [`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react)

При обновлении адаптеров держите пакет адаптера и [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) на совпадающих основных версиях.

## Чеклист обновления

1. Прочитать заметки о миграции для всех основных версий, через которые проходите.
2. Обновить [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) и все установленные адаптеры вместе.
3. Запустить тесты типов или `tsc --noEmit`, чтобы поймать изменения формы графа.
4. Запустить тесты поведения во время выполнения с проверяемым контрактом по умолчанию.
5. Проверить владение скоупом запроса, если используются `skipInferdiDispose`, `autoDispose: false` или пользовательский `disposeScope`.

## Стабильные границы

Основной пакет остаётся без декораторов и зависимостей времени выполнения. Поведение жизненного цикла фреймворков живёт в пакетах адаптеров, а не в [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
