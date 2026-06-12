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
  registerFactory(key, factory, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
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
| `registerValue` | 注册一个由外部拥有的单例值。 |
| `override` | 在首次解析之前替换已有的注册项。 |
| `use` | 应用一个模块构建器。 |

`registerClass` 和 `registerFactory` 接受 `singleton`、`scoped` 和 `transient` 三种生命周期。`registerValue` 始终为单例，且由外部拥有。

## 命名空间类型

```ts
namespace Container {
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| 类型 | 用途 |
| --- | --- |
| `Container.Resolve<C>` | 从已构建的容器中提取一个扁平的 `{ key: Value }` 映射。 |
| `Container.ResolveUnwrapped<C>` | 类似 `Resolve`，但会将 `Lazy<T>` 项解包为 `T`。 |
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
