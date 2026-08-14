# Асинхронные зависимости

`registerAsyncFactory` записывает явное async-ребро. В графе хранится итоговый тип сервиса, InferDI ожидает объявленные async-зависимости и распространяет async-статус на зависимые классы.

## Выбор Promise-модели

InferDI поддерживает два контракта: Promise может быть самим сервисом или границей его инициализации.

| API | Значение в графе | Внедрение | Разрешение |
| --- | --- | --- | --- |
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | Объект Promise по identity | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` в `AsyncSpec` | Выполненный `Database` | `getAsync()` |

Используйте `registerAsyncFactory`, когда зависимым сервисам нужно готовое значение. Promise-valued `registerFactory` подходит только для графа, где сервисом служит сам Promise.

Это различие действует и для companion: Promise-valued `registerFactory`
создаёт `Lazy<Promise<T>>`, а декларативный `registerAsyncFactory` с пятым
`lazyKey` создаёт `AsyncLazy<T>`. Получение wrapper остаётся синхронным и не
распространяет async status на его потребителя.

## Регистрация async-фабрик

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

// @ts-expect-error: dashboard belongs to the async graph
scope.get('dashboard')
```

Компилятор также отклонит `root.getAsync('dashboard')`: в root нет входного значения `auth`. Создание профилей разобрано в разделе [Входные данные скоупа](./scope-inputs).

## Resolve и распространение async-статуса

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

## Запуск и кеширование

| Время жизни | Инициализация | Владение |
| --- | --- | --- |
| `singleton` | Один native Promise в контейнере-владельце | Контейнер-владелец |
| `scoped` | Один native Promise на разрешающий скоуп | Разрешающий скоуп |
| `transient` | Новая инициализация при каждом вызове | Вызывающий код |

Параллельные вызовы делят singleton- и scoped-инициализацию. Rejected Promise остаётся ошибочным состоянием кеша, автоматического retry нет. Для повторной попытки откройте новый скоуп или пересоберите root в соответствии с жизненным циклом приложения.

`has()` проверяет регистрацию, не запуская инициализацию. Метод не доказывает, что ключ синхронный, и не предоставляет отсутствующие scope inputs.

## AsyncLazy companions

Передайте пятый аргумент `lazyKey`, чтобы отложить декларативную async-цель:

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

Создание wrapper остаётся синхронным, поэтому класс с `AsyncLazy<T>` не получает async-статус от этой зависимости. Wrapper захватывает разрешающий контейнер: scoped-цели остаются внутри его скоупа, а transient-цель запускается при каждом вызове и принадлежит вызывающему коду.

## Освобождение ресурсов и ошибки

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

Перед выбросом этой ошибки sync dispose добавляет обработчик rejection к закешированному нативному Promise, поэтому поздний отказ не попадает в `unhandledRejection`. Promise не ожидается, а пользовательский thenable не ассимилируется.

Rejected singleton- или scoped-инициализация остаётся в кеше. InferDI не повторяет её автоматически. Если поздняя зависимость падает во время preflight, уже начатые инициализации сохраняют своё состояние и владельца.

Ошибка зависимости может пройти через несколько закешированных Promise инициализации. Async dispose сообщает один объект `Error` один раз; разные объекты остаются разными причинами `AggregateError`, в том числе при одинаковом тексте сообщений.

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

## Динамические границы

- Передавайте readonly-кортежи в `registerAsyncFactory` и в `registerClass`, если кортеж может выбрать async-ключ. InferDI один раз определяет async-позиции и сохраняет ссылку на кортеж. Для inline-литерала TypeScript выводит readonly-тип.
- Декларативные циклы и холодные lifetime-нарушения завершаются на синхронном preflight. Вызовы через захваченный контейнер после Promise boundary создают динамические рёбра вне этого анализа.
- `AsyncLazy<T>` откладывает resolve, но не добавляет retry, cancellation или rollback.
- Если поздняя зависимость падает во время preflight, ранние инициализации сохраняют кеш и владение. Уже запущенный async transient может продолжить работу без teardown handle.
- Async-класс с `lazyKey` получает `AsyncLazy<Class>`, а mixed sync/async class — `Lazy<Class> | AsyncLazy<Class>`.
- Динамический цикл через `AsyncLazy.get()` после Promise boundary может ждать собственный cached pending Promise без runtime-ошибки.

Синхронное создание описано в разделе [Фабрики](./factories), а модель владения — в [Скоупах и освобождении ресурсов](./scopes).
