# 迁移

InferDI 按主版本记录破坏性变更。权威来源仍然是 [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md)，但当前的迁移路径在此处进行了汇总。

## 迁移到 5.0

v5 是一次适配器版本发布。核心软件包未发生变化。此次版本号提升用于保持所有已发布软件包的版本一致，并使各框架适配器统一到同一套清理契约上。

适配器契约现在共享以下规则：

- `createScope`、`setupScope`、`disposeScope`、`autoDispose` 和 `onDisposeError` 使用相同的术语。
- `MaybePromise`、`InferdiScope`、`InferdiRoot` 和 `InferdiScopeOf` 在各适配器间统一导出。
- 如果 `setupScope` 失败，适配器只会暴露原始的 setup 错误。
- 在 setup 清理过程中发生的清理失败会被路由到 `onDisposeError` 或适配器接收器。
- 失败的请求即使在调用 `skipInferdiDispose` 之后，仍会释放其作用域，但已记录的 Express 限制除外。
- 清理钩子在运行期间能看到公开的作用域槽位。

### 适配器说明

| 软件包                                                                             | 迁移说明                                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | 将 `logDisposeError` 重命名为 `onDisposeError`；`InferdiScope.dispose()` 可以返回 `void` 或 `Promise<void>`；新增了 `disposeScope`、`autoDispose`、`skipInferdiDispose` 和 `InferdiScopeOf`。 |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)    | `next()` 之后的清理失败会被记录或发送到 `onDisposeError`；它们不再替换一个成功的响应。setup 清理不再抛出 `AggregateError`。                            |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` 现在是 setup 清理与响应完成的逐错误接收器。对于已被处理的路由错误，Express 无法强制释放被跳过的作用域。                                        |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)     | setup 清理只暴露 setup 错误。下游错误即使在调用 `skipInferdiDispose(ctx)` 之后仍会触发释放。                                                                                    |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)  | setup 清理只暴露 setup 错误。清理失败会被发送到 `onDisposeError` 或 `console.error`。                                                                                         |

## 迁移到 4.0

v4 收紧了 `Lazy<T>` 的生命周期语义。受管理的惰性伴生项现在会保留目标生命周期。单例只能注入 `Lazy<singleton>`。

主要变化：

- `AllowedDeps<T, 'singleton'>` 不再接受任意的 `Lazy<V>`。
- `LazySpec<V, TargetKind>` 成为公开类型，用于显式的容器和模块形态。
- 运行时的惰性豁免只在目标种类为 `singleton` 时适用。
- 注入了 `Lazy<scoped>` 或 `Lazy<transient>` 的单例，必须改变目标生命周期或消费者生命周期。

常见修复方式：

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## 迁移到 3.0

v3 将生命周期安全性引入了类型系统。运行时行为保持兼容，严格的运行时守卫仍作为纵深防御保留。

主要变化：

- `DependenciesMap` 的条目从裸的服务类型变为 `Spec<V, Kind>`。
- `RegistrationKind`、`Spec<V, K>` 和 `SpecMap<M, K>` 成为公开导出项。
- `registerFactory` 会为单例工厂收窄其 `c` 参数。
- `registerClass` 会为单例注册过滤 `deps`。
- `override(key, value)` 会保留原始的生命周期种类。
- `new Container({ strict: false })` 可以在完成依赖图审计后禁用运行时的循环与生命周期守卫。

常见修复方式：

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## 迁移到 2.0

v2 包含两项机械性的破坏性变更。

### 移除了 `container.cradle`

请使用 `.get(key)`：

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` 变为 `lazyKey`

请传入伴生键：

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

v2 还为每个注册方法添加了 string 或 symbol 键，并改进了已释放祖先容器的诊断信息。

## 版本一致（Lockstep）

所有已发布的 InferDI 软件包共享同一版本号：

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)

升级适配器时，请让适配器软件包与 [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) 保持相同的主版本。

## 升级清单

1. 阅读所跨越的每个主版本的迁移说明。
2. 同时升级 [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) 和所有已安装的适配器。
3. 运行类型测试或 `tsc --noEmit` 以捕获依赖图形态的变化。
4. 在严格模式下运行运行时测试。
5. 如果你使用了 `skipInferdiDispose`、`autoDispose: false` 或自定义的 `disposeScope`，请复查请求作用域的所有权。

## 稳定边界

核心软件包始终保持无装饰器、零依赖。框架生命周期行为存在于适配器软件包中，而非 [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) 内。
