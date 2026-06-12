# Ошибки

InferDI бросает явные ошибки при неправильном использовании графа и жизненного цикла. Оставляйте эти сообщения видимыми в тестах, чтобы ошибки регистрации падали рано.

| Что произошло | Форма сообщения |
| --- | --- |
| `.get(k)` для отсутствующего ключа | `Key "k" not found` |
| Resolve уже очищенного контейнера | `Container is disposed (key: "k")` |
| Resolve через очищенного предка | `Ancestor container is disposed (key: "k")` |
| `createScope()` после dispose | `Cannot create scope from a disposed container` |
| Нарушение времени жизни singleton | `Singleton "x" cannot depend on scoped "y"...` |
| Синхронный цикл | `Circular dependency detected: a -> b -> a...` |
| Синхронный dispose для async-ресурса | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Поздний override | `Cannot override "k" because it has already been resolved...` |
| Override на очищенном контейнере | `Cannot override on a disposed container (key: "k")` |

## Циклы async-фабрик

Циклы между async-фабриками не детектируются. Фабрика, которая ждёт другую async-фабрику, может продолжиться уже после очистки синхронного стека resolve. Если обе стороны ждут друг друга, вызывающий код получает pending promise, который никогда не завершится.

Исправляйте async-циклы архитектурно:

- разделите общую инициализацию
- поднимите одну сторону в более ранний сервис
- используйте `Lazy<singleton>` только если обе стороны singleton
- добавьте development-timeout вокруг подозрительных top-level awaits

## Ошибки очистки в адаптерах

Ошибки очистки в адаптере после уже созданного ответа никогда не показываются клиенту. Они уходят в `onDisposeError` или fallback-приёмник адаптера.

Ошибки setup отличаются: наружу выходит только исходная ошибка setup, а сбой очистки во время setup teardown уходит в приёмник ошибок и не добавляется к проброшенной ошибке.
