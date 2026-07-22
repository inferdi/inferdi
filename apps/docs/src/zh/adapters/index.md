---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/adapters/#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "适配器"
          "item": "https://inferdi.com/zh/adapters/"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/adapters/#article"
      "headline": "InferDI 框架适配器 —— 概览"
      "name": "框架适配器"
      "description": "每个 InferDI 适配器都会创建请求作用域，通过框架原生位置公开它，并在安全的生命周期节点释放它。"
      "url": "https://inferdi.com/zh/adapters/"
      "mainEntityOfPage": "https://inferdi.com/zh/adapters/"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, @inferdi/inferdi, Fastify, Hono, Koa, Express, Elysia"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 适配器, 请求作用域, Fastify, Hono, Koa, Express, Elysia, 中间件, 依赖注入"
      "articleSection": "适配器"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
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

# 框架适配器

每个适配器都会为每个请求创建恰好一个请求作用域，将其暴露在框架原生的位置，并在框架安全的完成时机释放它 —— 同时保留应用所拥有的具体容器类型，因此 `request.di` 是完全带类型的，而不是 `any` 或某个基类容器。

这就是适配器的全部职责。适配器只是轻薄的生命周期胶水代码：让 [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) 保持零依赖的那套设计，同样把装饰器、控制器扫描、处理器参数注入和路由发现挡在内核之外。你选择接入的是框架的请求生命周期，而不是框架对依赖注入的理解。

## 软件包

| 软件包 | 框架 | 作用域位置 | 仅根模式 |
| --- | --- | --- | --- |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di` | 支持 |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Hono v4 | `c.var.di` | 不支持 |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | Koa v3 | `ctx.state.di` | 不支持 |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5 | `req.di` | 不支持 |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | Elysia v1 | `context.di` | 支持 |

## 通用生命周期契约

在作用域模式下，每个适配器对每个请求都会执行相同的步骤：

1. 在请求开始时，从根容器**创建**作用域（`createScope`，默认为 `root.createScope()`）。
2. 在 setup 运行**之前**，将其**暴露**在框架原生的位置（`request.di`、`ctx.state.di`、`c.var.di` 或 Elysia 上下文键），这样 setup 失败以及你的清理钩子都能观察到同一个槽位。
3. 用 `setupScope` **配置**作用域，以填充由请求派生的状态 —— 请求 id、已认证用户、客户端 IP。它可以是异步的。
4. **处理**请求：路由处理器和框架的错误处理器从暴露的作用域解析服务。
5. 在框架安全的完成时机**释放**作用域（`disposeScope`，默认为 `scope.dispose()`），除非所有权已被转移。

### 共享选项

| 选项 | 默认值 | 用途 |
| --- | --- | --- |
| `container` | 必填 | 暴露给应用的根容器。适配器从不释放它（Fastify 的可选 `disposeRootOnClose` 除外）。 |
| `createScope` | `root.createScope()` | 构建每个请求的作用域。可以是异步的。 |
| `setupScope` | 无 | 在处理器运行前填充作用域。可以是异步的。 |
| `disposeScope` | `scope.dispose()` | 自定义清理。可以是同步或异步的。 |
| `autoDispose` | `true` | 取 `false`，或返回 `false` 的谓词，将释放交给你的代码处理。 |
| `onDisposeError` | 各适配器各自的接收端 | 接收请求作用域的释放失败：Fastify 用 `request.log.error`，Koa 用 `ctx.app.emit('error')`，其余用 `console.error`。 |
| `skipInferdiDispose(...)` | — | 将某个请求标记为由应用拥有，用于流式或后台工作。 |

### 错误与所有权规则

- **setup 失败只暴露原始错误。** 如果 `setupScope` 抛出，适配器会释放尚未构建完成的作用域并重新抛出该错误。此次清理过程中发生的清理失败会交给 `onDisposeError`（或接收端），绝不会被聚合进所暴露的错误中。
- **失败的请求仍然会释放。** `skipInferdiDispose` 仅在响应*成功*时抑制清理；错误路径无论如何都会释放。Express 是例外 —— 它的回调式中间件无法观察到一个已被处理的路由错误，因此一个被跳过且失败的 Express 请求仍归应用所有。
- **`autoDispose: false` 和 `skipInferdiDispose` 会转移所有权。** 此后由你的代码负责在正确的框架边界处释放作用域。
- **响应产生之后发生的清理错误会被路由到接收端并吞掉。** 此时响应已经发送，因此一个迟到的清理失败绝不会破坏它。

## 重要差异

| 适配器 | 差异 |
| --- | --- |
| Fastify | 在 `onResponse` 中释放；中止清理使用 `onRequestAbort`；可通过 `disposeRootOnClose` 选择启用根容器释放。 |
| Hono | 在 `await next()` 之后释放；流式辅助函数可能在流工作完成之前就返回，因此流式路由通常需要 `skipInferdiDispose`。 |
| Koa | 等待 Node 响应的 `finish` 或 `close`，因此普通的流式响应体不需要跳过。 |
| Express | 无法从回调式中间件检测到一个已被处理的下游路由错误；一个被跳过且失败的请求仍归应用所有。 |
| Elysia | 清理绑定到 `onAfterResponse`；如果该钩子从未触发，适配器就无法释放作用域所持有的资源。 |
