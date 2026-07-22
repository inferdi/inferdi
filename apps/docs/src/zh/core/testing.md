---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/testing#breadcrumb"
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
          "name": "测试与覆盖"
          "item": "https://inferdi.com/zh/core/testing"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/testing#article"
      "headline": "InferDI 中的测试与覆盖 —— .override()"
      "name": "测试与覆盖"
      "description": "在测试中使用 .override() 将现有注册替换为 mock，在不触碰生产接线或带类型图谱其余部分的情况下替换实现。"
      "url": "https://inferdi.com/zh/core/testing"
      "mainEntityOfPage": "https://inferdi.com/zh/core/testing"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 测试, override, mock, 测试替身, 替换实现, 依赖注入"
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

# 测试与覆盖

当测试需要用 mock 替换现有注册时，请使用 `.override()`。

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

覆盖值必须可赋值给原始注册的类型。缺失的键和不兼容的 mock 都是 TypeScript 错误。

## 覆盖时机

请在解析依赖图之前应用覆盖：

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

第二行会抛出异常，因为 singleton 值已缓存在当前容器中。该检查有意只依赖本地缓存：它也能发现缓存在当前作用域中的 scoped 值、`registerValue` 和重复覆盖。Transient 解析以及通过子容器解析但由祖先容器拥有的值不会进入本地缓存，因此不会被记录。已经返回的 transient 仍由原调用方持有，之后的解析则会返回 mock。这是需要了解的契约边界，并不意味着应当延迟覆盖；在解析依赖图之前完成所有覆盖才能避免图发生割裂。

## 所有权

覆盖值由外部拥有。与 `registerValue` 一样，覆盖不会被加入容器的释放队列。测试夹具拥有它自己的清理职责。

## 作用域局部性

覆盖只会改变它被调用的那个容器：

```ts
const scope = root.createScope().override('db', mockDb)
```

根容器和同级作用域不受影响。父级的覆盖通过常规的父级查找仍然可见。
