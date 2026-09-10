# Асинхронные зависимости

`registerAsyncFactory` явно объявляет асинхронную зависимость. В графе хранится итоговый тип сервиса. InferDI дожидается объявленных асинхронных зависимостей, а классы, которым они нужны, тоже становятся асинхронными.

## Выбор Promise-модели

InferDI поддерживает два варианта: Promise может быть самим сервисом или результатом его асинхронной инициализации.

| API | Значение в графе | Внедрение | Разрешение |
| --- | --- | --- | --- |
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | Тот же объект Promise | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` в `AsyncSpec` | Готовый экземпляр `Database` | `getAsync()` |

Используйте `registerAsyncFactory`, когда зависимым сервисам нужно готовое значение. Возвращающий Promise `registerFactory` подходит только для графа, где сервисом служит сам Promise.

Это различие сохраняется и для ленивых обёрток: `registerFactory`, возвращающий Promise, создаёт `Lazy<Promise<T>>`. Вызов `registerAsyncFactory` с пятым аргументом `lazyKey` создаёт `AsyncLazy<T>`. Саму обёртку можно получить синхронно; она не делает своего потребителя асинхронным.

## Регистрация асинхронных фабрик {#регистрация-async-фабрик}

В этом графе подключение к базе данных создаётся один раз в корневом контейнере, а сессия создаётся отдельно для каждого авторизованного скоупа. Класс становится асинхронным, если асинхронна хотя бы одна из его объявленных зависимостей.

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

Компилятор также отклонит `root.getAsync('dashboard')`: в корневом контейнере нет входного значения `auth`. Создание профилей разобрано в разделе [Входные данные скоупа](./scope-inputs).

## Получение сервисов и распространение асинхронности {#resolve-и-распространение-async-статуса}

`getAsync()` принимает готовые ключи синхронных и асинхронных сервисов и возвращает Promise. Синхронная ошибка поиска, цикла, времени жизни или освобождения ресурсов превращается в отклонённый Promise.

InferDI запускает объявленные зависимости в порядке кортежа. Затем он ожидает зависимости, явно помеченные как асинхронные, и вызывает фабрику с позиционными значениями. Независимые асинхронные сервисы могут инициализироваться одновременно.

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

Функция получает готовые значения зависимостей. Так связи между асинхронными сервисами видны и TypeScript, и предварительной проверке во время выполнения.

Если `deps` не пуст, явно укажите тип каждого параметра функции или передайте функцию с уже известной сигнатурой. Кортеж проверяет типы и порядок параметров, но не выводит их типы из ключей зависимостей.

## Запуск и кэширование {#запуск-и-кеширование}

| Время жизни | Инициализация | Владение |
| --- | --- | --- |
| `singleton` | Один нативный Promise в контейнере-владельце | Контейнер-владелец |
| `scoped` | Один нативный Promise на скоуп, из которого получают сервис | Скоуп, из которого получают сервис |
| `transient` | Новая инициализация при каждом вызове | Вызывающий код |

Параллельные вызовы используют одну и ту же инициализацию singleton- или scoped-сервиса. Если она завершилась ошибкой, отклонённый Promise остаётся в кэше: автоматического повтора нет. Для повторной попытки создайте новый скоуп или пересоберите корневой контейнер с учётом жизненного цикла приложения.

`has()` проверяет регистрацию, не запуская инициализацию. Метод не доказывает, что ключ синхронный, и не предоставляет отсутствующие входные данные скоупа.

## Ленивые обёртки AsyncLazy {#asynclazy-companions}

Передайте пятый аргумент `lazyKey`, чтобы отложить инициализацию декларативного асинхронного сервиса:

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

Обёртка создаётся синхронно, поэтому зависимость от `AsyncLazy<T>` не делает класс асинхронным. Обёртка сохраняет ссылку на контейнер, из которого её получили: scoped-сервисы остаются внутри этого скоупа, а transient-сервис создаётся при каждом вызове и принадлежит вызывающему коду.

## Освобождение ресурсов и ошибки

Singleton- и scoped-регистрации сохраняют Promise в кэше после выполнения. Освобождайте их контейнер асинхронно: InferDI дождётся инициализации и проверит, как освободить полученный ресурс.

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

Для асинхронных ресурсов, принадлежащих контейнеру, используйте `await using`, `dispose()` или `Symbol.asyncDispose`. Синхронный `using` не может дождаться значения закэшированного Promise и сообщает об ошибке использования.

Перед тем как сообщить об этой ошибке, синхронное освобождение ресурсов добавляет обработчик отклонения к закэшированному нативному Promise. Поэтому поздняя ошибка не попадёт в `unhandledRejection`. Метод не дожидается Promise и не вызывает `.then()` у пользовательских thenable-объектов.

Неудачная инициализация singleton- или scoped-сервиса остаётся в кэше. InferDI не повторяет её автоматически. Если поздняя зависимость падает при предварительной проверке, уже начатые инициализации сохраняют своё состояние и владельца.

Ошибка зависимости может распространиться через несколько закэшированных Promise инициализации. При асинхронном освобождении ресурсов InferDI сообщает об одном и том же объекте `Error` только один раз. Разные объекты остаются отдельными причинами в `AggregateError`, даже если текст сообщений совпадает.

## Promise как значение сервиса {#legacy-promise-значения}

Promise из `registerFactory` остаётся синхронным значением сервиса. Декларативная асинхронная фабрика получает тот же объект Promise, потому что у регистрации нет маркера `AsyncSpec`.

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

На верхнем уровне `getAsync('dbPromise')` следует обычным правилам `await` в JavaScript: возвращённый Promise завершается значением `Database`.

## Динамические границы

- Передавайте неизменяемые кортежи зависимостей (`readonly`) в `registerAsyncFactory` и в `registerClass`, если кортеж допускает асинхронный ключ. InferDI один раз определяет асинхронные позиции и сохраняет ссылку на кортеж. Для литерала прямо в вызове TypeScript выводит `readonly`-тип.
- Декларативные циклы и нарушения времени жизни при первом получении сервиса обнаруживаются синхронной предварительной проверкой. Обращения к захваченному контейнеру после перехода к асинхронному выполнению создают динамические связи, которые эта проверка не видит.
- `AsyncLazy<T>` откладывает получение сервиса, но не добавляет повторные попытки, отмену или откат.
- Если при предварительной проверке одна из зависимостей завершается ошибкой, уже запущенные инициализации сохраняют кэш и владельца. Асинхронный transient-сервис может продолжить работу, хотя вызывающий код уже не получит ссылку для освобождения его ресурсов.
- Асинхронный класс с `lazyKey` получает `AsyncLazy<Class>`. Если ключ зависимости допускает синхронную или асинхронную регистрацию, тип обёртки будет `Lazy<Class> | AsyncLazy<Class>`.
- Динамический цикл через `AsyncLazy.get()` после перехода к асинхронному выполнению может ждать собственный закэшированный незавершённый Promise. Синхронная проверка циклов не обнаружит это зависание.

Синхронное создание описано в разделе [Фабрики](./factories), а модель владения - в [Скоупах и освобождении ресурсов](./scopes).

## Проверка компилятором

Декларативная асинхронная регистрация недоступна через синхронный `.get()`, но доступна через `.getAsync()`:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Database {
  query() {}
}

const container = new Container()
  .registerAsyncFactory('database', async () => new Database(), [])

container.get('database') // [!code error]

const database = await container.getAsync('database')
//    ^?
```
