# Справочник API

Здесь кратко описан публичный API ядра. Полные определения обобщённых типов приведены в README пакета и опубликованных декларациях TypeScript.

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Опции контейнера

Конструктор принимает одну необязательную настройку:

| Опция | Тип | По умолчанию | Назначение |
| --- | --- | --- | --- |
| `fast` | `boolean` | `false` | Выбирает между проверяемым изменяемым контрактом и непроверяемым контрактом фиксированного графа |

```ts
const checked = new Container()
const explicitChecked = new Container({ fast: false })
const fast = new Container({ fast: true })
```

Вызов без опций и явное `{fast: false}` сохраняют проверки циклов и времени жизни во время выполнения. Они запрещают получение scoped-сервисов из корневого контейнера и при поиске учитывают точную, изменяемую цепочку родителей. Этот контракт подходит для разработки, тестов, горячей перезагрузки и графов, которые меняются после запуска.

Литеральное `{fast: true}` сохраняет проверки TypeScript, но отключает проверки циклов и времени жизни во время выполнения, включая запрет scoped-сервисов в корневом контейнере. Дерево контейнеров должно оставаться фиксированным: скоуп обращается напрямую к владельцу реестра и сохраняет singleton-значения предков в своём локальном кэше. Дочерние скоупы наследуют настройку корневого контейнера.

В дереве с fast-режимом завершите все вызовы `register*`, `.use()` и `.override()` до
первого получения сервиса или `createScope()`, не меняйте дерево после активации и
освобождайте дочерние контейнеры раньше предков. Этот контракт включает только
литеральное значение `true`; другие значения во время выполнения оставляют проверяемый
контракт. В разделе [Производительность](../guide/performance#fast-true)
описано, на какие операции влияет выбор и когда этот компромисс оправдан.

## Методы регистрации

| Метод | Аргумент функции | Тип в графе | Разрешение |
| --- | --- | --- | --- |
| `registerClass` | Аргументы конструктора из `deps` | `Spec` или `AsyncSpec`, если есть асинхронные зависимости | `get` или `getAsync` |
| `registerFactory(key, factory, ...)` | Контейнер, отфильтрованный по времени жизни | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | Контейнер с доступом только к `deps` | `Spec` с требованиями к входным данным | `get` |
| `registerAsyncFactory` | Значения зависимостей по порядку, после ожидания декларативных асинхронных зависимостей | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | Нет | Внешний singleton `Spec` | `get` |

`registerClass`, `registerFactory` и `registerAsyncFactory` поддерживают время жизни `singleton`, `scoped` и `transient`. При добавлении ленивой обёртки через `registerFactory` укажите время жизни явно, даже если это `singleton`. `registerValue` всегда создаёт singleton-регистрацию, значение которой принадлежит внешнему коду.

Параметр `lazyKey` у `registerClass` или `registerFactory` добавляет управляемую ленивую обёртку типа `LazySpec`. Если класс стал асинхронным из-за зависимостей, добавляется `AsyncLazySpec`. Фабрика `registerFactory`, возвращающая Promise, остаётся синхронной записью `Spec<Promise<T>>`, а её обёртка имеет тип `Lazy<Promise<T>>`. Если в графе нужен итоговый тип сервиса, используйте `registerAsyncFactory`.

`registerAsyncFactory` поддерживает те же варианты времени жизни и необязательный пятый аргумент `lazyKey`. Основная запись хранит итоговый тип как `AsyncSpec`, а ленивая обёртка имеет тип `AsyncLazySpec<Awaited<ReturnType>, L>`. Классы, зависящие от самого сервиса, становятся асинхронными. Зависимость от обёртки остаётся синхронной: сервис получают через `getAsync()`, обёртку через `get()`.

`registerAsyncFactory` и вызовы `registerClass`, в которых кортеж допускает асинхронный ключ, требуют неизменяемого кортежа зависимостей (`readonly`). InferDI один раз определяет асинхронные позиции и сохраняет ссылку на кортеж. Для литералов TypeScript автоматически выводит `readonly`. Вызовы `registerClass` только с синхронными зависимостями по-прежнему принимают изменяемые кортежи.

У `registerFactory` с объявленным списком зависимостей и у `registerAsyncFactory` одинаковый порядок аргументов. Но функция синхронной фабрики получает контейнер, ограниченный ключами из `deps`, а функция асинхронной фабрики получает готовые значения зависимостей по порядку:

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` подменяет существующую регистрацию, кроме входных данных скоупа. `use` применяет функцию сборки модуля. Проверка `override` смотрит только в кэш текущего контейнера: она обнаруживает локально закэшированные singleton- и scoped-значения, `registerValue` и повторную подмену, но не отслеживает получение transient-сервисов. В проверяемом режиме она также не видит singleton-значения предка, полученные через дочерний контейнер. В fast-режиме такие значения сохраняются в локальном кэше и попадают под проверку. Выполняйте подмены до первого получения сервисов графа.

## Входные данные скоупа и разрешение {#scope-inputs-и-разрешение}

`declareScopeInputs<Inputs>()` объявляет scoped-записи только на уровне типов. `createScope(inputs)` передаёт любую часть недостающих значений и возвращает контейнер, в котором набор готовых ключей учитывает эти данные. Переданные значения остаются во владении приложения.

| API | Допустимые ключи |
| --- | --- |
| `get()` | Готовые ключи без `AsyncSpec` |
| `getAsync()` | Все готовые синхронные и декларативные асинхронные ключи |
| `has()` | Любой строковый или символьный ключ; доказывает только наличие регистрации |

`has()` не доказывает готовность или синхронность ключа. Объявленные входные данные скоупа существуют только на уровне типов и не являются регистрациями, поэтому `has()` возвращает для них `false` даже после передачи значений в `createScope(inputs)`. Уточнение состояния типов описано в разделе [Входные данные скоупа](../core/scope-inputs), а Promise-поведение - в [Асинхронных зависимостях](../core/async-dependencies).

## Типы пространства имён Container {#типы-namespace}

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Тип | Назначение |
| --- | --- |
| `Container.ReadyKeys<C>` | Извлекает ключи, для которых предоставлены входные данные скоупа; обобщённая функция получения сервисов может передать их в `getAsync`. |
| `Container.SyncReadyKeys<C>` | Извлекает готовые синхронные ключи, которые обобщённая функция получения сервисов может передать в `get`. |
| `Container.Resolve<C>` | Извлекает плоскую карту `{ key: Value }` из собранного контейнера. |
| `Container.ResolveUnwrapped<C>` | Как `Resolve`, но разворачивает управляемые `LazySpec` и `AsyncLazySpec`, включая каждый вариант объединения; обычные сервисы-обёртки не меняются. |
| `Container.UnwrappedValue<C, K>` | Находит один развёрнутый тип сервиса. |
| `Container.Providers<C>` | Набор функций без аргументов, возвращающих сервисы, для тестов; объявленные входные данные скоупа исключены. |

Обобщённая функция получения сервисов в v6 должна сохранять допустимый набор ключей. Для `get()` используйте `Container.SyncReadyKeys<C>`, а для `getAsync()` - `Container.ReadyKeys<C>` вместо неограниченного `keyof T`.

## Публичные типы

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` и `AsyncLazySpec` содержат закрытый признак режима, существующий только в системе типов. В явных описаниях `Container` и `Module` используйте эти именованные типы для управляемых ленивых обёрток. Признак не создаёт поля во время выполнения и не экспортируется.

`Spec`, `AsyncSpec`, `LazySpec` и `AsyncLazySpec` описывают записи графа на уровне типов; их поля не добавляются в разрешённые значения сервисов.

`ScopeInputMap<M>` преобразует конечный набор обязательных строковых и символьных свойств в описание входных данных скоупа. Он отклоняет необязательные и числовые ключи, `__proto__`, широкие индексные сигнатуры и объединения типов с разными наборами ключей. `WithRequirements<S, K>` добавляет к записи графа требования к входным ключам; это удобно для сервисов, возвращаемых именованным модулем. Полные определения условных типов приведены в опубликованных декларациях TypeScript.

## Форма API адаптеров

### HTTP-адаптеры

Fastify, Hono, Koa, Express и Elysia экспортируют:

- функцию интеграции, например `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- структурные `InferdiScope`, `InferdiRoot`, `InferdiScopeOf`
- типы опций и вспомогательные типы для конкретного фреймворка

### React-адаптер

React экспортирует `inferdiReact` и типы привязок контейнера, внешнего `Provider`, управляемого `ScopeProvider`, хуков сервисов, извлечения графа, стабильных синхронных и асинхронных ключей, а также опций жизненного цикла скоупа. `skipInferdiDispose` у этого адаптера нет: скоупы компонентов создаются после фиксации изменений и освобождаются при очистке эффектов React.

Точные имена и детали жизненного цикла описаны на страницах адаптеров.
