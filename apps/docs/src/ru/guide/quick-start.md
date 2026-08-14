# Быстрый старт

В этом примере мы соберём полный граф, получим сервис из root-контейнера, а затем создадим скоуп запроса. Декораторы и настройка метаданных не нужны.

## Установка

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## Сборка графа

```ts
import { Container } from '@inferdi/inferdi'

type RequestContext = {
  requestId: string
}

class Logger {
  info(message: string) {
    console.info(message)
  }
}

class Database {
  constructor(readonly dsn: string) {}
}

class UserService {
  constructor(
    private readonly request: RequestContext,
    private readonly database: Database,
    private readonly logger: Logger
  ) {}

  find(id: string) {
    this.logger.info(`request=${this.request.requestId} user=${id}`)
    return { id, database: this.database.dsn }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, ['dsn'])
  .registerClass(
    'users',
    UserService,
    ['request', 'database', 'logger'],
    'scoped'
  )
```

Каждый кортеж зависимостей проверяется по конструктору. Если поменять местами `database` и `logger`, пропустить `request` или указать неизвестный ключ, TypeScript сообщит об ошибке.

В этом графе один внешний вход и четыре регистрации:

```text
dsn ───────────────▶ database (singleton) ─┐
logger (singleton) ────────────────────────┼─▶ users (scoped)
request (scope input) ─────────────────────┘
```

## Получение сервисов

Singleton из root-контейнера можно получить синхронно через `.get()`:

```ts
const database = root.get('database')
```

Сервису `users` нужен вход `request`, поэтому сначала откройте скоуп:

```ts
const request = { requestId: crypto.randomUUID() }

await using scope = root.createScope({ request })
const users = scope.get('users')

users.find('42')
```

Тип созданного скоупа хранит информацию о готовности `request`. Вызов `root.get('users')` не компилируется, потому что у root-контейнера нет данных запроса.

## Выбор времени жизни

По умолчанию регистрация имеет время жизни `singleton`. Явно укажите другое значение, если объект принадлежит скоупу или вызывающему коду.

| Время жизни | Создание | Где кешируется | Кто освобождает |
| --- | --- | --- | --- |
| `singleton` | один раз | создавший контейнер | этот контейнер |
| `scoped` | один раз на дочерний скоуп | дочерний скоуп | этот скоуп |
| `transient` | при каждом resolve | нигде | вызывающий код |

Singleton не может напрямую зависеть от scoped- или transient-сервиса. InferDI проверяет это в типах и, по умолчанию, повторяет проверку во время выполнения.

## Куда дальше

| Задача | Раздел |
| --- | --- |
| разобраться в compile-time проверках графа | [Типобезопасность](../core/type-safety) |
| описать запрос, tenant или данные задачи | [Входные данные скоупа](../core/scope-inputs) |
| асинхронно инициализировать зависимость | [Асинхронные зависимости](../core/async-dependencies) |
| безопасно закрывать базы данных и другие ресурсы | [Скоупы и освобождение ресурсов](../core/scopes) |
| связать скоупы с веб-фреймворком | [Адаптеры](../adapters/) |
| посмотреть полные примеры для фреймворков и runtime | [Примеры](./examples) |
