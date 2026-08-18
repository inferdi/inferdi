# Типобезопасность

Главное правило InferDI: граф зависимостей живёт в системе типов. Неверный граф - перепутанный порядок аргументов, незарегистрированный ключ, singleton, который тянется к scoped-состоянию - это ошибка типа прямо в редакторе, а не stack trace, который вы найдёте под нагрузкой. Всё, что компилятор может доказать статически, проверяется статически; runtime-защита нужна только для того, что проскользнуло через `as`-касты и динамические ключи.

## Сигнатуры конструкторов

`registerClass` проверяет кортеж зависимостей по параметрам конструктора.

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

Если конструктор изменится, регистрация должна измениться вместе с ним. Кортеж `['db', 'logger']` будет отклонён, потому что первый параметр ожидает `Logger`.

## Уникальность ключей

Каждая регистрация возвращает расширенный тип контейнера. Повторная регистрация того же ключа через fluent API отклоняется:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

В тестах для намеренной замены используется `.override()`.

Проверка уникальности учитывает весь набор значений, представленный типом ключа. Если после регистрации `'dsn'` новый ключ имеет тип `'dsn' | 'replica'`, TypeScript отклонит вызов: в runtime значение может перезаписать `'dsn'`. То же правило действует для широких `string` и `symbol`, а также для `lazyKey`, который не должен пересекаться с основным или существующим ключом.

Broad- и union-ключи разрешены, пока их возможные значения не пересекаются с графом. Широкий `string` можно зарегистрировать в пустом контейнере или после ключей, состоящих только из symbol. Перед регистрацией сузьте runtime-ключ до заведомо нового значения; для намеренной замены используйте `.override()`.

## Динамические ключи

Статические ключи проверяются непосредственно в `.get()`. Если ключ приходит во время выполнения, сначала уточните его через `.has()`:

```ts
const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

В графе выше нет незаполненных scope inputs, а `.getAsync()` принимает оба зарегистрированных ключа независимо от sync- или async-режима. `.has()` доказывает только факт регистрации. Для очищенного контейнера метод возвращает `false`, но не доказывает готовность scope inputs и не делает ключ доступным через `.get()`.

## Время жизни в типе

Каждая запись хранит тип значения и вид времени жизни. Система типов фильтрует зависимости так, чтобы singleton не мог напрямую зависеть от scoped- или transient-сервисов.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

Default runtime-проверки остаются вторым рубежом защиты для `as`-кастов, динамических ключей, захваченных внешних контейнеров и циклов зависимостей.

## Готовность и async status

Тип графа также хранит требования scope inputs и декларативные async-регистрации. Ключ недоступен через `.get()`, пока его inputs не предоставлены. Ключ `AsyncSpec` и зависимые от него классы разрешаются через `.getAsync()`.

```ts
const root = new Container()
  .declareScopeInputs<{request: Request}>()
  .registerAsyncFactory('db', openDatabase, [])
  .registerClass('handler', Handler, ['request', 'db'], 'scoped')

const scope = root.createScope({request})

// @ts-expect-error: handler is async
scope.get('handler')

await scope.getAsync('handler')
```

Готовность моделируется через [входные данные скоупа](./scope-inputs), а выбор Promise-контракта описан в разделе [Асинхронные зависимости](./async-dependencies).
