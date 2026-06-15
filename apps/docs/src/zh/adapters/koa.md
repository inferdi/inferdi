---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/adapters/koa#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "适配器"
          "item": "https://inferdi.com/zh/adapters/"
        - "@type": "ListItem"
          "position": 3
          "name": "Koa 适配器"
          "item": "https://inferdi.com/zh/adapters/koa"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/adapters/koa#article"
      "headline": "InferDI Koa 适配器 — @inferdi/koa"
      "name": "Koa 适配器"
      "description": "@inferdi/koa 是 Koa v3 中间件：它创建一个请求作用域，将其暴露为 ctx.state.di，并在 Node 响应 finish 或 close 之后释放它——带有类型化的状态键和清理钩子。"
      "url": "https://inferdi.com/zh/adapters/koa"
      "mainEntityOfPage": "https://inferdi.com/zh/adapters/koa"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Koa v3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Koa, Koa v3, 中间件, ctx.state.di, 响应生命周期, 依赖注入"
      "articleSection": "适配器"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/koa"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=18"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

# Koa 适配器

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) 是 Koa v3 中间件。它创建一个请求作用域，将其暴露为 `ctx.state.di`，并在 Node 响应 finish 或 close 之后释放它。

## 安装

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
```

## 请求作用域

```ts
const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    di: InferdiScopeOf<typeof root>
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  setupScope: (scope, ctx) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = ctx.get('x-user-id') || undefined
    request.ip = ctx.ip
  },
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## 自定义状态键

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState, type InferdiScopeOf } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<InferdiScopeOf<typeof root>, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({ container: root, key: 'container' }))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## 选项

| 选项 | 默认值 | 描述 |
| --- | --- | --- |
| `container` | 必填 | 根容器。该中间件从不释放它。 |
| `key` | `'di'` | Koa 状态键。 |
| `createScope` | `root.createScope()` | 自定义请求作用域创建。 |
| `setupScope` | 无 | 在下游中间件之前填充作用域。 |
| `disposeScope` | `scope.dispose()` | 自定义释放。 |
| `autoDispose` | `true` | `false` 或返回 `false` 的谓词会转移所有权。 |
| `onDisposeError` | `ctx.app.emit('error')` | 清理失败的接收端。 |

## 流式

普通的 Koa 流式响应体不需要跳过。适配器会等待 `finish` 或 `close`。

仅当应用代码有意将作用域保留到 HTTP 响应边界之外时（例如后台工作），才使用 `skipInferdiDispose(ctx)`：

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

下游错误总是会释放作用域；成功且被跳过的请求则归应用所有。
