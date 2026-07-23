---
layout: home

hero:
  name: InferDI
  text: 面向现代 TypeScript 的强类型依赖注入
  tagline: 显式注册服务，让 TypeScript 检查依赖图，并保持精简的运行时解析路径。
  image:
    src: /logo.png
    alt: InferDI
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/quick-start
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/inferdi/inferdi

features:
  - icon:
      src: /fastify.png
      alt: Fastify
    title: Fastify
    details: >-
      Fastify 为速度而生，DI 层不应妨碍它。Fastify v5 适配器接入插件和钩子，在 onRequest 中创建带类型的请求作用域，并在 onResponse 中清理它。
    link: /zh/adapters/fastify
    linkText: Fastify 适配器
  - icon:
      src: /hono.png
      alt: Hono
    title: Hono
    details: >-
      边缘应用需要轻薄的胶水代码和快速的启动。Hono v4 适配器将请求作用域存储在上下文变量中，适配 Workers 和 Bun 部署，并在网络边界保持严格的类型。
    link: /zh/adapters/hono
    linkText: Hono 适配器
  - icon:
      src: /koa.png
      alt: Koa
    title: Koa
    details: >-
      当中间件链保持精简且显式时，Koa 表现最佳。Koa v3 适配器通过带类型的作用域将请求上下文绑定到你的服务，而不会隐藏异步控制流。
    link: /zh/adapters/koa
    linkText: Koa 适配器
  - icon:
      src: /express.png
      alt: Express
    title: Express
    details: >-
      Express 5 仍是许多 Node 应用熟悉的默认选择。这个适配器为那些中间件链提供带类型的请求作用域，让服务不再通过全局变量、手写工厂和散落各处的导入泄漏出去。
    link: /zh/adapters/express
    linkText: Express 适配器
  - icon:
      src: /elysia.png
      alt: Elysia
    title: Elysia
    details: >-
      Elysia v1 已经为 Bun 应用提供了精确的路由类型。该适配器将这条类型链延伸到你的服务中，把每个请求连接到一个 DI 作用域，使自动补全能从处理器一路跟随到业务逻辑。
    link: /zh/adapters/elysia
    linkText: Elysia 适配器
  - icon:
      src: /puzzle.png
      alt: Framework-agnostic core
    title: 与框架无关的内核
    details: "InferDI 没有运行时依赖，可运行于 Node、Bun、Deno、浏览器和 workers。适配器为请求作用域提供可选的生命周期胶水代码。"
    link: /zh/adapters/
    linkText: 适配器如何工作
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "WebSite"
      "@id": "https://inferdi.com/#website"
      "url": "https://inferdi.com/zh/"
      "name": "InferDI"
      "description": "面向现代 TypeScript 的无装饰器、强类型依赖注入。"
      "inLanguage": "zh-CN"
      "publisher":
        "@id": "https://inferdi.com/#organization"
      "potentialAction":
        "@type": "SearchAction"
        "target":
          "@type": "EntryPoint"
          "urlTemplate": "https://inferdi.com/?q={search_term_string}"
        "query-input": "required name=search_term_string"
    - "@type": "Organization"
      "@id": "https://inferdi.com/#organization"
      "name": "InferDI"
      "url": "https://inferdi.com/"
      "logo":
        "@type": "ImageObject"
        "url": "https://inferdi.com/logo.png"
      "sameAs":
        - "https://github.com/inferdi/inferdi"
        - "https://twitter.com/inferdi_ts"
    - "@type": "SoftwareApplication"
      "@id": "https://inferdi.com/#software"
      "name": "InferDI"
      "applicationCategory": "DeveloperApplication"
      "operatingSystem": "Node.js, Bun, Deno, Browser, Edge runtimes"
      "softwareVersion": "5.0.6"
      "programmingLanguage": "TypeScript"
      "url": "https://inferdi.com/"
      "downloadUrl": "https://www.npmjs.com/package/@inferdi/inferdi"
      "description": "面向 TypeScript 的零运行时依赖、无装饰器、强类型 DI 容器。TypeScript 会在注册时检查参数顺序、缺失键和生命周期依赖。"
      "license": "https://github.com/inferdi/inferdi/blob/main/LICENSE"
      "author":
        "@id": "https://inferdi.com/#organization"
---
