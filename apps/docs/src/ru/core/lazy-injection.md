# Ленивое внедрение

`Lazy<T>` - это небольшая обёртка с отложенным resolve. Она полезна, когда порядок создания нужно отложить или два singleton-сервиса должны ссылаться друг на друга без немедленного создания обоих объектов в конструкторах.

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

`lazyKey` создаёт companion-регистрацию со значением `{ get: () => target }`.

## Время жизни сохраняется

Lazy не является лазейкой вокруг времени жизни. Singleton может инжектить только `Lazy` companion для singleton-цели.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped- и transient-потребители могут использовать lazy companions для любого времени жизни, потому что они не кешируются глобально.

## Циклические зависимости

InferDI обнаруживает циклы, но не разрывает их автоматически. Для двух singleton-сервисов поставьте `Lazy<singleton>` на одну сторону, а вторую оставьте прямой. Для циклов между async-фабриками правильное решение архитектурное: вынести общую инициализацию, поднять одну сторону выше или убрать цикл.
