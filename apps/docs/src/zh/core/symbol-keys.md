---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/symbol-keys#breadcrumb"
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
          "name": "Symbol 键"
          "item": "https://inferdi.com/zh/core/symbol-keys"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/symbol-keys#article"
      "headline": "InferDI 中的 Symbol 键"
      "name": "Symbol 键"
      "description": "每个注册键都可以是字符串或 symbol。字符串适用于全应用范围的公共服务；symbol 提供无冲突的标识，而本地 Symbol() 键可以随容器一起被垃圾回收。"
      "url": "https://inferdi.com/zh/core/symbol-keys"
      "mainEntityOfPage": "https://inferdi.com/zh/core/symbol-keys"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, symbol 键, Symbol, 字符串键, 标识, 垃圾回收, 依赖注入"
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

# Symbol 键

每个注册键都可以是 `string` 或 `symbol`。字符串便于用于全应用范围的公共服务。当标识本身很重要时，symbol 会很有用。

```ts
const DB = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB, PgPool, ['config'])
  .registerClass(CACHE, RedisPool, [])
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)
c.get(CACHE)
c.get('repo')
```

## 何时使用 Symbol

| 模式 | 令牌 |
| --- | --- |
| 模块本地的私有服务 | `Symbol('name')` |
| 无需导入即可共享标识 | `Symbol.for('name')` |
| 类型层面的标称区分 | `unique symbol` 常量 |

对可回收的私有服务使用局部 symbol。`Symbol.for(name)` 会存储在全局 symbol 注册表中，永远不会被垃圾回收。

## 惰性伴随项

惰性伴随项的键也可以是 symbol：

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

主键和伴随项键不需要是相同的种类。
