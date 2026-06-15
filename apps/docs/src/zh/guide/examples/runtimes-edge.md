---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples/runtimes-edge#breadcrumb"
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
        - "@type": "ListItem"
          "position": 4
          "name": "运行时与边缘平台"
          "item": "https://inferdi.com/zh/guide/examples/runtimes-edge"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples/runtimes-edge#article"
      "headline": "在 Node、Bun、Deno 和边缘运行时上使用 InferDI"
      "name": "运行时与边缘平台"
      "description": "在底层 Node HTTP、Bun serve、Deno HTTP 和边缘函数中使用模块级的根容器并为每个请求创建一个作用域 —— 有界限的处理函数使用 await using，流式或后台工作则显式释放。"
      "url": "https://inferdi.com/zh/guide/examples/runtimes-edge"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples/runtimes-edge"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Node.js, Bun, Deno, Supabase Edge Functions, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 运行时, 边缘, Node HTTP, Bun, Deno, Supabase Edge Functions, await using, 请求作用域"
      "articleSection": "示例"
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

# 运行时与边缘平台

运行时示例使用模块级的根容器，并为每个请求创建一个作用域。有界限的处理函数可以使用 `await using`；流式或后台工作应在该工作完成后再释放。

大多数示例共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。Supabase Edge Functions 在保持相同请求作用域规范的同时，使用了本地的工厂替换。

| 示例 | 展示内容 |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | 底层 Node HTTP 生命周期，配合响应清理 |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Bun `serve` 请求作用域 |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Deno HTTP 请求作用域 |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Cloudflare Workers 请求作用域与 `ctx.waitUntil` 时序 |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Vercel Edge 请求作用域与后台清理 |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Deno Deploy 请求作用域与 `info.waitUntil` 清理 |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | 使用自定义工厂替换的 Supabase Edge Functions |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

仓库文件：[`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

仓库文件：[`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

仓库文件：[`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

仓库文件：[`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

仓库文件：[`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

仓库文件：[`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

仓库文件：[`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
