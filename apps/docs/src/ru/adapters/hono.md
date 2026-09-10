# Адаптер Hono

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) добавляет middleware для Hono v4. При каждом вызове middleware создаётся один скоуп запроса. Он доступен через переменные контекста Hono и освобождается после завершения цепочки обработчиков маршрута.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { Container } from '@inferdi/inferdi'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
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
const openRequestScope = (requestId: string, userId?: string) =>
  root.createScope({ request: { requestId, userId } })
type RequestScope = ReturnType<typeof openRequestScope>
type AppEnv = InferdiHonoScopeEnv<RequestScope>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  createScope: (_root, c) => openRequestScope(
    crypto.randomUUID(),
    c.req.header('x-user-id')
  )
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` эквивалентен `c.var.di`.

## Собственный ключ

```ts
type AppEnv = InferdiHonoScopeEnv<RequestScope, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({
  container: root,
  key: 'container',
  createScope: (_root, c) => openRequestScope(
    crypto.randomUUID(),
    c.req.header('x-user-id')
  )
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

Адаптер не расширяет глобальный тип `ContextVariableMap` в Hono. Поэтому TypeScript может заметить, что middleware не подключено.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `key` | `'di'` | Ключ переменной контекста. |
| `createScope` | `root.createScope()` | Позволяет задать создание скоупа запроса. |
| `setupScope` | нет | Выполняет дополнительную инициализацию после создания скоупа. |
| `disposeScope` | `scope.dispose()` | Позволяет задать освобождение ресурсов. |
| `autoDispose` | `true` | `false` или предикат, вернувший `false`, передаёт владение приложению. |
| `onDisposeError` | `console.error` | Обработчик ошибок очистки. |

## Стриминг

Функции потоковой передачи Hono могут вернуть `Response` до завершения обработчика потока. В таких маршрутах вызывайте `skipInferdiDispose(c)` и освобождайте скоуп при завершении потока.

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

`skipInferdiDispose` пропускает очистку только при успешном ответе. При ошибке скоуп всё равно освобождается, если это допускает `autoDispose`.
