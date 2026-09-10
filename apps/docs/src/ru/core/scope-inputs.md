# Входные данные скоупа

Входные данные скоупа передаёт код, который его создаёт. Это может быть HTTP-запрос, авторизованный пользователь, клиент системы (tenant), данные задания или контекст трассировки. InferDI учитывает эти требования во всём графе и не даёт получить сервис, пока нужные данные не переданы.

## Объявление данных

`declareScopeInputs()` добавляет ключи только в граф типов. Метод не создаёт ни регистраций, ни значений во время выполнения.

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

Входные данные скоупа имеют время жизни `scoped`. Singleton не может зависеть от них. Поэтому для обоих сервисов выше компилятор отклонит явный `singleton` и пропущенный аргумент времени жизни, который по умолчанию тоже означает `singleton`.

## Типизированные профили

`createScope(inputs)` принимает любую часть ещё не предоставленных данных. Тип возвращённого контейнера хранит набор выполненных требований.

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth has not been provided
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

Требования к входным данным распространяются через классы, ленивые обёртки, синхронные фабрики с объявленным списком зависимостей и декларативные асинхронные фабрики.

```ts
const app = root
  .registerFactory(
    'requestId',
    (c) => c.get('request').requestId,
    ['request'],
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

Перегрузка `registerFactory` с аргументом `deps` объявляет связи на уровне типов. Функция фабрики получает контейнер, из которого можно запросить только перечисленные ключи. У `registerAsyncFactory` другой контракт: InferDI сам получает зависимости из кортежа и передаёт готовые значения в аргументы функции.

Из-за этого отличается и порядок аргументов:

```ts
registerFactory(key, factory, deps, lifetime)
registerAsyncFactory(key, factory, deps, lifetime)
```

## Владение вложенными скоупами

Дочерний скоуп наследует входные значения, но создаёт собственные scoped-экземпляры. Входными значениями владеет приложение, контейнер их не освобождает.

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

Объявленные через `await using` ресурсы освобождаются в обратном порядке: сначала дочерний скоуп с дополнительными данными, затем его родитель. Вызов `root.dispose()` не освобождает ни один из них.

## Переиспользуемые контракты типов

`ScopeInputMap` описывает входные данные именованного `Module`. `WithRequirements` добавляет требования к сервису, который предоставляет модуль.

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

Обобщённые вспомогательные функции тоже должны сохранять информацию о готовности:

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

- Объявляйте конечный набор обязательных строковых или символьных ключей. TypeScript отклоняет необязательные и числовые ключи, `__proto__`, широкие индексные сигнатуры и объединения типов с разными наборами ключей.
- Обязательное свойство со значением `undefined` считается переданным. InferDI проверяет наличие свойства, а не результат приведения его значения к `boolean`.
- `createScope(inputs)` поверхностно копирует собственные перечисляемые строковые и символьные свойства объекта. При копировании вызываются геттеры и ловушки Proxy, поэтому передавайте обычный объект с данными.
- Схема существует только в TypeScript. JavaScript, `any` или приведение типа позволяют добавить неизвестный ключ или перекрыть регистрацию в кэше дочернего контейнера.
- `{fast: true}` поддерживает уточнение входных данных, но сохраняет правило фиксированного графа: завершите регистрацию до первого `.get()` или `.createScope()`.

Правила владения описаны в разделе [Скоупы и освобождение ресурсов](./scopes), а асинхронные сервисы с входными данными скоупа - в [Асинхронных зависимостях](./async-dependencies).

## Проверка компилятором

После передачи входного значения тот же граф получает другой набор готовых ключей:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Handler {
  constructor(readonly request: RequestContext) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('handler', Handler, ['request'], 'scoped')

root.get('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
const handler = scope.get('handler')
//    ^?
```
