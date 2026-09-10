# Типобезопасность

InferDI хранит объявленный граф зависимостей в типе контейнера. Каждая регистрация добавляет ключ, тип сервиса, время жизни, синхронный или асинхронный режим и требования к входным данным скоупа. Следующие вызовы проверяются по уже накопленному состоянию графа.

## Сигнатуры конструкторов

`registerClass` сопоставляет ключи зависимостей с параметрами конструктора по позиции и структурной совместимости.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

Публичные структуры у зависимостей разные, поэтому перестановка действительно даёт заявленную ошибку:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript использует структурную типизацию. Два пустых класса или два класса с одинаковыми публичными членами совместимы, поэтому компилятор не видит смысловую перестановку. Делайте контракты различимыми. Если значения обязаны отличаться при одинаковой структуре, используйте брендированные типы из раздела [Символьные ключи](./symbol-keys#same-value-shape).

## Уникальность ключей

Каждая регистрация в цепочке вызовов возвращает контейнер с расширенным типом графа. Повторная регистрация ключа приводит к ошибке:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

В тестах намеренную замену делает `.override()`. После каждой регистрации сохраняйте возвращённый контейнер: старая ссылка не знает о новых узлах. Подробный пример есть в [Плохих практиках](./bad-practices#stale-builder-references).

Проверка учитывает все возможные значения типа ключа. После регистрации `'dsn'` кандидат типа `'dsn' | 'replica'` отклоняется, ведь при выполнении он может перезаписать `'dsn'`. Широкие `string` и `symbol` разрешены, пока не пересекаются с известным графом, но расширение ключа снижает точность всего графа.

## Динамические ключи

Литеральные ключи `.get()` проверяет напрямую. Ключ из данных времени выполнения сначала уточните через `.has()`:

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` доказывает регистрацию. Метод не подтверждает готовность недостающих входных данных скоупа и не превращает асинхронный ключ в допустимый аргумент синхронного `.get()`.

## Время жизни в типе

Каждая запись содержит время жизни. Singleton не может захватить scoped- или transient-зависимость:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

Контракт по умолчанию повторяет проверки циклов и времени жизни во время выполнения. Так он ловит приведения типов, динамические ключи и захваченные контейнеры, которых TypeScript не видит. `{ fast: true }` задаёт отдельный контракт фиксированного графа с меньшим числом проверок во время выполнения.

## Готовность и асинхронность {#готовность-и-async-status}

Входные данные скоупа и декларативные асинхронные зависимости меняют доступность ключей и выбор между `.get()` и `.getAsync()`:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

В корневом контейнере нет `request`, а готовый `handler` остаётся асинхронным из-за зависимости от `database`. Дальше разберите [Входные данные скоупа](./scope-inputs) и [Асинхронные зависимости](./async-dependencies).
