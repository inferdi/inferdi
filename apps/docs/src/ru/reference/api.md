# Справочник API

Эта страница кратко описывает публичный API core. Точные generic definitions смотрите в README пакета и TypeScript declarations.

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

`fast` по умолчанию равен `false`: runtime-проверки включены, а scope сохраняют
точную mutable parent chain. `{fast: true}` отключает эти проверки и считает
граф фиксированным, включая flattened parent lookup и mirroring унаследованных
singleton. Дочерние scope наследуют конфигурацию root.

## Методы регистрации

| Метод | Вход callback | Тип в графе | Разрешение |
| --- | --- | --- | --- |
| `registerClass` | Аргументы конструктора из `deps` | `Spec` или распространённый `AsyncSpec` | `get` или `getAsync` |
| `registerFactory(key, factory, ...)` | Контейнер, отфильтрованный по lifetime | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | Resolver только для `deps` | `Spec` с требованиями inputs | `get` |
| `registerAsyncFactory` | Разрешённые позиционные значения | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | Нет | Внешний singleton `Spec` | `get` |

`registerClass` и `registerFactory` принимают lifetimes `singleton`, `scoped` и `transient`. Для companion у `registerFactory` lifetime указывается явно, включая `'singleton'`. `registerValue` всегда создаёт singleton, которым владеет внешний код.

`registerAsyncFactory` принимает те же lifetimes и опциональный пятый `lazyKey`. Основная запись хранит итоговый тип как `AsyncSpec`, companion имеет тип `AsyncLazySpec<Awaited<ReturnType>, L>`. Цель разрешается через `getAsync()`, wrapper — через `get()`.

`registerAsyncFactory` и вызовы `registerClass`, чей кортеж может выбрать async-ключ, требуют readonly-кортеж зависимостей. InferDI один раз классифицирует async-позиции и сохраняет ссылку на кортеж. Литералы автоматически выводятся как readonly; sync-only вызовы `registerClass` сохраняют поддержку изменяемых кортежей.

У `registerAsyncFactory` и deps-aware `registerFactory` разный порядок аргументов и контракт callback:

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` заменяет существующую регистрацию, а `use` применяет module builder. Проверка `override` смотрит только в кеш текущего контейнера. Она обнаруживает локально закешированные singleton/scoped-значения, `registerValue` и повторные overrides, но не отслеживает transient-resolve и значения предка, разрешённые через дочерний контейнер. Применяйте overrides до разрешения графа зависимостей.

## Scope inputs и разрешение

`declareScopeInputs<Inputs>()` добавляет type-only scoped-записи. `createScope(inputs)` предоставляет любое подмножество недостающих значений и возвращает контейнер, набор готовых ключей которого отражает переданные обязательные свойства. Input values остаются во владении приложения.

| API | Допустимые ключи |
| --- | --- |
| `get()` | Готовые ключи без `AsyncSpec` |
| `getAsync()` | Все готовые sync- и декларативные async-ключи |
| `has()` | Любой string или symbol; доказывает только наличие регистрации |

`has()` не доказывает готовность или синхронность ключа. Type-state refinement описан в разделе [Входные данные скоупа](../core/scope-inputs), а Promise-поведение — в [Асинхронных зависимостях](../core/async-dependencies).

## Типы namespace

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
| `Container.ReadyKeys<C>` | Извлекает ключи, для которых предоставлены scope inputs; generic resolver может передать их в `getAsync`. |
| `Container.SyncReadyKeys<C>` | Извлекает готовые не-async ключи, которые generic resolver может передать в `get`. |
| `Container.Resolve<C>` | Извлекает плоскую карту `{ key: Value }` из собранного контейнера. |
| `Container.ResolveUnwrapped<C>` | Как `Resolve`, но distributive-разворачивает управляемые `LazySpec` и `AsyncLazySpec`; обычные wrapper-сервисы не меняются. |
| `Container.UnwrappedValue<C, K>` | Находит один развёрнутый тип сервиса. |
| `Container.Providers<C>` | Карта provider-thunks для тестов. |

Generic resolver в v6 должен сохранять допустимый набор ключей. Для `get()` используйте `Container.SyncReadyKeys<C>`, а для `getAsync()` — `Container.ReadyKeys<C>` вместо неограниченного `keyof T`.

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

`LazySpec` и `AsyncLazySpec` содержат private type-only discriminant. Для
управляемых companion в явных `Container` и `Module` shapes используйте эти
именованные типы. Runtime-поля для discriminant нет, экспортировать его нельзя.

`ScopeInputMap<M>` преобразует обязательные конечные string- и symbol-свойства в scoped inputs. Тип отклоняет optional- и numeric-ключи, `__proto__`, широкие index signatures и union-типы с разными наборами ключей. `WithRequirements<S, K>` переносит обязательные input keys на выход именованного модуля. Точные conditional definitions находятся в опубликованных TypeScript declarations.

## Форма API адаптеров

Каждый адаптер экспортирует:

- функцию интеграции, например `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- структурные `InferdiScope`, `InferdiRoot`, `InferdiScopeOf`
- типы опций и helper types для конкретного фреймворка

Фреймворк-специфичные generics и детали жизненного цикла описаны на страницах адаптеров.
