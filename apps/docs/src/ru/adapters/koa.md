# Адаптер Koa

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) добавляет middleware для Koa v3. Оно создаёт один скоуп на запрос, сохраняет его в `ctx.state.di` и освобождает после события `finish` или `close` у объекта ответа Node.js.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { Container } from '@inferdi/inferdi'
import { inferdiKoa, type InferdiKoaState } from '@inferdi/koa'
```

## Скоуп запроса {#scope-запроса}

```ts
type RequestContext = {
  requestId: string
  userId?: string
  ip: string
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
const openRequestScope = (request: RequestContext) =>
  root.createScope({ request })
type RequestScope = ReturnType<typeof openRequestScope>

declare module 'koa' {
  interface DefaultState {
    di: RequestScope
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  createScope: (_root, ctx) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: ctx.get('x-user-id') || undefined,
    ip: ctx.ip
  })
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## Собственный ключ состояния {#собственныи-ключ-state}

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<RequestScope, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({
  container: root,
  key: 'container',
  createScope: (_root, ctx) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: ctx.get('x-user-id') || undefined,
    ip: ctx.ip
  })
}))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `key` | `'di'` | Ключ в объекте состояния Koa. |
| `createScope` | `root.createScope()` | Позволяет задать создание скоупа запроса. |
| `setupScope` | нет | Выполняет дополнительную инициализацию после создания скоупа. |
| `disposeScope` | `scope.dispose()` | Позволяет задать освобождение ресурсов. |
| `autoDispose` | `true` | `false` или предикат, вернувший `false`, передаёт владение приложению. |
| `onDisposeError` | `ctx.app.emit('error')` | Обработчик ошибок очистки. |

## Стриминг

Обычные тела потоковых ответов в Koa не требуют отключения автоочистки. Адаптер ждёт `finish` или `close`.

Используйте `skipInferdiDispose(ctx)` только когда код приложения продолжает использовать скоуп после завершения HTTP-ответа:

```ts
import { skipInferdiDispose } from '@inferdi/koa'

app.use(async (ctx) => {
  skipInferdiDispose(ctx)
  const scope = ctx.state.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  ctx.body = { status: 'queued' }
})
```

Ошибка последующего обработчика всегда освобождает скоуп; успешные запросы с пропущенной автоочисткой переходят во владение приложения.

Один вызов `skipInferdiDispose(ctx)` действует на все экземпляры middleware InferDI в этом запросе, включая экземпляры с разными ключами состояния. Приложение должно самостоятельно освободить каждый сохранённый скоуп.
