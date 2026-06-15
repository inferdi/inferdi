---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/installation#breadcrumb"
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
          "name": "安装"
          "item": "https://inferdi.com/zh/guide/installation"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/installation#article"
      "headline": "从 npm 或 JSR 安装 InferDI"
      "name": "安装"
      "description": "在 Node.js、Bun 和 Deno 上从 npm 或 JSR 安装 @inferdi/inferdi 及其框架适配器。包名与版本一致，零运行时依赖，无需构建步骤或 reflect-metadata。"
      "url": "https://inferdi.com/zh/guide/installation"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/installation"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16, Bun, Deno"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, 安装, npm, JSR, Node.js, Bun, Deno, TypeScript 依赖注入"
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

# 安装

InferDI 以一致的包名和一致的版本号发布到 npm 和 JSR。在 Node 和 Bun 上使用兼容 npm 的安装方式，或在 Deno 以及偏好 TypeScript 源码的运行时上使用 JSR。

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

你也可以直接导入：

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## 环境要求

| 运行时 | 要求 |
| --- | --- |
| Node.js | 内核包需要 16 或更高版本 |
| Bun | 1.0 或更高版本 |
| Deno | 1.40 或更高版本 |
| TypeScript | 推荐 5.2+ 以支持 `using` / `await using` 语法 |

在原生 `Symbol.dispose` 和 `Symbol.asyncDispose` 出现之前的 Node 版本上，InferDI 会在导入时安装一个 symbol polyfill，使显式资源管理（Explicit Resource Management）的互操作仍能正常工作。

## 适配器安装

安装内核包、适配器包以及框架对等依赖：

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

每个适配器都有专门的页面，介绍其生命周期规则和类型配置。
