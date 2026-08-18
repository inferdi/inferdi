# Тестирование

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

Значение override должно быть совместимо с исходным зарегистрированным типом. Отсутствующие ключи и несовместимые моки дают ошибки TypeScript.

## Типизированные providers

`Container.Providers<C>` преобразует тип собранного контейнера в набор функций-провайдеров. Тестовая утилита может создавать моки без resolve production-графа.

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

Тип каждого зарегистрированного сервиса сохраняется, включая managed lazy companions. Ключи, объявленные только через `declareScopeInputs()`, не входят в map: их передаёт `createScope(inputs)`. Эти функции не регистрируются автоматически и остаются во владении теста.

## Когда делать override

Применяйте overrides до разрешения графа зависимостей:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Вторая строка бросит ошибку, потому что singleton уже находится в локальном кеше контейнера. Проверка намеренно опирается только на кеш: она также обнаруживает scoped-значения в текущем scope, `registerValue` и повторный override. При `fast: false` transient-значения и значения предка, разрешённые через дочерний контейнер, локально не кешируются, поэтому проверка их не видит. Fast scope могут зеркалировать delegated singleton в локальный cache и не поддерживают мутации после активации. Уже выданный transient остаётся у вызывающего кода, а последующие resolve возвращают мок. Это часть контракта, а не разрешение на поздние overrides: применяйте их до разрешения графа, чтобы не расколоть его.

## Владение

Override-значения принадлежат внешнему коду. Как и `registerValue`, override не добавляется в очередь dispose контейнера. Очистка остаётся за тестовой фикстурой.

## Локальность scope

Override меняет только контейнер, на котором вызван:

```ts
const scope = root.createScope().override('db', mockDb)
```

Корневой контейнер и соседние scopes не меняются. Overrides на уровне родителя видны через обычный поиск в родительском контейнере.
