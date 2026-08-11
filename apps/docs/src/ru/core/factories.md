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
      "description": "Используйте registerFactory для синхронного создания и registerAsyncFactory для декларативного асинхронного графа зависимостей."
      "url": "https://inferdi.com/ru/core/factories"
      "mainEntityOfPage": "https://inferdi.com/ru/core/factories"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, фабрики, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, внедрение зависимостей"
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

## Синхронные фабрики со значением Promise

`registerFactory` считает возвращённый Promise значением сервиса. Ключ остаётся синхронным, `get()` возвращает Promise, а другая фабрика получает тот же объект.

```ts
const c = new Container()
  .registerFactory('dbPromise', () => connectDatabase())

const promise = c.get('dbPromise') // Promise<Database>
```

Эта форма сохраняет single-flight кеширование. Цикл, созданный после `await` через захваченный контейнер, находится вне синхронных проверок циклов и времени жизни.

## Декларативный асинхронный граф

`registerAsyncFactory` хранит итоговый тип сервиса в `AsyncSpec` и получает позиционные значения зависимостей. `registerClass` распространяет async status по графу классов.

```ts
class Repository {
  constructor(readonly db: Database) {}
}

const root = new Container()
  .registerValue('config', {url: 'postgres://localhost/app'})
  .declareScopeInputs<{request: RequestContext}>()
  .registerAsyncFactory(
    'db',
    async (config) => connectDatabase(config.url),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (request) => loadSession(request),
    ['request'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])

const scope = root.createScope({request})
const repository = await scope.getAsync('repository')

// @ts-expect-error — ключи async-графа требуют getAsync()
scope.get('repository')
```

`getAsync()` принимает готовые sync- и async-ключи и возвращает Promise. TypeScript отклоняет `get()`, если ключ или union ключей может содержать `AsyncSpec`. `has()` подтверждает только наличие регистрации: он не доказывает, что ключ синхронный, и не предоставляет недостающие scope inputs.

Контейнер запускает объявленные зависимости по порядку кортежа и ожидает только помеченные async-регистрации. Singleton и scoped регистрации кешируют один native Promise. Transient запускается при каждом вызове и остаётся во владении вызывающего кода. Декларативные циклы и cold lifetime violations завершаются ошибкой во время синхронного preflight.

Async callback не получает контейнер. Вызовы через захваченный контейнер после Promise boundary создают динамические рёбра, которые граф не анализирует. InferDI не добавляет async `Lazy<T>`, retry, cancellation или rollback. Если следующий sibling падает во время preflight, уже начатые инициализации сохраняют прежний cache и ownership; async transient может продолжить работу без teardown handle.

Owned async singleton и scoped регистрации сохраняют Promise в кеше после выполнения. Закрывайте их контейнеры через `await using`, `await container.dispose()` или `Symbol.asyncDispose`. Синхронный `using` сообщает, что кешированный Promise нельзя развернуть.

Передавайте readonly-кортежи зависимостей в `registerAsyncFactory` и в `registerClass`, если кортеж может выбрать async-ключ. InferDI сохраняет ссылку на кортеж и один раз классифицирует async-позиции; литералы автоматически выводятся как readonly.
