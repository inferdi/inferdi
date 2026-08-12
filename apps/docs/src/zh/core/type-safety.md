---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/type-safety#breadcrumb"
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
          "name": "类型安全"
          "item": "https://inferdi.com/zh/core/type-safety"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/type-safety#article"
      "headline": "InferDI 中的类型安全：依赖图即类型"
      "name": "类型安全"
      "description": "InferDI 将依赖图保留在类型系统中：错误的参数顺序、未注册的键，或单例去引用作用域级状态，都是你在编辑器里看到的编译错误，而不是在高负载下才发现的运行时堆栈跟踪。"
      "url": "https://inferdi.com/zh/core/type-safety"
      "mainEntityOfPage": "https://inferdi.com/zh/core/type-safety"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 类型安全, TypeScript, 类型推断, 构造函数签名, 编译期, 依赖注入"
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

# 类型安全

InferDI 的核心原则：依赖图存在于类型系统之中。一个无效的依赖图——错误的参数顺序、从未注册的键、单例去引用作用域级状态——都是你在编辑器里就能看到的类型错误，而不是在高负载下才发现的堆栈跟踪。凡是编译器能够静态证明的，都会被静态校验；运行时守卫只是用来捕捉那些被 `as` 类型转换和动态键绕过的问题。

## 构造函数签名

`registerClass` 会根据构造函数的参数列表来校验依赖元组。

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

如果构造函数发生变化，注册也会随之改变。把参数交换成 `['db', 'logger']` 会被拒绝，因为第一个构造函数参数期望的是 `Logger`。

## 键的唯一性

每次注册都会返回一个被扩宽的容器类型。通过流式 API 重复注册同一个键会被拒绝：

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

当替换是有意为之时，测试应使用 `.override()`。

## 类型中的生命周期

每个条目都同时携带值类型及其生命周期种类。类型系统会对依赖进行过滤，使单例无法直接依赖作用域级或瞬态服务。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

运行时严格模式仍作为针对 `as` 类型转换、动态键、捕获的外层容器以及依赖循环的纵深防御手段。

## 就绪状态与异步状态

依赖图类型还会记录作用域输入要求和声明式异步注册。输入尚未提供时，对应键不会出现在 `.get()` 中。`AsyncSpec` 键及依赖它的类需要通过 `.getAsync()` 解析。

```ts
const root = new Container()
  .declareScopeInputs<{request: Request}>()
  .registerAsyncFactory('db', openDatabase, [])
  .registerClass('handler', Handler, ['request', 'db'], 'scoped')

const scope = root.createScope({request})

// @ts-expect-error: handler 是异步项
scope.get('handler')

await scope.getAsync('handler')
```

使用[作用域输入与配置](./scope-inputs)建模就绪状态，使用[异步依赖图](./async-dependency-graph)选择 Promise 契约。
