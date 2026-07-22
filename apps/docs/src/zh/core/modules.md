---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/modules#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "核心概念"
          "item": "https://inferdi.com/zh/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "模块"
          "item": "https://inferdi.com/zh/core/modules"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/modules#article"
      "headline": "InferDI 中的模块 —— 用 .use() 组合构建器"
      "name": "模块"
      "description": "使用 .use() 将庞大的容器构建器拆分成更小的部分，同时在整个流式链路上保持完整的类型推断，并理解为什么泛型模块需要已知的输入形态。"
      "url": "https://inferdi.com/zh/core/modules"
      "mainEntityOfPage": "https://inferdi.com/zh/core/modules"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 模块, use, 容器组合, 类型推断, Module 类型, 依赖注入"
      "articleSection": "核心概念"
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

# 模块

使用 `.use()` 可以把一个庞大的容器构建器拆分成更小的部分，同时在整个流式链路上保持类型推断。

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

内联 lambda 是最符合人体工学的形态。lambda 的容器类型会从调用点推断出来，包含链路中先前注册的那些键。

## 具名模块

对于可复用的固定形态模块，请使用导出的 `Module<TIn, TOut>` 类型。

```ts
import {
  Container,
  type Module,
  type SpecMap,
} from '@inferdi/inferdi'

type Base = SpecMap<{ config: { env: string } }>
type Added = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Base, Added> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}
```

像 `<T>(c: Container<T>) => ...` 这样的泛型模块函数无法在函数体内部表达键的唯一性。请使用内联 lambda 或固定形态的 `Module<TIn, TOut>` 声明。

## 动态检查

`.has(key)` 是针对动态键的类型守卫：

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` 从不解析值，并在已释放的容器上返回 `false`。
