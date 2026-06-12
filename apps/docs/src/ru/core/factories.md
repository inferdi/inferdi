# Фабрики

Используйте `registerFactory`, когда создание сложнее, чем `new Ctor(...deps)`: нужно прочитать несколько значений, адаптировать сторонний клиент, собрать объект конфигурации или вернуть promise.

```ts
const container = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepo, ['pgPool'])
```

Возвращаемое значение фабрики становится типом, который выдаёт этот ключ.

## Время жизни фабрик

Фабрики используют ту же модель времени жизни, что и классы:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

В singleton-фабрике параметр `c` сужен до зависимостей, безопасных для singleton. Scoped и transient ключи не появляются в автодополнении и отклоняются TypeScript.

## Привязка интерфейсов

TypeScript интерфейсы стираются при компиляции, и во время выполнения нет значения, которое можно передать как конструктор. Вместо этого свяжите интерфейс с реализацией через явный тип фабрики:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

Потребители ключа `'mailer'` видят `Mailer`, а не конкретный класс.

## Асинхронные фабрики

Фабрики могут возвращать promises. Сам promise кешируется, поэтому параллельные вызовы разделяют одну и ту же инициализацию:

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

const [a, b] = await Promise.all([c.get('db'), c.get('db')])
await c.dispose()
```

`.get()` остаётся синхронным. Вызывающий код делает `await` в месте использования, если регистрация асинхронная.
