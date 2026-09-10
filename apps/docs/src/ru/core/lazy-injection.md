# Ленивое внедрение

`Lazy<T>` и `AsyncLazy<T>` откладывают получение сервиса до вызова `.get()`. Для синхронного сервиса метод возвращает `T`, для декларативного асинхронного сервиса возвращает `Promise<T>`. Если тип ключа зависимости класса допускает оба варианта, обёртка имеет тип `Lazy<T> | AsyncLazy<T>`.

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

`lazyKey`, переданный в `registerClass`, `registerFactory` или `registerAsyncFactory`, создаёт дополнительную регистрацию ленивой обёртки. Её `.get()` обращается к контейнеру за целевым сервисом только в момент вызова.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

Для `registerAsyncFactory` ключ ленивой обёртки передаётся пятым аргументом:

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Получение и внедрение обёртки не запускает фабрику. Для асинхронных singleton- и scoped-сервисов `.get()` обёртки `AsyncLazy` возвращает закэшированный нативный Promise, в том числе отклонённый. Transient-сервис создаётся при каждом вызове и принадлежит вызывающему коду. Фабрика `registerFactory`, возвращающая Promise, сохраняет синхронный контракт и создаёт `Lazy<Promise<T>>`.

## Время жизни сохраняется

Ленивая обёртка сохраняет время жизни целевого сервиса. Singleton может получать только `Lazy` или `AsyncLazy` для singleton-сервиса. TypeScript также отклоняет объединения типов, допускающие короткое время жизни, и объединения управляемой и обычной обёртки.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped- и transient-сервисы могут получать ленивые обёртки для любого времени жизни: сами эти потребители не кэшируются глобально.

## Захваченный скоуп и освобождение ресурсов

Обёртка сохраняет ссылку на контейнер, из которого её получили. Обёртка из первого дочернего скоупа продолжает использовать его даже после создания второго. После освобождения этого скоупа `AsyncLazy.get()` возвращает отклонённый Promise. Владелец освобождает созданные singleton- и scoped-сервисы, дождавшись начатой инициализации. Если инициализация не запускалась, освобождать нечего.

## Циклические зависимости

InferDI обнаруживает синхронные циклы, в том числе при предварительной проверке декларативных асинхронных зависимостей. Динамический цикл через `AsyncLazy.get()` после перехода к асинхронному выполнению уже не попадает в эту проверку. Если инициализация снова получает собственный незавершённый Promise, ожидание никогда не закончится. Вынесите общую инициализацию или устраните цикл. Подробнее об этом ограничении: [Асинхронные зависимости](./async-dependencies).