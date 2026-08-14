# Ленивое внедрение

`Lazy<T>` и `AsyncLazy<T>` откладывают resolve до вызова `.get()`. Для sync-цели метод возвращает `T`, для декларативной async-цели — `Promise<T>`. Класс с union-ключом, который может выбрать оба режима, получает `Lazy<T> | AsyncLazy<T>`.

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

`lazyKey`, переданный в `registerClass`, `registerFactory` или `registerAsyncFactory`, создаёт companion-регистрацию со значением `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

Для `registerAsyncFactory` ключ companion передаётся пятым аргументом:

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Получение и внедрение wrapper не запускает фабрику. Для singleton и scoped
`.get()` возвращает закешированный native Promise, включая rejection. Transient
запускается при каждом вызове и остаётся во владении caller. Promise-valued
`registerFactory` сохраняет sync-контракт и создаёт `Lazy<Promise<T>>`.

## Время жизни сохраняется

Lazy companion сохраняет lifetime цели. Singleton может инжектить только `Lazy` или `AsyncLazy` для singleton-цели. TypeScript также отклоняет union с возможным short-lived lifetime и union управляемого и обычного wrapper.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped- и transient-потребители могут использовать lazy companions для любого времени жизни, потому что они не кешируются глобально.

## Захваченный скоуп и освобождение ресурсов

Wrapper захватывает контейнер, в котором его получили. Wrapper из первого child
scope продолжает работать через этот scope после создания второго. После
disposal захваченного scope `AsyncLazy.get()` возвращает rejected Promise.
Владелец освобождает разрешённые singleton/scoped-цели и ждёт уже запущенную
инициализацию; незапущенная цель не создаёт ресурс.

## Циклические зависимости

InferDI обнаруживает синхронные циклы, включая декларативные async-зависимости во время preflight. Динамический цикл через `AsyncLazy.get()` после Promise-границы не попадает в этот detector. Если инициализация снова получает собственный pending Promise, обе стороны ждут бесконечно. Вынесите общую инициализацию или уберите цикл. Async-граница описана в разделе [Асинхронные зависимости](./async-dependencies).
