---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "指南"
          "item": "https://inferdi.com/zh/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "示例"
          "item": "https://inferdi.com/zh/guide/examples"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples#article"
      "headline": "InferDI 示例 — 框架与运行时模式"
      "name": "示例"
      "description": "涵盖后端、API 层、全栈框架、运行时、前端和 worker 的 InferDI 参考示例索引。每个分组都展示了在何处构建根容器、创建请求作用域以及释放它。"
      "url": "https://inferdi.com/zh/guide/examples"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 示例, 模式, 依赖注入, 请求作用域, 框架, 运行时"
      "articleSection": "指南"
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

# 示例

仓库将示例保留为仅在 GitHub 上提供的参考片段。根包不会安装它们的框架依赖，不会对 `examples/` 目录进行类型检查，也不会将其发布到 npm。

将相关模式复制到你的应用中，并在那里安装框架依赖。

下面的每个分组都对应 [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples) 中的一个目录。打开某个分组页面，即可在同一页面上对比该分组中的各个示例。

## 从这里开始

先阅读 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。大多数服务端示例都会导入这个构建器，从而让它们的文件能专注于框架接线。

| 分组 | 对比内容 |
| --- | --- |
| [JavaScript 用法](/zh/guide/examples/javascript) | Node ESM、Node CommonJS 以及浏览器打包器用法 |
| [后端框架](/zh/guide/examples/backend) | Fastify、Hono、Koa、Express 和 Elysia 的请求作用域适配器 |
| [API 层](/zh/guide/examples/api-layers) | tRPC、Apollo Server 和 GraphQL Yoga 的请求作用域边界 |
| [全栈框架](/zh/guide/examples/fullstack) | Next.js App Router 和 Remix 的 loader/action 作用域 |
| [运行时与边缘平台](/zh/guide/examples/runtimes-edge) | Node HTTP、Bun、Deno、Cloudflare Workers、Vercel Edge、Deno Deploy 和 Supabase Edge |
| [前端框架](/zh/guide/examples/frontend) | React、React Native、Vue 和 Svelte 的功能作用域 |
| [机器人、队列与 CLI](/zh/guide/examples/workers-cli) | Telegraf、Grammy、BullMQ、Commander 和 Yargs 的操作作用域 |

## 如何阅读这些分组

将 `examples/_shared/container.ts` 用作服务端示例的应用依赖图。分组页面聚焦于生命周期所有权：作用域在何处创建、在何处暴露、以及在何处释放。

对于服务端和 worker 示例，对比框架/平台的生命周期钩子。对于前端示例，对比挂载和卸载的边界。
