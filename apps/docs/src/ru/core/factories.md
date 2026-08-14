# Фабрики

Используйте `registerClass`, если создание сводится к `new Ctor(...deps)`. `registerFactory` нужен для конфигурации, стороннего API, привязки интерфейса или другой явной логики.

```ts
const container = new Container()
  .registerValue('config', {
    dsn: 'postgres://localhost/app',
    poolSize: 10
  })
  .registerFactory('pool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepository, ['pool'])
```

Возвращаемый тип становится типом зарегистрированного сервиса.

## Фабрики с доступом к контейнеру

Базовый callback получает контейнер, отфильтрованный по времени жизни. Singleton-фабрика может получать только безопасные для singleton зависимости; scoped- и transient-ключи отклоняются TypeScript.

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

Эта форма подходит для условного или многошагового создания. Все вызовы `.get()` внутри неё должны оставаться синхронными. Для инициализации, async-статус которой распространяется по графу, используйте `registerAsyncFactory`.

## Объявленные зависимости фабрики

Overload с `deps` делает требования фабрики видимыми в графе и ограничивает resolver указанными ключами:

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('logger', Logger, [])
  .registerFactory(
    'requestLog',
    (deps) => new RequestLog(
      deps.get('request'),
      deps.get('logger')
    ),
    ['request', 'logger'],
    'scoped'
  )
```

Объявленные зависимости передают требования scope inputs и времени жизни через модули и другие регистрации. В отличие от `registerAsyncFactory`, callback получает resolver, а не позиционные значения.

## Время жизни фабрик

Фабрики поддерживают те же варианты времени жизни, что и классы:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

Singleton- и scoped-результаты кешируются и принадлежат контейнеру. Transient-результаты InferDI не кеширует и не освобождает.

Четвёртым аргументом можно передать `lazyKey` и создать companion с тем же временем жизни цели:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

При добавлении companion время жизни нужно указать явно, включая `'singleton'`. Остальные правила описаны в разделе [Ленивое внедрение](./lazy-injection).

## Привязка интерфейсов

У интерфейса нет runtime-конструктора. Укажите тип сервиса явно, если потребители должны зависеть от абстракции:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>(
    'mailer',
    () => new SendGridMailer()
  )
```

Теперь потребители `mailer` видят `Mailer`, а не `SendGridMailer`.

## Выбор Promise-контракта

Promise, возвращённый из `registerFactory`, сам становится значением сервиса: `.get()` возвращает `Promise<T>`, а зависимые фабрики получают тот же объект. Используйте такую форму, только если Promise должен входить в синхронный граф.

Если сервисом является `T`, а Promise обозначает границу его инициализации, используйте `registerAsyncFactory`. Async-статус распространится по графу, а сервис будет доступен через `.getAsync()`. Оба контракта, кеширование, lazy companions, ошибки и teardown разобраны в разделе [Асинхронные зависимости](./async-dependencies).
