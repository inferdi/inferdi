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
      "description": "@inferdi/inferdi 核心 API 概览，包括 registerAsyncFactory、getAsync、AsyncSpec、作用域、覆盖和资源释放。"
      "url": "https://inferdi.com/zh/reference/api"
      "mainEntityOfPage": "https://inferdi.com/zh/reference/api"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "显式注册，流式构建器"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, 作用域, dispose"
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
  type Spec,
  type SpecMap,
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
  getAsync(key): Promise
  has(key)

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## 注册方法

| 方法 | 用途 |
| --- | --- |
| `registerClass` | 注册一个构造函数及其依赖元组。 |
| `registerFactory` | 注册自定义的构造逻辑。 |
| `registerAsyncFactory` | 在声明式异步图中注册位置依赖。 |
| `registerValue` | 注册一个由外部拥有的单例值。 |
| `override` | 替换已有注册；若键已存在于本地缓存中则拒绝操作。 |
| `use` | 应用一个模块构建器。 |

`registerClass` 和 `registerFactory` 接受 `singleton`、`scoped` 和 `transient` 三种生命周期，以及可选的 `lazyKey` 伴随项。`registerValue` 始终为单例，且由外部拥有。

`registerAsyncFactory` 接受相同的生命周期，但没有 `lazyKey`。它用 `AsyncSpec` 记录最终服务类型，依赖它的类会继承异步状态。请用 `getAsync()` 解析这些键。`get()` 仍用于同步键，包括由 `registerFactory` 创建的 Promise 值服务。

`registerAsyncFactory` 以及依赖元组可能选中异步键的 `registerClass` 调用都要求只读元组。InferDI 在注册时只分类一次异步位置，并保留该元组引用。内联字面量会推断为只读；仅同步的 `registerClass` 调用仍支持可变元组。

`override` 的时机检查只查看当前容器的缓存。它能发现本地缓存的 singleton/scoped 值、`registerValue` 和重复覆盖，但不会记录 transient 解析，也不会记录通过子容器解析但由祖先容器拥有的值。请在解析依赖图之前应用覆盖。

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

## 公开类型

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

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

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

## 适配器 API 形态

每个适配器都会导出：

- 集成函数，例如 `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- 结构化的 `InferdiScope`、`InferdiRoot` 和 `InferdiScopeOf` 辅助类型
- 框架专属的选项与上下文辅助类型

框架专属的泛型名称和生命周期细节请参阅各适配器页面。
