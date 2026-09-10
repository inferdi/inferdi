# Адаптер Fastify

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) интегрирует InferDI с Fastify v5. Плагин предоставляет корневой контейнер через `app.di`. В режиме с отдельным скоупом на запрос он создаёт скоуп в `onRequest`, сохраняет его в `request.di` и освобождает в `onResponse`.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { Container } from '@inferdi/inferdi'
import { inferdiFastify } from '@inferdi/fastify'
```

## Скоуп запроса {#scope-запроса}

Опубликуйте конкретные типы контейнеров через расширение модуля:

```ts
type RequestContext = {
  requestId: string
  ip: string
}

class Users {
  constructor(readonly request: RequestContext) {}

  profile(id: string) {
    return { id, requestId: this.request.requestId }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('users', Users, ['request'], 'scoped')
const app = Fastify()

type RootContainer = typeof root
const openRequestScope = (request: FastifyRequest) => root.createScope({
  request: {
    requestId: request.id,
    ip: request.ip
  }
})
type RequestContainer = ReturnType<typeof openRequestScope>

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

await app.register(inferdiFastify, {
  container: root,
  createScope: (_root, request) => openRequestScope(request),
  disposeRootOnClose: true
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

В `app.register` Fastify не может полностью вывести параметры типов плагина для хуков, переданных прямо в опциях. Явно указывайте типы параметров таких хуков.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер, выставленный как `app.di`. |
| `scopePerRequest` | `true` | `false` для режима без скоупа запроса. |
| `createScope` | `root.createScope()` | Позволяет задать создание скоупа запроса. |
| `setupScope` | нет | Выполняет дополнительную инициализацию после создания скоупа. |
| `disposeScope` | `scope.dispose()` | Позволяет задать освобождение ресурсов. |
| `autoDispose` | `true` | `false` или предикат, вернувший `false`, передаёт владение приложению. |
| `disposeRootOnClose` | `false` | Освобождает корневой контейнер во время `fastify.close()`. |
| `onDisposeError` | `request.log.error` | Обработчик ошибок очистки скоупа запроса. |

## Режим без скоупа запроса {#режим-без-scope-запроса}

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

В этом режиме адаптер не добавляет `di` в объект запроса и не устанавливает хуки его жизненного цикла.

## Заметки о жизненном цикле

- `request.di` становится доступным после успешной настройки скоупа.
- При ошибке настройки адаптер освобождает частично подготовленный скоуп и передаёт дальше только исходную ошибку.
- Хуки очистки могут обращаться к `request.di` во время выполнения.
- Если запрос завершился ошибкой, маркер `skipInferdiDispose` игнорируется; решение об очистке по-прежнему зависит от `autoDispose`.
- Если клиент оборвал соединение после того, как скоуп стал доступен, очистка выполняется в `onRequestAbort`.
- Ошибки освобождения корневого контейнера передаются через `fastify.close()` только при включённом `disposeRootOnClose`.

При `autoDispose: false` или предикате, возвращающем `false`, `request.di` остаётся доступным после обработки ответа или обрыва соединения: приложение может освободить сохранённый скоуп самостоятельно.
