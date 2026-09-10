# Адаптер Elysia

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) интегрирует InferDI с Elysia v1. В режиме с отдельным скоупом на запрос плагин создаёт скоуп, добавляет его в контекст Elysia и освобождает в `onAfterResponse`. Пользовательские обработчики ошибок также могут обращаться к этому скоупу.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { Container } from '@inferdi/inferdi'
import { inferdiElysia } from '@inferdi/elysia'
```

## Скоуп запроса {#scope-запроса}

```ts
type RequestContext = {
  requestId: string
  userId?: string
}

class Users {
  constructor(readonly request: RequestContext) {}

  profile(id: string) {
    return { id, userId: this.request.userId }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('users', Users, ['request'], 'scoped')

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    createScope: (_root, { request }) => root.createScope({
      request: {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      }
    })
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

Собственный ключ контекста:

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    key: 'container',
    createScope: (_root, { request }) => root.createScope({
      request: {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      }
    })
  }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

Маршруты нужно регистрировать после `.use(inferdiElysia(...))` в типизированной цепочке Elysia.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. |
| `key` | `'di'` | Ключ контекста Elysia. |
| `scopePerRequest` | `true` | `false` для режима без скоупа запроса. |
| `createScope` | `root.createScope()` | Позволяет задать создание скоупа запроса. |
| `setupScope` | нет | Выполняет дополнительную инициализацию после создания скоупа. |
| `setupValidatedScope` | нет | Выполняет дополнительную инициализацию после валидации Elysia. |
| `disposeScope` | `scope.dispose()` | Позволяет задать освобождение ресурсов. |
| `autoDispose` | `true` | `false` или предикат, вернувший `false`, передаёт владение приложению. |
| `onDisposeError` | `console.error` | Обработчик ошибок очистки. |

## Режим без скоупа запроса {#режим-без-scope-запроса}

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

В этом режиме адаптер предоставляет корневой контейнер и не устанавливает хуки жизненного цикла скоупа запроса. TypeScript отклоняет опции, предназначенные только для режима со скоупами.

## Заметки о жизненном цикле

Очистка привязана к `onAfterResponse`. Если Elysia не вызывает этот хук, адаптер не может освободить ресурсы скоупа запроса. Служебное состояние запроса хранится через слабые ссылки, но они не заменяют освобождение ресурсов: для него всё равно нужен хук жизненного цикла.

Используйте `setupScope` для настройки до валидации. В `setupValidatedScope` доступны уже проверенные тело запроса, параметры запроса и маршрута, заголовки и cookies.

## Стриминг

Elysia может вернуть потоковый `Response` до завершения потока. Если scoped-сервисы нужны и после возврата из обработчика маршрута, вызовите `skipInferdiDispose(context)` и освободите скоуп самостоятельно.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` пропускает очистку только при успешном ответе. При ошибке скоуп всё равно освобождается, если это допускает `autoDispose`.
