# Скоупы и освобождение ресурсов

Scope ограничивает время жизни request-local-сервисов одной единицей работы. Дочерний scope наследует все регистрации родителя, но кеширует собственные scoped-экземпляры и владеет их очисткой. Поэтому scope, созданный для одного запроса, не делит состояние с другим запросом и не переживает его.

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` — корневой singleton. Request передаётся как внешний scope input и остаётся во владении приложения, а `handler` создаётся и освобождается скоупом запроса.

`scoped`-регистрации принадлежат дочерним скоупам. При `fast: false` (по умолчанию) попытка получить такую регистрацию из root выбрасывает `Scoped "key" cannot be resolved from the root container. Use createScope().` Получайте ключ из контейнера, который вернул `createScope()`. `fast: true` отключает эту runtime-проверку.

## Входные данные скоупа

Scope inputs описывают внешние значения, которые появляются при создании scope: request, auth context, tenant или данные job. Объявите их один раз и передавайте нужное подмножество через `createScope(inputs)`:

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

Тип контейнера хранит предоставленные inputs и скрывает зависимые сервисы до их готовности. Именованные профили, вложенное уточнение, deps-aware factories, переиспользуемые типы и правила валидации разобраны в разделе [Входные данные скоупа](./scope-inputs).

## Владение

Каждый контейнер освобождает только экземпляры, которые создал сам.

| Экземпляр | Владелец |
| --- | --- |
| Singleton, зарегистрированный в root, даже при resolve через дочерний scope | Корневой контейнер |
| Singleton, зарегистрированный в дочернем контейнере | Этот дочерний контейнер |
| Scoped-сервис | Request scope |
| Transient | Вызывающий код |

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
