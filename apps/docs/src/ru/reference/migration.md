# Миграция

InferDI документирует breaking changes по major versions. Источник истины остаётся в [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md), а текущий путь миграции собран здесь.

## Переход на 6.0

- Замените `RegistrationKind` на `Lifetime`, а `Spec.kind` на `Spec.lifetime`; deprecated alias не оставлен.
- Перенесите deps у sync-фабрик: `registerFactory(key, deps, factory, ...)` → `registerFactory(key, factory, deps, ...)`. Companion требует явный lifetime, включая `'singleton'`.
- Замените прежнюю опцию отключения runtime-проверок на `{fast: true}`. Prerelease-опция `mode` удалена. По умолчанию `fast: false`: runtime-проверки включены, а граф остаётся mutable; `fast: true` выбирает unchecked fixed contract.
- Именованный `Module<TRequirements, TProvides>` принимает actual graph с дополнительными регистрациями, сохраняет их, точно проверяет requirements и запрещает collisions outputs. `new Container(parent)` больше не public; используйте `createScope()`.
- Регистрация теперь отклоняет любой тип ключа, который может пересечься с существующим основным или lazy-ключом. Сузьте broad- или union-ключ до нового значения либо используйте `.override()` для намеренной замены.
- Async teardown сообщает общий объект rejection один раз, если ошибка зависимости прошла через несколько закешированных Promise. Sync teardown наблюдает rejection нативного Promise до выброса ошибки об async-использовании.

### Generic resolver использует готовые ключи

`.get()` теперь принимает готовые синхронные ключи, для которых предоставлены scope inputs. У конкретных контейнеров без scope inputs набор синхронных ключей не меняется. Generic helpers с `K extends keyof T` должны учитывать готовность и async status.

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

Для generic helper с `getAsync()` используйте `Container.ReadyKeys<Container<T>>`. Generic `T extends DependenciesMap` может содержать декларативные async-записи или сервисы, заблокированные недостающими scope inputs.

### Именованные specs для lazy companion

`LazySpec` теперь содержит private type-only mode brand; v6 также добавляет
`AsyncLazySpec`. В явных `Container` и `Module` shapes используйте эти
именованные exports вместо структурного `{type, lifetime, lazyOf}`. Runtime-поля у
brand нет.

Пятый `lazyKey` у `registerAsyncFactory` создаёт `AsyncLazy<T>`. Async-класс
использует тот же wrapper, mixed sync/async класс возвращает
`Lazy<T> | AsyncLazy<T>`. Promise-valued `registerFactory` сохраняет
`Lazy<Promise<T>>`. `Container.ResolveUnwrapped` distributive-разворачивает все
управляемые варианты.

Новые наборы ключей описаны в [Справочнике API](./api), [Входных данных скоупа](../core/scope-inputs) и [Асинхронных зависимостях](../core/async-dependencies).

## Переход на 5.0

Первый релиз v5 затрагивал только адаптеры. Повышение версии нужно, чтобы все опубликованные пакеты остались в синхронных версиях, а адаптеры фреймворков использовали общий контракт очистки. Более поздние сборки v5 также закрепляют владение через дочерний scope и ужесточают описанный ниже контракт `{fast: true}`.

Общие контракты адаптеров:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose` и `onDisposeError` используют одинаковые термины.
- `MaybePromise`, `InferdiScope`, `InferdiRoot` и `InferdiScopeOf` экспортируются во всех адаптерах.
- Если `setupScope` падает, адаптер поднимает только исходную ошибку setup.
- Ошибки очистки во время setup teardown идут в `onDisposeError` или приёмник адаптера.
- Упавший запрос очищает scope даже после `skipInferdiDispose`, кроме документированного ограничения Express.
- Cleanup hooks видят публичный слот scope, пока выполняются.

### Scoped-разрешение требует дочерний scope

При `{fast: false}` (по умолчанию) resolve scoped-ключа из root теперь выбрасывает `Scoped "key" cannot be resolved from the root container. Use createScope().` Создайте дочерний контейнер через `const scope = root.createScope()`, вызовите `scope.get(scopedKey)` и освободите scope на его границе жизненного цикла. `{fast: true}` отключает эту runtime-проверку, но scoped-сервисы всё равно следует получать из дочерних scope.

### Контракт фиксированного графа `fast: true`

`new Container({fast: true})` читает неизменяемый root registry
напрямую из scope, избегает прохода по родителям, а delegated singleton
зеркалирует в cache scope. Strict scope при каждом локальном промахе проходит
точную цепочку родителей вместо хранения снимков lookup, поэтому мутации видны
без инвалидации и метаданных на каждом scope. Дедупликация owned-инстансов
выполняется во время disposal в обоих режимах. Регистрируйте каждый runtime-ключ
один раз в одной линейной fluent-цепочке, завершите регистрацию до первого
resolve или создания scope, не меняйте активированное дерево и закрывайте
дочерние scope раньше предков. Для hot reload и любого дерева, которое меняется
после активации, используйте `{fast: false}`.

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

v3 переносит безопасность времени жизни в систему типов. Runtime behavior остаётся совместимым, а default runtime-защита остаётся вторым рубежом.

Главные изменения:

- Записи `DependenciesMap` стали `Spec<V, Kind>` вместо голых типов сервисов.
- `RegistrationKind`, `Spec<V, K>` и `SpecMap<M, K>` стали публичными экспортами.
- `registerFactory` сужает параметр `c` для singleton-фабрик.
- `registerClass` фильтрует `deps` для singleton-регистраций.
- `override(key, value)` сохраняет исходный вид времени жизни.
- `new Container({fast: true})` может отключить runtime-проверки циклов и времени жизни после аудита графа.

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
4. Запустить runtime tests с default checked contract.
5. Проверить владение scope запроса, если используются `skipInferdiDispose`, `autoDispose: false` или пользовательский `disposeScope`.

## Стабильные границы

Основной пакет остаётся без декораторов и runtime-зависимостей. Поведение жизненного цикла фреймворков живёт в пакетах адаптеров, а не в [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
