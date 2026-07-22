---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/factories#breadcrumb"
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
          "name": "Фабрики"
          "item": "https://inferdi.com/ru/core/factories"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/factories#article"
      "headline": "Фабрики в InferDI — registerFactory"
      "name": "Фабрики"
      "description": "Используйте registerFactory, когда создание требует большего, чем new Ctor(...deps): чтение нескольких значений, адаптация сторонних клиентов, сборка объектов конфигурации или возврат promise, который InferDI кеширует как есть."
      "url": "https://inferdi.com/ru/core/factories"
      "mainEntityOfPage": "https://inferdi.com/ru/core/factories"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, фабрики, registerFactory, асинхронная фабрика, конфигурация, сторонние клиенты, внедрение зависимостей"
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

## Горячие transient-графы

`registerClass` остаётся стандартным способом регистрации transient-сервисов. Оставляйте его, пока профилировщик не покажет, что создание объектов заметно влияет на горячий путь.

У V8 есть узкий неблагоприятный случай: один граф много раз создаёт разные transient-классы с одинаковым числом зависимостей. Если профилировщик и собранный артефакт приложения подтверждают этот hotspot, зарегистрируйте только такие сервисы через фабрики:

```ts
const container = new Container()
  .registerClass('context', RequestContext, [], 'scoped')
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    'transient',
  )
```

Каждая фабрика должна содержать собственный вызов `new Service(...)`. Не направляйте несколько сервисов в общий конструктор-помощник, если эта оптимизация важна. Фабрики дублируют описание зависимостей, поэтому применяйте их к измеренным hotspot, а не ко всем transient-регистрациям.

## Время жизни фабрик

Фабрики используют ту же модель времени жизни, что и классы:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

В singleton-фабрике параметр `c` сужен до зависимостей, безопасных для singleton. Scoped и transient ключи не появляются в автодополнении и отклоняются TypeScript.

Опциональный четвёртый аргумент `lazyKey` регистрирует сохраняющий время жизни companion `Lazy<V>` — точно так же, как в `registerClass`:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get() // Cache
```

Чтобы оставить время жизни singleton по умолчанию, перед ключом companion передайте `undefined`: `registerFactory('cache', factory, undefined, 'cacheLazy')`.

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

Runtime-проверки циклов и времени жизни отражают только синхронный стек вызова фабрики. После `await` обычный типизированный код по-прежнему защищён `AllowedDeps`, но `as`-cast или захваченный внешний контейнер уже находятся вне контекста runtime-проверки. Читайте зависимости в синхронной части фабрики до первого `await`.
