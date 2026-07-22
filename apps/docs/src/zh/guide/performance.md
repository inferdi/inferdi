---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/performance#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "指南"
          "item": "https://inferdi.com/zh/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "性能"
          "item": "https://inferdi.com/zh/guide/performance"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/performance#article"
      "headline": "InferDI 性能：热路径解析使用一次 Map.get()"
      "name": "性能"
      "description": "InferDI 使用显式注册、缓存的单例与作用域级服务、0-7 个依赖的直接构造函数调用，以及 Promise 缓存的异步工厂。"
      "url": "https://inferdi.com/zh/guide/performance"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/performance"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, 性能, 基准测试, 零开销, 热路径, 依赖注入, V8, Map.get"
      "articleSection": "指南"
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

# 性能

一次热路径解析就是一次 `Map.get(key)`，紧接着一次直接的 `new Ctor(...)` —— 中间没有反射、没有元数据表、也没有代理。下面的基准测试数字源自几个具体的运行时选择，而不是你必须主动开启的某种特殊快速模式：

| 运行时选择 | 效果 |
| --- | --- |
| 显式注册 | 容器构建就是为每个服务执行一次扁平的 `Map.set`。没有装饰器的副作用、构造函数名称解析器，也没有需要预先准备的元数据表。 |
| 缓存的单例和作用域级服务 | 一次热路径解析会先从 `cache.get(key)` 读取，然后才运行循环检测和生命周期记账。`cache.has(key)` 回退仅用于显式的 `undefined` 值。 |
| 直接调用构造函数 | 具有 0-7 个依赖的类使用直接的 `new Ctor(...)` 路径。更大的构造函数则回退到 `Reflect.construct`。 |
| 异步工厂 | 工厂返回的 `Promise` 会被原样缓存，因此并发调用者共享同一个进行中的初始化，而 `.get()` 仍保持同步。 |
| 严格模式边界 | `strict: true` 捕获循环和生命周期泄漏。`strict: false` 移除该记账，用于经过审计的热路径瞬态依赖图。 |

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

## 快速模式

`new Container({ strict: false })` 移除了运行时循环记账、单例栈跟踪，以及守卫解析路径周围的 `try`/`finally`。包的 README 报告在扁平瞬态依赖图上的本地瞬态解析快约 30%。缓存的单例和作用域级解析不会改变，因为它们在那些守卫运行之前就返回了。

只有在测试已于默认严格模式下充分演练过依赖图之后，才使用快速模式。TypeScript 无法看到单例循环、瞬态循环、动态键、`as` 类型断言，或闭包捕获了更外层容器的工厂。

对于经过性能分析、瞬态解析密集的生产路径，完成上述验证后 `{ strict: false }` 是受支持的最快配置。开发和测试时保留严格模式。它不会改善已缓存的 singleton 或 scoped 解析。

## 热路径的小细节

Symbol 键在密集的解析循环中可能有所帮助，因为 `Map` 按身份比较它们。字符串键需要哈希计算，且在冲突时还需逐字符比较。大多数应用不会测量出差异，因此应将 symbol 键视为由性能剖析驱动的改动。

## 在本地复现

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

基准测试工作区有意与根 pnpm 工作区隔离，并拥有自己的 lockfile。有关方法论、公平性说明和 fixture 来源，请参阅 [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md)。
