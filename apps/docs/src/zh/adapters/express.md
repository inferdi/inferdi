# Express 适配器

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) 是 Express 5 中间件。它创建一个请求作用域，将其暴露为 `req.di`，并在 Node 响应 finish 或 close 之后释放它。

## 安装

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
```

## 请求作用域

```ts
const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  setupScope: (scope, req) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = req.get('x-user-id') || undefined
    request.ip = req.ip
  },
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

该适配器不会用 `any`、`unknown` 或某个基类容器全局增强 `Express.Request`。具体的请求类型由应用自己拥有。

## 选项

| 选项 | 默认值 | 描述 |
| --- | --- | --- |
| `container` | 必填 | 根容器。该中间件从不释放它。 |
| `createScope` | `root.createScope()` | 自定义请求作用域创建。 |
| `setupScope` | 无 | 在路由处理器之前填充作用域。 |
| `disposeScope` | `scope.dispose()` | 自定义释放。 |
| `autoDispose` | `true` | `false` 或返回 `false` 的谓词会转移所有权。 |
| `onDisposeError` | `console.error` | 清理失败的接收端。 |

## 流式与后台工作

普通的 Express 流式响应不需要跳过，因为适配器会等待 `finish` 或 `close`。

当工作有意比 HTTP 响应存活更久时，使用 `skipInferdiDispose(req)`：

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

## 失败请求的注意事项

与其他适配器不同，Express 无法在一个已被处理的路由错误上可靠地强制释放被跳过的作用域。Express 中间件是回调式的；在 `next()` 返回之后，适配器无法观察到一个之后被错误处理器处理掉的下游异常。如果某个路由调用了 `skipInferdiDispose(req)` 然后失败，该作用域仍归应用所有。请在你自己的错误路径中释放它，或者避免将跳过与可能抛出的路由组合使用。
