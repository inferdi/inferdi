---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/reference/api#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "参考"
          "item": "https://inferdi.com/zh/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "API 概览"
          "item": "https://inferdi.com/zh/reference/api"
    - "@type": "APIReference"
      "@id": "https://inferdi.com/zh/reference/api#article"
      "headline": "InferDI 核心 API 概览"
      "name": "API 概览"
      "description": "@inferdi/inferdi v6 核心 API 概览，包括作用域输入、registerAsyncFactory、就绪状态解析、覆盖和资源释放。"
      "url": "https://inferdi.com/zh/reference/api"
      "mainEntityOfPage": "https://inferdi.com/zh/reference/api"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "显式注册，流式构建器"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, declareScopeInputs, ScopeInputMap, registerAsyncFactory, getAsync, AsyncSpec, ReadyKeys, dispose"
      "articleSection": "参考"
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

# API 概览

本页总结了公开的核心 API。准确的泛型定义请参阅软件包 README 和 TypeScript 声明文件。

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type LazySpec,
  type AsyncSpec,
  type Module,
  type RegistrationKind,
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
  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?, lazyKey?)
  registerFactory(key, deps, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?)
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

## 注册方法

| 方法 | 回调输入 | 图中类型 | 解析方法 |
| --- | --- | --- | --- |
| `registerClass` | `deps` 对应的构造函数参数 | `Spec` 或传播后的 `AsyncSpec` | `get` 或 `getAsync` |
| `registerFactory(key, factory, ...)` | 按生命周期过滤的容器 | `Spec<ReturnType>` | `get` |
| `registerFactory(key, deps, factory, ...)` | 仅含 `deps` 的 resolver | 带输入要求的 `Spec` | `get` |
| `registerAsyncFactory` | 解析后的位置参数 | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | 无 | 外部所有的 singleton `Spec` | `get` |

`registerClass` 和 `registerFactory` 接受 `singleton`、`scoped` 和 `transient` 三种生命周期，以及可选的 `lazyKey` 伴随项。`registerValue` 始终为单例，且由外部拥有。

`registerAsyncFactory` 接受相同的生命周期，但没有 `lazyKey`。它用 `AsyncSpec` 记录最终服务类型，依赖它的类会继承异步状态。请用 `getAsync()` 解析这些键。`get()` 仍用于同步键，包括由 `registerFactory` 创建的 Promise 值服务。

`registerAsyncFactory` 以及依赖元组可能选中异步键的 `registerClass` 调用都要求只读元组。InferDI 在注册时只分类一次异步位置，并保留该元组引用。内联字面量会推断为只读；仅同步的 `registerClass` 调用仍支持可变元组。

`registerAsyncFactory` 和带依赖的 `registerFactory` 使用不同的参数顺序和回调契约：

```ts
registerFactory(key, deps, resolverFactory, kind, lazyKey)
registerAsyncFactory(key, valueFactory, deps, kind)
```

`override` 替换现有注册，`use` 应用模块构建器。`override` 的时机检查只查看当前容器的缓存。它能发现本地缓存的 singleton/scoped 值、`registerValue` 和重复覆盖，但不会记录 transient 解析，也不会记录通过子容器解析但由祖先容器拥有的值。请在解析依赖图之前应用覆盖。

## 作用域输入与解析

`declareScopeInputs<Inputs>()` 添加仅存在于类型中的 scoped 项。`createScope(inputs)` 提供缺少值的任意子集，并返回就绪键集合与必填属性对应的容器。输入值仍由应用所有。

| API | 接受的键 |
| --- | --- |
| `get()` | 不含 `AsyncSpec` 的就绪键 |
| `getAsync()` | 所有就绪的同步键和声明式异步键 |
| `has()` | 任意 string 或 symbol；只证明注册存在 |

`has()` 不能证明键已就绪或属于同步键。类型状态细化见[作用域输入与配置](../core/scope-inputs)，Promise 行为见[异步依赖图](../core/async-dependency-graph)。

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
| `Container.ResolveUnwrapped<C>` | 类似 `Resolve`，但只将受管理的 `LazySpec` 伴随项解包为 `T`；带有普通 `.get()` 方法的服务保持不变。 |
| `Container.UnwrappedValue<C, K>` | 查询单个已解包的服务类型。 |
| `Container.Providers<C>` | 为测试创建一组 provider thunk 的映射。 |

v6 的泛型 resolver 必须保留可接受的键集合。`get()` 使用 `Container.SyncReadyKeys<C>`，`getAsync()` 使用 `Container.ReadyKeys<C>`，不要使用不受约束的 `keyof T`。

## 公开类型

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, RegistrationKind>
>

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

interface AsyncSpec<V, K extends RegistrationKind = 'singleton'>
  extends Spec<V, K> {
  readonly async: true
}

interface LazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

`ScopeInputMap<M>` 把必填且有限的 string/symbol 属性映射为 scoped input 项。它会拒绝可选键、数字键、`__proto__`、宽泛索引签名以及键集合不同的联合类型。`WithRequirements<S, K>` 在具名模块输出上携带所需输入键。准确的条件类型定义以发布的 TypeScript 声明为准。

## 适配器 API 形态

每个适配器都会导出：

- 集成函数，例如 `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- 结构化的 `InferdiScope`、`InferdiRoot` 和 `InferdiScopeOf` 辅助类型
- 框架专属的选项与上下文辅助类型

框架专属的泛型名称和生命周期细节请参阅各适配器页面。
