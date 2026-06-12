# Elysia 适配器

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) 是一个 Elysia v1 插件。在作用域模式下，它创建一个请求作用域，将其暴露在 Elysia 上下文上，使其对用户的错误处理器保持可用，并从 `onAfterResponse` 中释放它。

## 安装

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
```

## 请求作用域

```ts
const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    setupScope: (scope, { request }) => {
      const ctx = scope.get('request')
      ctx.requestId = crypto.randomUUID()
      ctx.userId = request.headers.get('x-user-id') ?? undefined
    },
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

使用自定义上下文键：

```ts
const app = new Elysia()
  .use(inferdiElysia({ container: root, key: 'container' }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

在带类型的 Elysia 链中，路由必须注册在 `.use(inferdiElysia(...))` 之后。

## 选项

| 选项 | 默认值 | 描述 |
| --- | --- | --- |
| `container` | 必填 | 根容器。 |
| `key` | `'di'` | Elysia 上下文键。 |
| `scopePerRequest` | `true` | 设为 `false` 启用仅根模式。 |
| `createScope` | `root.createScope()` | 自定义请求作用域创建。 |
| `setupScope` | 无 | 在验证和路由处理器之前填充。 |
| `setupValidatedScope` | 无 | 在 Elysia 验证之后填充。 |
| `disposeScope` | `scope.dispose()` | 自定义释放。 |
| `autoDispose` | `true` | `false` 或返回 `false` 的谓词会转移所有权。 |
| `onDisposeError` | `console.error` | 清理失败的接收端。 |

## 仅根模式

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

仅根模式暴露根容器，且不会安装任何请求作用域生命周期钩子。仅作用域模式可用的选项会被静态拒绝。

## 生命周期说明

清理在生命周期上绑定到 `onAfterResponse`。如果 Elysia 从未触达该钩子，适配器就无法释放请求作用域所持有的资源。每个请求的簿记是弱持有的，但资源的释放需要该生命周期钩子运行。

对于在验证之前就需要的值，使用 `setupScope`。对于派生自已验证的 body、query、params、headers 或 cookies 的值，使用 `setupValidatedScope`。

## 流式

Elysia 可能在流耗尽之前就产生一个流式 `Response`。如果在路由返回之后还会用到作用域级服务，请调用 `skipInferdiDispose(context)` 并自行释放作用域。

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

`skipInferdiDispose` 仅抑制成功路径的清理。错误路径仍然会释放。
