---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/scope-inputs#breadcrumb"
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
          "name": "Данные и профили скоупа"
          "item": "https://inferdi.com/ru/core/scope-inputs"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/scope-inputs#article"
      "headline": "Данные и профили скоупа в InferDI"
      "name": "Данные и профили скоупа"
      "description": "Объявляйте данные скоупа, создавайте типизированные профили и не разрешайте сервисы, пока для них не предоставлены все значения."
      "url": "https://inferdi.com/ru/core/scope-inputs"
      "mainEntityOfPage": "https://inferdi.com/ru/core/scope-inputs"
      "inLanguage": "ru-RU"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, данные скоупа, профили скоупа, declareScopeInputs, createScope, ReadyKeys, внедрение зависимостей TypeScript"
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

# Данные и профили скоупа

Данные скоупа передаёт код, который открывает скоуп: HTTP-запрос, авторизованный пользователь, tenant, payload задания или trace context. InferDI проводит эти требования через граф и не даёт разрешить сервис, пока нужные данные не предоставлены.

## Объявление данных

`declareScopeInputs()` добавляет ключи только в граф типов. Метод не создаёт runtime-регистрации и значения.

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

Данные скоупа имеют время жизни `scoped`. Singleton не может зависеть от них, поэтому компилятор отклонит пропущенный или явно указанный `singleton` kind у этих сервисов.

## Типизированные профили

`createScope(inputs)` принимает любую часть ещё не предоставленных данных. Тип возвращённого контейнера хранит набор готовых требований.

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth ещё не предоставлен
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

Дайте профилям приложения имена с помощью обычных функций. TypeScript выведет точный набор готовых ключей без ручных аннотаций контейнера.

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

Открывайте профиль на границе запроса, сообщения или задания. Не добавляйте объекты фреймворка в корневой граф.

## Распространение требований

InferDI проводит требования через классы, lazy companion, deps-aware sync-фабрики и декларативные async-фабрики.

```ts
const app = root
  .registerFactory(
    'requestId',
    ['request'],
    (c) => c.get('request').requestId,
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

Кортеж зависимостей в deps-aware overload метода `registerFactory` объявляет рёбра на уровне типов и ограничивает resolver доступными ключами. В runtime фабрика получает этот resolver. У `registerAsyncFactory` другой контракт: InferDI разрешает кортеж и передаёт в callback позиционные значения.

Из-за этого отличается и порядок аргументов:

```ts
registerFactory(key, deps, factory, kind)
registerAsyncFactory(key, factory, deps, kind)
```

## Владение вложенными скоупами

Дочерний скоуп наследует входные значения, но создаёт собственные scoped-инстансы. Входными значениями владеет приложение, контейнер их не освобождает.

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript освобождает эти переменные в обратном порядке: сначала уточнённый дочерний скоуп, затем его родитель. Вызов `root.dispose()` не закрывает ни один из них.

## Переиспользуемые контракты типов

`ScopeInputMap` описывает входы именованного `Module`. `WithRequirements` прикрепляет требования к выходному сервису модуля.

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

Generic helpers тоже должны сохранять информацию о готовности:

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## Контракт входных данных

- В объявлении допустимы только обязательные конечные string- и symbol-ключи. TypeScript отклоняет optional- и numeric-ключи, `__proto__`, широкие index signatures и union-типы с разными наборами ключей.
- Обязательное свойство со значением `undefined` считается предоставленным. InferDI проверяет наличие свойства, а не truthiness.
- `createScope(inputs)` делает неглубокий снимок собственных enumerable string- и symbol-свойств. При копировании выполняются getters и Proxy traps, поэтому передавайте обычный объект с данными.
- Схема существует только в TypeScript. JavaScript, `any` или cast могут добавить неизвестный ключ либо перекрыть регистрацию в кеше дочернего контейнера.
- Fast Mode поддерживает уточнение inputs, но сохраняет правило неизменяемого графа: завершите регистрацию до первого `.get()` или `.createScope()`.

Правила владения описаны в разделе [Скоупы и очистка](./scopes), а async-сервисы с входными данными скоупа — в [Асинхронном графе зависимостей](./async-dependency-graph).
