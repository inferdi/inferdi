---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples/fullstack#breadcrumb"
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
          "name": "全栈框架"
          "item": "https://inferdi.com/zh/guide/examples/fullstack"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples/fullstack#article"
      "headline": "Next.js 和 Remix 中的 InferDI 作用域"
      "name": "全栈框架"
      "description": "在 Next.js App Router 和 Remix 中为 loader、action、路由处理函数和 server action 使用 InferDI 作用域，并将根容器缓存在 globalThis 上，使其在开发期间能挺过 HMR。"
      "url": "https://inferdi.com/zh/guide/examples/fullstack"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples/fullstack"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Next.js, Remix, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Next.js, Remix, App Router, server actions, loaders, 依赖注入"
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

# 全栈框架

全栈示例为 loader、action、路由处理函数以及 server action 使用作用域。开发构建会将根容器缓存在 `globalThis` 上，以避免在 HMR 期间产生重复的客户端实例。

这两个示例共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。请对比每个框架所等待的操作边界。

| 示例 | 展示内容 |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Next.js App Router 的请求与 Server Action 作用域边界 |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Remix 的 loader 与 action 作用域边界 |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

仓库文件：[`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

仓库文件：[`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
