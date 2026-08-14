# 惰性注入

`Lazy<T>` 和 `AsyncLazy<T>` 会把解析推迟到 `.get()`。同步目标返回 `T`，声明式异步目标返回 `Promise<T>`。依赖键可能选择两种模式的类会得到 `Lazy<T> | AsyncLazy<T>`。

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

向 `registerClass`、`registerFactory` 或 `registerAsyncFactory` 传入 `lazyKey` 会创建一个伴随注册，其值为 `{ get: () => target }`。

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` 使用第五个参数作为伴随键：

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

获取或注入包装器不会启动工厂。Singleton 和 scoped 目标的 `.get()`
返回缓存的原生 Promise，包括缓存的 rejection。Transient 目标每次调用都
重新启动，并由调用方管理。Promise-valued `registerFactory` 仍生成
`Lazy<Promise<T>>`。

## 生命周期得以保留

Lazy 伴随项保留目标生命周期。单例只能注入指向 singleton 目标的 `Lazy` 或 `AsyncLazy`。TypeScript 也会拒绝可能包含短生命周期的 target-lifetime union，以及 managed/unmanaged wrapper union。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

作用域级和瞬态消费方可以为任意生命周期使用惰性伴随项，因为它们不会被全局缓存。

## 捕获的作用域与资源释放

包装器会捕获解析它的容器。第一个子作用域中的包装器在创建第二个子作用域后仍使用第一个作用域。捕获的作用域销毁后，`AsyncLazy.get()` 返回 rejected Promise。所有者容器会销毁已解析的 singleton/scoped 目标，并等待已开始的初始化；尚未启动的目标没有资源需要清理。

## 循环依赖

InferDI 会检测同步循环，包括预检阶段的声明式异步依赖。Promise 边界之后通过 `AsyncLazy.get()` 形成的动态循环不在同步检测器内。初始化如果再次取得自己的 pending Promise，双方会一直等待。请拆分共享初始化或移除循环。异步边界详见[异步依赖](./async-dependencies)。
