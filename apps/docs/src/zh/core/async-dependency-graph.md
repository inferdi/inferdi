---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/async-dependency-graph#breadcrumb"
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
          "name": "异步依赖图"
          "item": "https://inferdi.com/zh/core/async-dependency-graph"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/async-dependency-graph#article"
      "headline": "InferDI 中的声明式异步依赖图"
      "name": "异步依赖图"
      "description": "使用 registerAsyncFactory 和 getAsync 构建类型安全的异步依赖图，并获得 single-flight 缓存、作用域隔离和显式清理。"
      "url": "https://inferdi.com/zh/core/async-dependency-graph"
      "mainEntityOfPage": "https://inferdi.com/zh/core/async-dependency-graph"
      "inLanguage": "zh-CN"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 异步依赖图, registerAsyncFactory, getAsync, AsyncSpec, single-flight, TypeScript 依赖注入"
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

# 异步依赖图

`registerAsyncFactory` 记录显式异步边。依赖图保存最终服务类型，等待声明的异步依赖，并把异步状态传播到依赖它们的类。

## 选择 Promise 模型

Promise 可以是服务本身，也可以表示服务的初始化边界。InferDI 为两种含义提供独立契约。

| API | 图中的值 | 注入内容 | 解析方法 |
| --- | --- | --- | --- |
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | 保持 identity 的 Promise 对象 | `get()` |
| `registerAsyncFactory('db', connect, [])` | `AsyncSpec` 中的 `Database` | fulfilled `Database` | `getAsync()` |

下游服务需要完成后的值时使用 `registerAsyncFactory`。只有同步依赖图需要 Promise 对象本身时才使用 Promise-valued `registerFactory`。

## 构建异步请求图

下面的依赖图为 root 初始化一个数据库，并为每个已认证作用域初始化一个 session。某个类的声明依赖包含异步项时，该类也会成为异步项。

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard 属于异步依赖图
scope.get('dashboard')
```

编译器也会拒绝 `root.getAsync('dashboard')`，因为 root 没有 `auth` 输入。作用域配置方法见[作用域输入与配置](./scope-inputs)。

## 解析与调度

`getAsync()` 接受已就绪的同步键和异步键，并返回 Promise。同步查找、循环、生命周期或销毁错误会变成 rejected Promise。

InferDI 按元组顺序启动声明的依赖。它等待带声明式异步标记的项，再用位置参数调用工厂。互不依赖的异步项可以同时初始化。

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

回调接收值，不接收容器，因此 TypeScript 和运行时 preflight 都能看到这些异步边。

`deps` 非空时，请标注每个回调参数的类型，或传入已有签名的函数。元组会检查参数类型和顺序，但不会为参数提供上下文推导。

## 按生命周期缓存

| 生命周期 | 初始化 | 所有权 |
| --- | --- | --- |
| `singleton` | 所有者容器中一个原生 Promise | 所有者容器 |
| `scoped` | 每个解析作用域一个原生 Promise | 解析作用域 |
| `transient` | 每次调用启动一次 | 调用方 |

并发调用共享 singleton 和 scoped 初始化。缓存中的 rejected Promise 会保持失败状态，InferDI 不会重试。应用需要重试时，应打开新作用域或重建 root。

`has()` 只检查注册，不启动初始化。它不能证明某个键是同步键，也不会提供缺少的作用域输入。

## 异步资源清理

Singleton 和 scoped 注册完成后仍在缓存中保留 Promise。请异步释放容器，让 InferDI 等待初始化并检查解析后的资源。

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

受容器所有的异步资源支持 `await using`、`dispose()` 和 `Symbol.asyncDispose`。同步 `using` 无法展开缓存的 Promise，并会报告误用。

## 旧式 Promise 值

`registerFactory` 返回的 Promise 仍是同步服务值。声明式异步工厂按 identity 接收它，因为该注册没有 `AsyncSpec` 标记。

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

在顶层调用 `getAsync('dbPromise')` 时，它遵循 JavaScript 的 await 语义并解析为 `Database`。

## 边界与失败语义

- `registerAsyncFactory` 的依赖元组必须是 readonly。`registerClass` 的元组可能选择异步键时也要使用 readonly。InferDI 只分类一次异步位置并保留元组引用；内联字面量会推导为 readonly。
- 声明式循环和冷生命周期违规会在同步 preflight 阶段失败。Promise 边界之后通过捕获容器发起的调用属于动态图边，不在该分析内。
- InferDI 不提供异步 `Lazy<T>`、重试、取消或回滚。请拆开循环，或把共享初始化移入单独服务。
- 后续依赖在 preflight 期间失败时，先启动的初始化会保留缓存和所有权状态。已经启动的异步 transient 可能继续运行，但没有 teardown handle。
- 含异步依赖的类不能创建同步 lazy companion。`registerAsyncFactory` 没有 `lazyKey` 参数。

同步构造见[工厂](./factories)，所有权模型见[作用域与清理](./scopes)。
