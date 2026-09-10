---
layout: home
description: "零运行时依赖、无需装饰器的 DI 容器，在编译期检查依赖图、生命周期和作用域边界。"
---

<script setup>
import HomeShowcase from '../../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="zh" />

## TypeScript 能看到完整的依赖图

每次注册都会返回一个新的容器类型，其中记录了键、值、生命周期、异步边和作用域要求。

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(readonly logger: Logger, readonly database: Database) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

<div class="value-grid">
  <a href="/zh/core/type-safety"><strong>构造函数形状</strong><span>键必须与参数类型和顺序一致。</span></a>
  <a href="/zh/core/lifetime-guards"><strong>生命周期</strong><span>单例不能捕获 scoped 或 transient 值。</span></a>
  <a href="/zh/core/scope-inputs"><strong>作用域就绪状态</strong><span>请求值必须先存在，相关服务才能解析。</span></a>
  <a href="/zh/core/async-dependencies"><strong>异步边</strong><span>异步状态会沿依赖图类型传播。</span></a>
</div>

## 框架适配器

<div class="adapter-grid">
  <a href="/zh/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>类型化上下文、Suspense Hook 和托管作用域。</span></a>
  <a href="/zh/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>每个请求一个类型化作用域，并按生命周期清理。</span></a>
  <a href="/zh/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>适用于 Workers、Bun 和 Node 的类型化上下文变量。</span></a>
  <a href="/zh/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>请求作用域跟随中间件生命周期。</span></a>
  <a href="/zh/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>用于中间件和路由的类型化请求作用域。</span></a>
  <a href="/zh/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>将路由类型传递到请求服务。</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">下一步</p>
  <h2 id="home-next-title">从组合根开始</h2>
  <p>将依赖图集中在一个地方，让所有选择都易于查看和修改。</p>
  <div class="home-next-links">
    <a class="primary" href="/zh/guide/quick-start">构建第一个依赖图 <span aria-hidden="true">↗</span></a>
    <a href="/zh/guide/composition-root">组合根 <span aria-hidden="true">→</span></a>
  </div>
</section>
