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
