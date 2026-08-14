# Адаптер Hono

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) - это middleware для Hono v4. Он создаёт один scope запроса на вызов middleware, выставляет его через переменные контекста Hono и очищает после завершения ограниченного pipeline маршрута.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
```

## Scope запроса

```ts
const root = buildRootContainer()
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

Адаптер не делает global augmentation для Hono `ContextVariableMap`, поэтому пропущенное middleware остаётся видимым для TypeScript.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `key` | `'di'` | Ключ переменной контекста. |
| `createScope` | `root.createScope()` | Пользовательское создание scope запроса. |
| `setupScope` | нет | Выполняет дополнительную инициализацию после создания scope. |
| `disposeScope` | `scope.dispose()` | Пользовательская очистка. |
| `autoDispose` | `true` | `false` или предикат `false` передаёт владение. |
| `onDisposeError` | `console.error` | Приёмник ошибок очистки. |

## Стриминг

Helpers для стриминга в Hono могут вернуть `Response` до завершения stream callback. В таких маршрутах вызывайте `skipInferdiDispose(c)` и очищайте scope из жизненного цикла stream.

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

`skipInferdiDispose` подавляет очистку только для успешного ответа. Пути с ошибкой всё равно очищают scope.
