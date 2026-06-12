# Fastify 适配器

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) 是一个 Fastify v5 插件。在作用域模式下，它将根容器暴露为 `app.di`，在 `onRequest` 中创建一个请求作用域，将其暴露为 `request.di`，并在 `onResponse` 中释放它。

## 安装

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
```

## 请求作用域

通过模块增强发布你的具体容器类型：

```ts
const root = buildRootContainer()
const app = Fastify()

type RootContainer = typeof root
type RequestContainer = ReturnType<RootContainer['createScope']>

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
  setupScope: (scope: RequestContainer, request) => {
    const ctx = scope.get('request')
    ctx.requestId = request.id
    ctx.ip = request.ip
  },
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

Fastify 的 `app.register` 无法为内联钩子推导出足够深的插件泛型，因此当你需要具体的作用域类型时，请为钩子参数添加类型标注。

## 选项

| 选项 | 默认值 | 描述 |
| --- | --- | --- |
| `container` | 必填 | 暴露为 `app.di` 的根容器。 |
| `scopePerRequest` | `true` | 设为 `false` 启用仅根模式。 |
| `createScope` | `root.createScope()` | 自定义请求作用域创建。可以是异步的。 |
| `setupScope` | 无 | 在 `onRequest` 中填充作用域。可以是异步的。 |
| `disposeScope` | `scope.dispose()` | 自定义释放。可以是同步或异步的。 |
| `autoDispose` | `true` | `false` 或返回 `false` 的谓词会将所有权转移给应用代码。 |
| `disposeRootOnClose` | `false` | 在 `fastify.close()` 期间释放根容器。 |
| `onDisposeError` | `request.log.error` | 请求作用域释放失败的接收端。 |

## 仅根模式

当处理器只需要单例服务时，使用仅根模式：

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

仅根模式不会安装任何请求装饰，也不会安装任何请求生命周期钩子。

## 生命周期说明

- `request.di` 只在 setup 成功之后才会暴露。
- setup 失败会释放尚未构建完成的作用域，并只暴露原始的 setup 错误。
- 清理钩子在运行期间能观察到 `request.di`。
- 失败的请求会忽略 `skipInferdiDispose` 并仍然释放，但仍受 `autoDispose` 约束。
- 客户端中止的清理在作用域已暴露之后于 `onRequestAbort` 中运行。
- 只有在启用 `disposeRootOnClose` 时，根容器释放错误才会通过 `fastify.close()` 传播。
