# Ошибки

InferDI бросает явные ошибки при неправильном использовании графа и жизненного цикла. Оставляйте эти сообщения видимыми в тестах, чтобы ошибки регистрации падали рано.

| Что произошло | Форма сообщения |
| --- | --- |
| `.get(k)` для отсутствующего ключа | `Key "k" not found` |
| Resolve уже очищенного контейнера | `Container is disposed (key: "k")` |
| Resolve через очищенного предка | `Ancestor container is disposed (key: "k")` |
| `createScope()` после dispose | `Cannot create scope from a disposed container` |
| Регистрация после dispose | `Cannot register on a disposed container (key: "k")` |
| Resolve scoped-ключа из root при `fast: false` | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| Нарушение времени жизни singleton | `Singleton "x" cannot depend on scoped "y"...` |
| Синхронный цикл | `Circular dependency detected: a -> b -> a...` |
| Синхронный dispose для async-ресурса | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Синхронный dispose закешированной async-инициализации | `Sync [Symbol.dispose] called on a container that cached a Promise from an async factory...` |
| Поздний override | `Cannot override "k" because it has already been resolved...` |
| Override на очищенном контейнере | `Cannot override on a disposed container (key: "k")` |

Перед сообщением об ошибочном использовании sync dispose подписывается на rejection закешированного нативного Promise. Поздний отказ не попадёт в `unhandledRejection`, но синхронный путь всё равно не может дождаться ресурса или закрыть его. Пользовательский Promise-like объект не запускается через `.then()`.

Во время async dispose зависимость и зависящие от неё регистрации могут отклонить Promise с одним объектом `Error`. InferDI сообщает этот объект один раз. Разные объекты остаются отдельными причинами `AggregateError`, даже если их сообщения совпадают.

## Циклы async-фабрик

Декларативные зависимости из `registerAsyncFactory(..., deps, ...)` проходят синхронный preflight, поэтому существующий cycle guard отклоняет цикл до запуска тела фабрики.

Циклы после Promise-границы не детектируются. Это относится к Promise-valued callback в `registerFactory` и к захваченным контейнерам, которые используются после `await`. Если обе стороны ждут друг друга, вызывающий код получает Promise, который никогда не завершится.

Исправляйте async-циклы архитектурно:

- разделите общую инициализацию
- поднимите одну сторону в более ранний сервис
- используйте `Lazy<singleton>` только для синхронных singleton-зависимостей
- добавьте development-timeout вокруг подозрительных top-level awaits

## Ошибки очистки в адаптерах

Ошибки очистки в адаптере после уже созданного ответа никогда не показываются клиенту. Они уходят в `onDisposeError` или fallback-приёмник адаптера.

Ошибки setup отличаются: наружу выходит только исходная ошибка setup, а сбой очистки во время setup teardown уходит в приёмник ошибок и не добавляется к проброшенной ошибке.
