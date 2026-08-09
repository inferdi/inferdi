---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/scopes#breadcrumb"
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
          "name": "作用域与清理"
          "item": "https://inferdi.com/zh/core/scopes"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/scopes#article"
      "headline": "InferDI 中的作用域与清理"
      "name": "作用域与清理"
      "description": "作用域将请求本地服务限定在单个工作单元内：子作用域继承父级的每一项注册，但缓存它自己的实例并拥有它们的清理职责，采用 LIFO 清理顺序并支持 using 与 await using。"
      "url": "https://inferdi.com/zh/core/scopes"
      "mainEntityOfPage": "https://inferdi.com/zh/core/scopes"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 作用域, 清理, 销毁, 子作用域, using, await using, LIFO, 依赖注入"
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

# 作用域与清理

作用域将请求本地服务的生命周期限定在单个工作单元内。子作用域继承父级的每一项注册，但会缓存它自己的作用域级实例并拥有它们的清理职责——因此为某个请求创建的作用域永远不会与另一个请求共享状态，也不会比它存活得更久。

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` 是一个根单例。`request` 在每个作用域创建一次，并在作用域被释放时释放。

`scoped` 注册属于子作用域。在默认的 `strict: true` 模式下，`root.get('request')` 会抛出 `Scoped "request" cannot be resolved from the root container. Use createScope().`。请从 `createScope()` 返回的容器解析该键。`strict: false` 会跳过这项运行时检查。

## Scope 输入与配置函数

Scope 输入表示创建作用域时才存在的外部值，例如请求、认证上下文、租户或任务数据。`declareScopeInputs()` 把这些键加入类型图，不创建运行时注册：

```ts
const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass('accountService', AccountService, ['request', 'auth'], 'scoped')
```

声明映射接受必填且有限的字符串键和 symbol 键。可选键、数字键、`__proto__`、宽泛的 string/symbol 索引签名，以及各分支键集合不同的联合类型都会产生编译错误。你可以在根容器或现有子容器上声明输入，但声明本身不会提供值。

`createScope(inputs)` 接受尚未提供的输入子集。InferDI 会把需求传递到 class 注册、lazy companion，以及带显式依赖元组的 factory：

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth 尚未提供
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')

root.registerFactory(
  'userId',
  ['auth'],
  (c) => c.get('auth').userId,
  'scoped'
)
```

Factory 元组只参与类型检查。回调获得一个 resolver，其中 `.get()` 只接受列出的键，`.has()` 用于探测。运行时仍调用 `factory(container)`。

普通函数可以充当具名配置：

```ts
const publicScope = (request: RequestContext) =>
  root.createScope({request})

const authenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})
```

子容器对可枚举的自有字符串和 symbol 属性做浅层快照。嵌套子容器继承输入值，但会创建自己的 scoped 实例。输入值仍由应用管理。通过新子容器细化 scope 时，请先释放细化后的子容器，再释放父容器。

运行时不保存输入 schema。JavaScript、`any` 或类型断言可以加入未知键，也可以在子容器 cache 中遮蔽注册。请传入被动的数据 record；对象展开会调用 getter 和 Proxy trap，由这些钩子触发的重入修改不属于 API 契约。Strict Mode 会让 partial child 上新增的注册对 refined child 可见。Fast Mode 支持输入细化，但仍要求不可变依赖图：第一次 `.get()` 或 `.createScope()` 前必须完成注册。

## 所有权

每个容器只释放它自己创建的实例。

| 实例 | 拥有者 |
| --- | --- |
| 根单例 | 根容器 |
| 作用域级服务 | 请求作用域 |
| 首次在子容器上解析的单例 | 该子容器 |
| 瞬态 | 调用方 |

`root.dispose()` 不会级联到已经创建的子作用域。请在各自的生命周期边界处释放作用域。

## 原生资源管理

Container 同时实现了两个释放符号：

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

当任何被拥有的资源可能是异步的时候，请使用 `await using` 或 `await container.dispose()`。

## 释放协议

被拥有的实例按创建顺序的逆序释放。容器会依次探测：

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

如果多个释放器失败，InferDI 会把它们收集到一个 `AggregateError` 中，这样一个糟糕的清理不会阻止后续资源被关闭。
