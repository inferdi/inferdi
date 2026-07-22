---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/lifetime-guards#breadcrumb"
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
          "name": "生命周期守卫"
          "item": "https://inferdi.com/zh/core/lifetime-guards"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/lifetime-guards#article"
      "headline": "InferDI 中的生命周期守卫——单例、作用域级与瞬态"
      "name": "生命周期守卫"
      "description": "InferDI 的三种生命周期——单例、作用域级与瞬态——以及那些阻止生命周期更长的服务捕获生命周期更短的服务、并在请求之间泄漏状态的编译期与运行时守卫。"
      "url": "https://inferdi.com/zh/core/lifetime-guards"
      "mainEntityOfPage": "https://inferdi.com/zh/core/lifetime-guards"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, 生命周期, 单例, 作用域级, 瞬态, 生命周期守卫, 受困依赖, 依赖注入"
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

# 生命周期守卫

InferDI 提供三种生命周期：

| 种类 | 创建时机 | 缓存于 | 由容器释放 |
| --- | --- | --- | --- |
| `singleton` | 每个拥有它的容器创建一次 | 拥有它的容器 | 是 |
| `scoped` | 每个作用域创建一次 | 作用域 | 是 |
| `transient` | 每次解析都创建 | 从不缓存 | 否 |

## 生命周期规则

单例不能直接依赖 `scoped` 或 `transient` 服务。单例只创建一次并在每个请求间共享，因此如果它捕获了一个作用域级的值——当前请求的上下文、用户或事务——那么这一个请求的状态就会悄无声息地泄漏到所有其他请求中。InferDI 让这种边界情况在类型系统中无法被表达出来，而不是把它留给代码评审。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

该注册会被 TypeScript 拒绝。在严格模式下，如果有类型转换绕过了类型系统，同样的形态在运行时也会被拒绝。

## 严格模式

`strict: true` 是默认值。它能捕捉：

- 由类型转换引入的单例到作用域级或单例到瞬态的违规
- 捕获外层容器的工厂泄漏
- 同步单例循环
- 同步瞬态循环
- 绕过静态检查的动态键误用

```ts
const root = new Container({ strict: true })
```

## 快速模式

仅在测试已证明依赖图形态之后才使用 `strict: false`：

```ts
const root = new Container({ strict: false })
```

快速模式会从解析路径中移除运行时的循环与生命周期记账。它不会改变类型层面的契约，但也无法防御不诚实的类型转换、捕获的外层容器或循环。

推荐的工作流程：在严格模式下开发和测试，然后仅在审计之后才为性能敏感的生产环境依赖图切换模式。
