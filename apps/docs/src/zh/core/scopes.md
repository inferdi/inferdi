# 作用域与资源释放

作用域将请求本地服务的生命周期限定在单个工作单元内。子作用域继承父级的每一项注册，但会缓存它自己的作用域级实例并拥有它们的清理职责——因此为某个请求创建的作用域永远不会与另一个请求共享状态，也不会比它存活得更久。

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` 是根 singleton。request 作为外部作用域输入，仍由应用管理；`handler` 则由请求作用域创建并释放。

`scoped` 注册属于子作用域。默认的 `fast: false` 会在根容器解析此类注册时抛出 `Scoped "key" cannot be resolved from the root container. Use createScope().`。请从 `createScope()` 返回的容器解析该键。`fast: true` 会跳过这项运行时检查。

## 作用域输入

Scope 输入表示创建作用域时才存在的外部值，例如请求、认证上下文、租户或任务数据。先声明输入，再通过 `createScope(inputs)` 提供所需子集：

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

容器类型记录已经提供的输入，并在依赖就绪前隐藏对应服务。具名配置、嵌套细化、声明依赖的 factory、可复用类型和输入校验规则见[作用域输入](./scope-inputs)。

## 所有权

所有权取决于注册方式，而不只是由谁调用了构造函数。

| 值 | 所有者和清理责任 |
| --- | --- |
| 单例 factory 或 class 的结果 | 拥有该注册的容器 |
| scoped factory 或 class 的结果 | 解析并缓存它的作用域 |
| transient factory 或 class 的结果 | 调用方，InferDI 不会保留它用于释放 |
| `registerValue` 的值 | 应用 |
| `.override()` 的值 | 应用或测试 fixture |
| 作用域输入 | 打开作用域的代码 |

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
