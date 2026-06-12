# 惰性注入

`Lazy<T>` 是一个小巧的延迟解析包装器。当构造顺序需要被延迟时，或者当两个单例服务需要相互引用而又不想在构造函数中同时解析二者时，它会很有用。

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

传入一个 `lazyKey` 会创建一个伴随注册，其值为 `{ get: () => target }`。

## 生命周期得以保留

Lazy 并不是绕过生命周期的后门。单例只能为单例目标注入 `Lazy` 伴随项。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

作用域级和瞬态消费方可以为任意生命周期使用惰性伴随项，因为它们不会被全局缓存。

## 循环依赖

InferDI 会检测循环；它不会自动打破循环。对于两个单例服务，请在其中一侧放置 `Lazy<singleton>`，并让另一侧保持直接依赖。对于异步工厂的循环，推荐的修复方式是架构层面的：拆分共享的初始化、提升其中一侧，或者避免出现循环。
