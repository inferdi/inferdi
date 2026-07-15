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
      "description": "当构造过程不止于 new Ctor(...deps) 时使用 registerFactory：读取多个值、适配第三方客户端、构建配置对象，或返回一个会被 InferDI 原样缓存的 promise。"
      "url": "https://inferdi.com/zh/core/factories"
      "mainEntityOfPage": "https://inferdi.com/zh/core/factories"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 工厂, registerFactory, 异步工厂, 配置, 第三方客户端, 依赖注入"
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

## 工厂生命周期

工厂使用与类相同的生命周期模型：

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

在单例工厂内部，`c` 参数会被收窄为对单例安全的依赖。作用域级和瞬态键不会出现在自动补全中，并会被 TypeScript 拒绝。

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

## 异步工厂

工厂可以返回 promise。promise 本身会被缓存，因此并发的调用方会共享同一次初始化：

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

const [a, b] = await Promise.all([c.get('db'), c.get('db')])
await c.dispose()
```

`.get()` 始终保持同步。当注册是异步的时候，调用方对返回的值进行 await。

循环与生命周期守卫只跟踪工厂的同步调用栈。`await` 之后，`AllowedDeps` 仍会保护普通的类型化代码，但通过 `as` 强制转换或捕获的外部容器会处于运行时守卫上下文之外。请在第一次 `await` 之前的同步阶段读取依赖项。
