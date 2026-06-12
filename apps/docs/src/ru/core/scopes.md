# Скоупы и очистка

Scope ограничивает время жизни request-local-сервисов одной единицей работы. Дочерний scope наследует все регистрации родителя, но кеширует собственные scoped-экземпляры и владеет их очисткой. Поэтому scope, созданный для одного запроса, не делит состояние с другим запросом и не переживает его.

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` является корневым singleton. `request` создаётся один раз на scope и освобождается при dispose этого scope.

## Владение

Каждый контейнер освобождает только экземпляры, которые создал сам.

| Экземпляр                                             | Владелец                |
|-------------------------------------------------------|-------------------------|
| Корневой singleton                                    | Корневой контейнер      |
| Scoped-сервис                                         | Request scope           |
| Singleton, впервые полученный из дочернего контейнера | Этот дочерний контейнер |
| Transient                                             | Вызывающий код          |

`root.dispose()` не запускает каскадную очистку уже созданных дочерних scope. Каждый scope нужно очищать на его собственной границе жизненного цикла.

## Нативное управление ресурсами

Container реализует оба символа очистки:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Используйте `await using` или `await container.dispose()`, если принадлежащий контейнеру ресурс может очищаться асинхронно.

## Порядок очистки

Принадлежащие контейнеру экземпляры освобождаются в обратном порядке создания. Container проверяет:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

Если несколько disposers падают, InferDI собирает ошибки в `AggregateError`, чтобы один сбой очистки не мешал закрытию остальных ресурсов.
