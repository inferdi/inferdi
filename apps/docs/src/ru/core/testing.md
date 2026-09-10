# Тестирование

## Проверяйте сервис напрямую

Бизнес-сервис получает обычные значения, поэтому его модульному тесту контейнер не нужен:

```ts
type Logger = { info(message: string): void }
type Database = { findUser(id: string): { id: string } | undefined }

class UserRepo {
  constructor(readonly logger: Logger, readonly db: Database) {}

  find(id: string) {
    this.logger.info(`find ${id}`)
    return this.db.findUser(id)
  }
}

const messages: string[] = []
const repo = new UserRepo(
  { info: (message) => messages.push(message) },
  { findUser: (id) => ({ id }) }
)

expect(repo.find('42')).toEqual({ id: '42' })
expect(messages).toEqual(['find 42'])
```

Контейнер нужен в интеграционном тесте, когда вы проверяете сам граф приложения.

## Проверяйте собранный граф

Используйте `.override()`, когда тестам нужно заменить существующую регистрацию на мок.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

Значение подмены должно быть совместимо с исходным зарегистрированным типом. Отсутствующие ключи и несовместимые моки дают ошибки TypeScript.

## Типизированные провайдеры {#типизированные-providers}

`Container.Providers<C>` преобразует тип собранного контейнера в набор функций-провайдеров. Тестовая утилита может создавать моки без получения сервисов графа приложения.

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

Тип каждого зарегистрированного сервиса сохраняется, включая управляемые ленивые обёртки. Ключи, объявленные только через `declareScopeInputs()`, исключены: их значения передаёт `createScope(inputs)`. Этот тип не регистрирует функции автоматически и не передаёт владение ресурсами. Тест сам решает, как применить моки и освободить их ресурсы.

## Когда подменять сервисы {#когда-делать-override}

Выполняйте подмены до разрешения графа зависимостей:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Вторая строка выбросит ошибку: singleton уже находится в локальном кэше контейнера. Проверка опирается только на этот кэш, поэтому также замечает scoped-значения текущего скоупа, `registerValue` и повторную подмену. При `fast: false` transient-значения и значения предка, полученные через дочерний контейнер, локально не кэшируются, и проверка их не видит. Скоупы в fast-режиме могут кэшировать singleton-значения предка у себя; менять граф после активации в этом режиме нельзя. Уже выданный transient остаётся у вызывающего кода, а следующие вызовы возвращают мок. Поэтому выполняйте все подмены до первого получения сервисов, даже если проверка не запрещает более позднюю замену. Иначе разные части приложения будут использовать разные реализации.

## Владение

Значения подмены принадлежат внешнему коду. Как и `registerValue`, подмена не добавляется в очередь освобождения ресурсов контейнера. Очистка остаётся за тестовой фикстурой.

## Подмена внутри скоупа {#локальность-scope}

Подмена меняет только контейнер, в котором выполняется:

```ts
const scope = root.createScope().override('db', mockDb)
```

Корневой контейнер и соседние скоупы не меняются. Подмены на уровне родителя видны через обычный поиск в родительском контейнере.
