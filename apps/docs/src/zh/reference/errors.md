---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/reference/errors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "参考"
          "item": "https://inferdi.com/zh/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "错误"
          "item": "https://inferdi.com/zh/reference/errors"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/reference/errors#article"
      "headline": "InferDI 错误参考"
      "name": "错误"
      "description": "InferDI 针对依赖图和生命周期误用抛出的每一个明确错误——未知的键、检测到循环、生命周期违规、已释放的容器——附带消息形态，让注册错误在测试中尽早暴露。"
      "url": "https://inferdi.com/zh/reference/errors"
      "mainEntityOfPage": "https://inferdi.com/zh/reference/errors"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 错误, 异常, 未知的键, 检测到循环, 生命周期违规, 已释放的容器, 依赖注入"
      "articleSection": "参考"
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

# 错误

InferDI 会针对依赖图和生命周期的误用抛出明确的错误。请让这些消息在测试中保持可见，以便注册错误能尽早暴露。

| 触发条件 | 消息形态 |
| --- | --- |
| 对缺失的键调用 `.get(k)` | `Key "k" not found` |
| 在已释放的容器上解析 | `Container is disposed (key: "k")` |
| 在已释放的祖先容器上解析 | `Ancestor container is disposed (key: "k")` |
| 释放后调用 `createScope()` | `Cannot create scope from a disposed container` |
| 违反单例生命周期 | `Singleton "x" cannot depend on scoped "y"...` |
| 同步循环依赖 | `Circular dependency detected: a -> b -> a...` |
| 对异步资源进行同步释放 | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| 延迟覆盖 | `Cannot override "k" because it has already been resolved...` |
| 在已释放的容器上覆盖 | `Cannot override on a disposed container (key: "k")` |

## 异步工厂之间的循环

异步工厂之间的循环不会被检测到。一个等待另一个异步工厂的工厂，可能会在同步循环依赖栈被清空之后才恢复执行。如果两端最终相互等待，调用方将观察到一个永远不会被解决的待定 Promise。

请在架构层面修复异步循环：

- 拆分共享的初始化逻辑
- 将其中一端提升为更早创建的服务
- 仅当两端都是单例时才使用 `Lazy<singleton>`
- 在可疑的顶层 await 周围添加一个开发期看门狗超时

## 适配器清理错误

在响应已产生之后发生的适配器清理错误，绝不会向客户端暴露。它们会被路由到 `onDisposeError` 或适配器的兜底接收器（sink）。

setup 失败的处理方式不同：原始的 setup 错误会被暴露，而在 setup 清理过程中发生的任何清理失败都会被路由到接收器，且不会被聚合进所暴露的错误中。
