# 性能

一次热路径解析会读取 `Map.get(key)`，并在需要构造时直接调用 `new Ctor(...)`。下面的基准测试数字源自具体的运行时选择：

| 运行时选择 | 效果 |
| --- | --- |
| 显式注册 | 容器构建就是为每个服务执行一次扁平的 `Map.set`。没有装饰器的副作用、构造函数名称解析器，也没有需要预先准备的元数据表。 |
| 缓存的单例和作用域级服务 | 一次热路径解析会先从 `cache.get(key)` 读取，然后才运行循环检测和生命周期记账。`cache.has(key)` 回退仅用于显式的 `undefined` 值。 |
| 直接调用构造函数 | 具有 0-7 个依赖的类使用直接的 `new Ctor(...)` 路径。更大的构造函数则回退到 `Reflect.construct`。 |
| 异步工厂 | 工厂返回的 `Promise` 会被原样缓存，因此并发调用者共享同一个进行中的初始化，而 `.get()` 仍保持同步。 |
| 运行时契约 | 默认值/`fast: false` 保留运行时检查和精确的可变父链。`fast: true` 关闭检查并启用固定拓扑的作用域查找。 |

![Benchmark results](/benchmarking_results.png)

## 基准测试套件

仓库的基准测试套件将 InferDI 与 InversifyJS v8、PROXY 和 CLASSIC 模式下的 Awilix v13、TSyringe v4、TypeDI v0.10 以及 Typed Inject v5 进行比较。

所有数字均为 Node 22 上每秒的操作数。越高越好。

| 场景 | InferDI | InversifyJS | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. 热路径单例解析**（缓存已预热） | **14.3 M** | 10.7 M | 7.0 M | 7.3 M | 6.7 M | 5.8 M | 6.45 M |
| **2. 瞬态解析**（每次调用创建新实例） | **9.75 M** | 6.1 M | 4.1 M | 3.45 M | 3.0 M | 2.5 M | 1.6 M |
| **3. 深层依赖图**（10 层，全部瞬态） | **2.3 M** | 1.5 M | 1.3 M | 716 k | 736 k | 643 k | 222 k |
| **4a. 宽依赖图**（4 个依赖，根为瞬态） | **8.25 M** | 4.9 M | 3.4 M | 2.2 M | 2.3 M | 1.65 M | 1.1 M |
| **4b. 宽依赖图**（10 个依赖，根为瞬态） | **3.5 M** | 1.9 M | 2.6 M | 1.2 M | 1.3 M | 938 k | 458 k |
| **5. 容器构建 + 首次解析** | **400 k** | 13.2 k | 223 k | 10 k | 8.3 k | 206 k | 282 k |
| **6. 作用域生命周期**（创建 + 解析 + 清理） | **2.85 M** | 35 k | 2.45 M | 330 k | 430 k | 1.1 M | 665 k |
| **7. 惰性解析**（延迟包装器） | **11.8 M** | 7.6 M | 7.15 M | 5.6 M | 4.7 M | 4.25 M | 2.85 M |

## 这些数字说明了什么

- 缓存的单例解析比最接近的基线 InversifyJS 快 1.34 倍。
- 容器构建加首次解析有利于扁平注册。InferDI 从头注册整个依赖图；而基于装饰器的库在模块求值期间已经支付了部分注册工作。
- 宽依赖图场景说明了为何 arity unrolling 很重要。四个依赖时，InferDI 比最接近的基线快 1.68 倍。十个依赖时，InferDI 回退到 `Reflect.construct`，同时仍比 Typed Inject 快 1.35 倍。
- 作用域生命周期包括作用域创建、解析和清理。场景 6 在每次迭代中都包含释放工作，因此它衡量的是作用域所有权，而不仅仅是解析。
- InferDI 在全部 8 个场景中领先。Typed Inject 在作用域流程和 10 个依赖的宽图场景中仍是最接近的非 InferDI 基线；InversifyJS 则最接近缓存单例、瞬态、深层图和 4 个依赖的宽图场景。

## `fast: true`

`new Container({ fast: true })` 移除了运行时循环记账、单例栈跟踪，以及守卫解析路径周围的 `try`/`finally`。固定 scope 会直接读取 registry owner，不再遍历父链，并把委托解析的 singleton 镜像到 scope 缓存中。默认 scope 在每次本地未命中时遍历精确的父链，因此依赖树变更仍然可见。fast 容器会跳过注册期间的防御性失效处理。owned 实例的身份去重仍在 disposal 阶段执行。

默认的 `new Container()` 和显式的 `{fast: false}` 会保留运行时安全检查和可变依赖图。

只有在测试已使用 `fast: false` 充分演练过依赖图之后，才使用 `fast: true`。TypeScript 无法看到单例循环、瞬态循环、动态键、`as` 类型断言，或闭包捕获了更外层容器的工厂。请通过单一线性 fluent 链对每个运行时键只注册一次，在首次解析或创建 scope 前完成所有注册，激活后保持依赖树不可变，并先释放子 scope，再释放其祖先。

对于经过性能分析的生产路径，完成上述验证后 `{fast: true}` 是受支持的最快配置。开发、测试、热重载以及任何激活后仍会变更的依赖树都应保留 `fast: false`。

## 热路径的小细节

### transient 服务的构造

`registerClass` 是 transient 服务的默认选择。只有性能分析确认同一依赖图频繁解析许多依赖数量相同的 transient 类时，才需要改用工厂。

针对这一特定的 V8 热点，显式工厂可以为每项服务保留独立的构造调用点：

```ts
const container = new Container()
  .declareScopeInputs<{ context: RequestContext }>()
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    ['context', 'schema'],
    'transient'
  )
```

工厂会重复依赖列表，因此只应在实际应用中测得收益后使用。共享的泛型构造辅助函数会合并调用点，使这项优化失效。

### 键的表示方式

Symbol 键在密集的解析循环中可能有所帮助，因为 `Map` 按身份比较它们。字符串键需要哈希计算，且在冲突时还需逐字符比较。大多数应用不会测量出差异，因此应将 symbol 键视为由性能剖析驱动的改动。

## 在本地复现

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

基准测试工作区有意与根 pnpm 工作区隔离，并拥有自己的 lockfile。有关方法论、公平性说明和 fixture 来源，请参阅 [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md)。
