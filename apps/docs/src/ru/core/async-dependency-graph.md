---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/async-dependency-graph#breadcrumb"
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
          "name": "Асинхронный граф зависимостей"
          "item": "https://inferdi.com/ru/core/async-dependency-graph"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/async-dependency-graph#article"
      "headline": "Декларативные асинхронные графы зависимостей в InferDI"
      "name": "Асинхронный граф зависимостей"
      "description": "Создавайте типизированные асинхронные графы через registerAsyncFactory и getAsync с single-flight кешем, изоляцией скоупов и явной очисткой."
      "url": "https://inferdi.com/ru/core/async-dependency-graph"
      "mainEntityOfPage": "https://inferdi.com/ru/core/async-dependency-graph"
      "inLanguage": "ru-RU"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, асинхронный граф зависимостей, registerAsyncFactory, getAsync, AsyncSpec, single-flight, внедрение зависимостей TypeScript"
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

# Асинхронный граф зависимостей

`registerAsyncFactory` записывает явное async-ребро. В графе хранится итоговый тип сервиса, InferDI ожидает объявленные async-зависимости и распространяет async-статус на зависимые классы.

## Выбор Promise-модели

InferDI поддерживает два контракта: Promise может быть самим сервисом или границей его инициализации.

| API | Значение в графе | Внедрение | Разрешение |
| --- | --- | --- | --- |
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | Объект Promise по identity | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` в `AsyncSpec` | Выполненный `Database` | `getAsync()` |

Используйте `registerAsyncFactory`, когда зависимым сервисам нужно готовое значение. Promise-valued `registerFactory` подходит только для графа, где сервисом служит сам Promise.

## Async-граф запроса

В этом графе один database создаётся для root, а отдельная session — для каждого авторизованного скоупа. Класс получает async-статус, если хотя бы одна объявленная зависимость асинхронна.

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard входит в async-граф
scope.get('dashboard')
```

Компилятор также отклонит `root.getAsync('dashboard')`: в root нет входного значения `auth`. Создание профилей разобрано в разделе [Данные и профили скоупа](./scope-inputs).

## Разрешение и запуск

`getAsync()` принимает готовые sync- и async-ключи и возвращает Promise. Синхронная ошибка lookup, cycle, lifetime или disposal превращается в rejected Promise.

InferDI запускает объявленные зависимости в порядке кортежа. Затем он ожидает элементы с декларативным async-маркером и вызывает фабрику с позиционными значениями. Независимые async-зависимости могут инициализироваться одновременно.

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

Callback получает значения, а не контейнер. Благодаря этому TypeScript и runtime preflight видят async-рёбра.

При непустом `deps` укажите тип каждого параметра callback или передайте функцию с готовой сигнатурой. Кортеж проверяет типы и порядок параметров, но не даёт им contextual inference.

## Кеширование по времени жизни

| Время жизни | Инициализация | Владение |
| --- | --- | --- |
| `singleton` | Один native Promise в контейнере-владельце | Контейнер-владелец |
| `scoped` | Один native Promise на разрешающий скоуп | Разрешающий скоуп |
| `transient` | Новая инициализация при каждом вызове | Вызывающий код |

Параллельные вызовы делят singleton- и scoped-инициализацию. Rejected Promise остаётся ошибочным состоянием кеша, автоматического retry нет. Для повторной попытки откройте новый скоуп или пересоберите root в соответствии с жизненным циклом приложения.

`has()` проверяет регистрацию, не запуская инициализацию. Метод не доказывает, что ключ синхронный, и не предоставляет отсутствующие scope inputs.

## Очистка async-ресурсов

Singleton- и scoped-регистрации сохраняют Promise в кеше после выполнения. Освобождайте их контейнер асинхронно: InferDI дождётся инициализации и проверит уже разрешённый ресурс.

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

Owned async-ресурсы поддерживают `await using`, `dispose()` и `Symbol.asyncDispose`. Синхронный `using` не может развернуть закешированный Promise и сообщает об ошибочном использовании.

## Legacy Promise-значения

Promise из `registerFactory` остаётся синхронным значением сервиса. Декларативная async-фабрика получает его по identity, потому что у регистрации нет маркера `AsyncSpec`.

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

На верхнем уровне `getAsync('dbPromise')` следует обычной JavaScript await-семантике и разрешается в `Database`.

## Границы и ошибки

- Передавайте readonly-кортежи в `registerAsyncFactory` и в `registerClass`, если кортеж может выбрать async-ключ. InferDI один раз определяет async-позиции и сохраняет ссылку на кортеж. Для inline-литерала TypeScript выводит readonly-тип.
- Декларативные циклы и холодные lifetime-нарушения завершаются на синхронном preflight. Вызовы через захваченный контейнер после Promise boundary создают динамические рёбра вне этого анализа.
- InferDI не реализует async `Lazy<T>`, retry, cancellation и rollback. Разорвите цикл или вынесите общую инициализацию в отдельный сервис.
- Если поздняя зависимость падает во время preflight, ранние инициализации сохраняют кеш и владение. Уже запущенный async transient может продолжить работу без teardown handle.
- Для класса с async-зависимостью нельзя создать синхронный lazy companion. У `registerAsyncFactory` нет параметра `lazyKey`.

Синхронное создание описано в разделе [Фабрики](./factories), а модель владения — в [Скоупах и очистке](./scopes).
