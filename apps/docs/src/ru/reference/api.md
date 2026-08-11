---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/reference/api#breadcrumb"
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
          "name": "Справочник API"
          "item": "https://inferdi.com/ru/reference/api"
    - "@type": "APIReference"
      "@id": "https://inferdi.com/ru/reference/api#article"
      "headline": "Краткий справочник по API ядра InferDI"
      "name": "Справочник API"
      "description": "Справочник по API ядра @inferdi/inferdi, включая registerAsyncFactory, getAsync, AsyncSpec, scopes, overrides и disposal."
      "url": "https://inferdi.com/ru/reference/api"
      "mainEntityOfPage": "https://inferdi.com/ru/reference/api"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "Явная регистрация, текучий builder"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, scope, dispose"
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
  type AsyncSpec,
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
  registerFactory(key, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
  getAsync(key): Promise
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
| `registerAsyncFactory` | Регистрирует позиционные зависимости декларативного async-графа. |
| `registerValue` | Регистрирует singleton-значение, которым владеет внешний код. |
| `override` | Заменяет существующую регистрацию; отклоняет ключ, уже находящийся в локальном кеше. |
| `use` | Применяет сборщик модуля. |

`registerClass` и `registerFactory` принимают виды времени жизни `singleton`, `scoped` и `transient`, а также опциональный companion `lazyKey`. `registerValue` всегда создаёт singleton, которым владеет внешний код.

`registerAsyncFactory` принимает те же lifetimes без `lazyKey`. Итоговый тип сервиса хранится как `AsyncSpec`, а зависимые классы наследуют async status. Разрешайте такие ключи через `getAsync()`. Метод `get()` остаётся для sync-ключей, включая Promise-valued сервисы из `registerFactory`.

`registerAsyncFactory` и вызовы `registerClass`, чей кортеж может выбрать async-ключ, требуют readonly-кортеж зависимостей. InferDI один раз классифицирует async-позиции и сохраняет ссылку на кортеж. Литералы автоматически выводятся как readonly; sync-only вызовы `registerClass` сохраняют поддержку изменяемых кортежей.

Проверка времени вызова `override` смотрит только в кеш текущего контейнера. Она обнаруживает локально закешированные singleton/scoped-значения, `registerValue` и повторные overrides, но не отслеживает transient-resolve и значения предка, разрешённые через дочерний контейнер. Применяйте overrides до разрешения графа зависимостей.

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
| `Container.ResolveUnwrapped<C>` | Как `Resolve`, но разворачивает в `T` только управляемые записи-компаньоны `LazySpec`; обычные сервисы с методом `.get()` не меняются. |
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

interface AsyncSpec<V, K extends RegistrationKind = 'singleton'>
  extends Spec<V, K> {
  readonly async: true
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
