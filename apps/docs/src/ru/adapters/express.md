# Адаптер Express

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) добавляет middleware для Express 5. Оно создаёт один скоуп на запрос, сохраняет его в `req.di` и освобождает после события `finish` или `close` у объекта ответа Node.js.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { Container } from '@inferdi/inferdi'
import { inferdiExpress } from '@inferdi/express'
```

## Скоуп запроса {#scope-запроса}

```ts
type RequestContext = {
  requestId: string
  userId?: string
  ip?: string
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

declare global {
  namespace Express {
    interface Request {
      di: RequestScope
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  createScope: (_root, req) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: req.get('x-user-id') || undefined,
    ip: req.ip
  })
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

Адаптер не расширяет глобальный `Express.Request` типами `any`, `unknown` или базовым типом контейнера. Конкретный тип запроса объявляет приложение.

## Опции

| Опция | По умолчанию | Назначение |
| --- | --- | --- |
| `container` | обязательна | Корневой контейнер. Middleware его не очищает. |
| `createScope` | `root.createScope()` | Позволяет задать создание скоупа запроса. |
| `setupScope` | нет | Выполняет дополнительную инициализацию после создания скоупа. |
| `disposeScope` | `scope.dispose()` | Позволяет задать освобождение ресурсов. |
| `autoDispose` | `true` | `false` или предикат, вернувший `false`, передаёт владение приложению. |
| `onDisposeError` | `console.error` | Обработчик ошибок очистки. |

## Стриминг и фоновая работа

Обычные потоковые ответы в Express не требуют отключения автоочистки, потому что адаптер ждёт `finish` или `close`.

Используйте `skipInferdiDispose(req)`, когда работа намеренно переживает HTTP-ответ:

```ts
import { skipInferdiDispose } from '@inferdi/express'

app.get('/background', (req, res) => {
  skipInferdiDispose(req)
  const scope = req.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  res.status(202).json({ status: 'queued' })
})
```

## Ограничение для упавших запросов

Express не может надёжно определить, нужно ли принудительно освободить скоуп после обработанной ошибки маршрута, если автоочистка была пропущена. Middleware Express работает через обратные вызовы: после `next()` адаптер не видит ошибку последующего обработчика, если её перехватил обработчик ошибок. Если маршрут вызвал `skipInferdiDispose(req)`, а затем завершился ошибкой, скоуп остаётся во владении приложения. Освобождайте его в своём обработчике ошибок или не отключайте автоочистку на таких маршрутах.

Один вызов `skipInferdiDispose(req)` действует на все экземпляры middleware InferDI в этом запросе. Приложение должно сохранить и самостоятельно освободить каждый скоуп; `req.di` содержит скоуп, назначенный последним middleware.
