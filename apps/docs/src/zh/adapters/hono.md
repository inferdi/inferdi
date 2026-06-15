---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/adapters/hono#breadcrumb"
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
          "name": "Hono 适配器"
          "item": "https://inferdi.com/zh/adapters/hono"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/adapters/hono#article"
      "headline": "InferDI Hono 适配器 —— @inferdi/hono"
      "name": "Hono 适配器"
      "description": "@inferdi/hono 是 Hono v4 中间件：它在每次调用时创建一个请求作用域，通过 Hono 上下文变量暴露它，并在受限的路由管线完成之后释放它 —— 适用于边缘环境中的 Cloudflare Workers 和 Bun。"
      "url": "https://inferdi.com/zh/adapters/hono"
      "mainEntityOfPage": "https://inferdi.com/zh/adapters/hono"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Hono v4, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Hono, Hono v4, 中间件, 上下文变量, 边缘, Cloudflare Workers, Bun, 依赖注入"
      "articleSection": "适配器"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/hono"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=16, Bun, Cloudflare Workers"
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

# Hono 适配器

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) 是 Hono v4 中间件。它在每次中间件调用时创建一个请求作用域，通过 Hono 上下文变量暴露它，并在受限的路由管线完成之后释放它。

## 安装

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
```

## 请求作用域

```ts
const root = buildRootContainer()
type AppEnv = InferdiHonoEnv<typeof root>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  setupScope: (scope, c) => {
    const ctx = scope.get('request')
    ctx.requestId = crypto.randomUUID()
    ctx.userId = c.req.header('x-user-id')
  },
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` 等价于 `c.var.di`。

## 自定义键

```ts
type AppEnv = InferdiHonoEnv<typeof root, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({ container: root, key: 'container' }))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

该适配器不会全局增强 Hono 的 `ContextVariableMap`，因此缺失的中间件对 TypeScript 仍然可见。

## 选项

| 选项 | 默认值 | 描述 |
| --- | --- | --- |
| `container` | 必填 | 根容器。该中间件从不释放它。 |
| `key` | `'di'` | 上下文变量键。 |
| `createScope` | `root.createScope()` | 自定义请求作用域创建。 |
| `setupScope` | 无 | 在路由处理器之前填充作用域。 |
| `disposeScope` | `scope.dispose()` | 自定义释放。 |
| `autoDispose` | `true` | `false` 或返回 `false` 的谓词会转移所有权。 |
| `onDisposeError` | `console.error` | 清理失败的接收端。 |

## 流式

Hono 的流式辅助函数可能在流回调完成之前就返回一个 `Response`。请调用 `skipInferdiDispose(c)`，并从流的生命周期中释放作用域。

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

`skipInferdiDispose` 仅在响应成功时抑制清理。错误路径仍然会释放。
