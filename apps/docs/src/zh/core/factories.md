---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/core/factories#breadcrumb"
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
          "name": "工厂"
          "item": "https://inferdi.com/zh/core/factories"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/core/factories#article"
      "headline": "InferDI 中的工厂——registerFactory"
      "name": "工厂"
      "description": "使用 registerFactory 完成同步构造，使用 registerAsyncFactory 声明异步依赖图。"
      "url": "https://inferdi.com/zh/core/factories"
      "mainEntityOfPage": "https://inferdi.com/zh/core/factories"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 工厂, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, 依赖注入"
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

# 工厂

当构造过程不止于 `new Ctor(...deps)` 时——比如读取多个值、适配第三方客户端、创建配置对象或返回一个 promise——请使用 `registerFactory`。

```ts
const container = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepo, ['pgPool'])
```

工厂的返回值即成为该键所解析出的类型。

## 瞬态热路径图

`registerClass` 是注册瞬态服务的默认方式。只有在性能分析表明对象构造占据热路径的重要部分时，才需要改动。

V8 对一种特定模式可能变慢：同一个图反复解析许多依赖数量相同、但不同的瞬态类。性能分析和应用构建产物确认该热点后，只将这些服务改为工厂注册：

```ts
const container = new Container()
  .registerClass('context', RequestContext, [], 'scoped')
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    'transient',
  )
```

每个工厂都应包含自己的 `new Service(...)` 调用。如果这项优化重要，不要将多个服务转给同一个通用构造 helper。工厂会重复依赖接线，只用于已经测量到的热点。

## 工厂生命周期

工厂使用与类相同的生命周期模型：

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

在单例工厂内部，`c` 参数会被收窄为对单例安全的依赖。作用域级和瞬态键不会出现在自动补全中，并会被 TypeScript 拒绝。

传入可选的第四个参数 `lazyKey`，即可注册一个保留目标生命周期的 `Lazy<V>` 伴随项，其行为与 `registerClass` 完全相同：

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get() // Cache
```

若要使用默认的单例生命周期，请在伴随键之前传入 `undefined`：`registerFactory('cache', factory, undefined, 'cacheLazy')`。

## 绑定接口

TypeScript 接口在编译期被擦除，没有可以作为构造函数传入的运行时值。请改为通过显式的工厂类型，将接口绑定到它的实现：

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

`'mailer'` 的消费方看到的是 `Mailer` 抽象，而不是具体的类。

## Promise 值同步工厂

`registerFactory` 将返回的 Promise 当作服务值。该键仍是同步键，`get()` 返回 Promise，其他工厂会收到同一个对象。

```ts
const c = new Container()
  .registerFactory('dbPromise', () => connectDatabase())

const promise = c.get('dbPromise') // Promise<Database>
```

这种形式仍提供 single-flight 缓存。通过捕获的容器在 `await` 之后形成的循环，不在同步循环和生命周期检查范围内。

## 声明式异步依赖图

`registerAsyncFactory` 在 `AsyncSpec` 中保存最终服务类型，并接收按位置排列的依赖值。依赖异步键的 `registerClass` 注册会把异步状态继续传递到类图中。

```ts
class Repository {
  constructor(readonly db: Database) {}
}

const root = new Container()
  .registerValue('config', {url: 'postgres://localhost/app'})
  .declareScopeInputs<{request: RequestContext}>()
  .registerAsyncFactory(
    'db',
    async (config) => connectDatabase(config.url),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (request) => loadSession(request),
    ['request'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])

const scope = root.createScope({request})
const repository = await scope.getAsync('repository')

// @ts-expect-error — 异步图键必须使用 getAsync()
scope.get('repository')
```

`getAsync()` 接受已就绪的同步键和异步键，并返回 Promise。如果某个键或键联合可能包含 `AsyncSpec`，TypeScript 会拒绝 `get()`。`has()` 只证明注册存在；它不能证明键是同步键，也不会补充缺失的作用域输入。

容器按元组顺序启动声明的依赖，只等待带有声明式异步标记的注册。单例和作用域注册各缓存一个原生 Promise。瞬态注册每次调用都会启动，并由调用方拥有。声明式循环和冷态生命周期违规会在同步预检阶段失败。

异步回调不会收到容器。Promise 边界之后通过捕获容器发起的调用会形成动态图边，容器不分析这些边。InferDI 不提供异步 `Lazy<T>`、重试、取消或回滚。后续同级依赖在预检阶段失败时，已启动的初始化会保留原有缓存和所有权；异步瞬态可能继续执行，但没有可用的清理句柄。

容器会在异步单例和作用域注册完成后继续缓存 Promise。请使用 `await using`、`await container.dispose()` 或 `Symbol.asyncDispose` 关闭容器。同步 `using` 会报告无法解包缓存的 Promise。

向 `registerAsyncFactory` 传递只读依赖元组；当 `registerClass` 的元组可能选中异步键时也应如此。InferDI 会保留该元组，并只分类一次异步位置；内联字面量会自动推断为只读。
