# API 概览

本页总结了公开的核心 API。准确的泛型定义请参阅软件包 README 和 TypeScript 声明文件。

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

`fast` 默认为 `false`：运行时安全检查保持启用，作用域保留精确的可变父链。
`{fast: true}` 会关闭这些检查，并把依赖图视为固定图，从而启用扁平化父级
查找和继承 singleton 镜像。子作用域会继承根容器的配置。

## 注册方法

| 方法 | 回调输入 | 图中类型 | 解析方法 |
| --- | --- | --- | --- |
| `registerClass` | `deps` 对应的构造函数参数 | `Spec` 或传播后的 `AsyncSpec` | `get` 或 `getAsync` |
| `registerFactory(key, factory, ...)` | 按生命周期过滤的容器 | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | 仅含 `deps` 的 resolver | 带输入要求的 `Spec` | `get` |
| `registerAsyncFactory` | 解析后的位置参数 | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | 无 | 外部所有的 singleton `Spec` | `get` |

`registerClass` 和 `registerFactory` 接受 `singleton`、`scoped` 和 `transient` 三种生命周期。`registerFactory` 创建伴随项时必须显式传入生命周期，包括 `'singleton'`。`registerValue` 始终为单例，且由外部拥有。

`registerAsyncFactory` 接受相同的生命周期和可选的第五个 `lazyKey`。主注册用 `AsyncSpec` 保存最终服务类型，伴随项类型为 `AsyncLazySpec<Awaited<ReturnType>, L>`。目标使用 `getAsync()`，包装器使用 `get()`。

`registerAsyncFactory` 以及依赖元组可能选中异步键的 `registerClass` 调用都要求只读元组。InferDI 在注册时只分类一次异步位置，并保留该元组引用。内联字面量会推断为只读；仅同步的 `registerClass` 调用仍支持可变元组。

`registerAsyncFactory` 和带依赖的 `registerFactory` 使用不同的参数顺序和回调契约：

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` 替换现有注册，`use` 应用模块构建器。`override` 的时机检查只查看当前容器的缓存。它能发现本地缓存的 singleton/scoped 值、`registerValue` 和重复覆盖，但不会记录 transient 解析，也不会记录通过子容器解析但由祖先容器拥有的值。请在解析依赖图之前应用覆盖。

## 作用域输入与解析

`declareScopeInputs<Inputs>()` 添加仅存在于类型中的 scoped 项。`createScope(inputs)` 提供缺少值的任意子集，并返回就绪键集合与必填属性对应的容器。输入值仍由应用所有。

| API | 接受的键 |
| --- | --- |
| `get()` | 不含 `AsyncSpec` 的就绪键 |
| `getAsync()` | 所有就绪的同步键和声明式异步键 |
| `has()` | 任意 string 或 symbol；只证明注册存在 |

`has()` 不能证明键已就绪或属于同步键。类型状态细化见[作用域输入](../core/scope-inputs)，Promise 行为见[异步依赖](../core/async-dependencies)。

## 命名空间类型

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| 类型 | 用途 |
| --- | --- |
| `Container.ReadyKeys<C>` | 提取已提供作用域输入的键；泛型解析器可将这些键传给 `getAsync`。 |
| `Container.SyncReadyKeys<C>` | 提取可由泛型解析器传给 `get` 的已就绪非异步键。 |
| `Container.Resolve<C>` | 从已构建的容器中提取一个扁平的 `{ key: Value }` 映射。 |
| `Container.ResolveUnwrapped<C>` | 类似 `Resolve`，但以 distributive 方式解包受管理的 `LazySpec` 和 `AsyncLazySpec`；普通包装器服务保持不变。 |
| `Container.UnwrappedValue<C, K>` | 查询单个已解包的服务类型。 |
| `Container.Providers<C>` | 为测试创建一组 provider thunk 的映射。 |

v6 的泛型 resolver 必须保留可接受的键集合。`get()` 使用 `Container.SyncReadyKeys<C>`，`getAsync()` 使用 `Container.ReadyKeys<C>`，不要使用不受约束的 `keyof T`。

## 公开类型

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` 和 `AsyncLazySpec` 带有私有的 type-only 判别字段。显式
`Container` 或 `Module` 形状应使用这些具名类型。该字段没有运行时值，也不导出。

`ScopeInputMap<M>` 把必填且有限的 string/symbol 属性映射为 scoped input 项。它会拒绝可选键、数字键、`__proto__`、宽泛索引签名以及键集合不同的联合类型。`WithRequirements<S, K>` 在具名模块输出上携带所需输入键。准确的条件类型定义以发布的 TypeScript 声明为准。

## 适配器 API 形态

每个适配器都会导出：

- 集成函数，例如 `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- 结构化的 `InferdiScope`、`InferdiRoot` 和 `InferdiScopeOf` 辅助类型
- 框架专属的选项与上下文辅助类型

框架专属的泛型名称和生命周期细节请参阅各适配器页面。
