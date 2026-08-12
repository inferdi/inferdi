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
      "dateModified": "2026-08-11"
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

添加 `lazyKey` 不会改变该模型：`registerFactory('dbPromise', factory, undefined, 'dbLazy')` 生成 `Lazy<Promise<Database>>`。

这种形式仍提供 single-flight 缓存。通过捕获的容器在 `await` 之后形成的循环，不在同步循环和生命周期检查范围内。

## 声明式异步依赖图

`registerAsyncFactory` 在 `AsyncSpec` 中保存最终服务类型，解析依赖元组，并把位置参数传给回调。类会继承声明依赖的异步状态。

```ts
const container = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .registerAsyncFactory(
    'db',
    (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )

const db = await container.getAsync('db')
```

第五个 `lazyKey` 会生成 `AsyncLazy<Database>`，工厂在 `.get()` 前不会启动：

```ts
const container = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const db = await container.get('dbLazy').get()
```

两种 Promise 模型、类的异步状态传播、single-flight 缓存、失败语义和异步清理见[异步依赖图](./async-dependency-graph)。
