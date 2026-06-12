# Справочник API

Эта страница кратко описывает публичный API core. Точные generic definitions смотрите в README пакета и TypeScript declarations.

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type LazySpec,
  type Module,
  type RegistrationKind,
  type Spec,
  type SpecMap,
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
  has(key)

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Методы регистрации

| Метод | Назначение |
| --- | --- |
| `registerClass` | Регистрирует конструктор и кортеж зависимостей. |
| `registerFactory` | Регистрирует пользовательскую логику создания. |
| `registerValue` | Регистрирует singleton-значение, которым владеет внешний код. |
| `override` | Заменяет существующую регистрацию до первого resolve. |
| `use` | Применяет сборщик модуля. |

`registerClass` и `registerFactory` принимают виды времени жизни `singleton`, `scoped` и `transient`. `registerValue` всегда создаёт singleton, которым владеет внешний код.

## Типы namespace

```ts
namespace Container {
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Тип | Назначение |
| --- | --- |
| `Container.Resolve<C>` | Извлекает плоскую карту `{ key: Value }` из собранного контейнера. |
| `Container.ResolveUnwrapped<C>` | Как `Resolve`, но разворачивает записи `Lazy<T>` в `T`. |
| `Container.UnwrappedValue<C, K>` | Находит один развёрнутый тип сервиса. |
| `Container.Providers<C>` | Карта provider-thunks для тестов. |

## Публичные типы

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

## Форма API адаптеров

Каждый адаптер экспортирует:

- функцию интеграции, например `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- структурные `InferdiScope`, `InferdiRoot`, `InferdiScopeOf`
- типы опций и helper types для конкретного фреймворка

Фреймворк-специфичные generics и детали жизненного цикла описаны на страницах адаптеров.
