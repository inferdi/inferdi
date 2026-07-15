---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/reference/manifesto#breadcrumb"
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
          "name": "InferDI 核心架构宣言"
          "item": "https://inferdi.com/zh/reference/manifesto"
    - "@type": "Article"
      "@id": "https://inferdi.com/zh/reference/manifesto#article"
      "headline": "InferDI 核心架构宣言"
      "name": "InferDI 核心架构宣言"
      "description": "InferDI 背后的架构宣言：凡是编译器能够静态验证的，都必须静态验证，做到零运行时开销、零依赖、零装饰器，以及由此带来的有意识的权衡取舍。"
      "url": "https://inferdi.com/zh/reference/manifesto"
      "mainEntityOfPage": "https://inferdi.com/zh/reference/manifesto"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, 宣言, 架构, 设计原则, 类型安全, 零开销, 零依赖, 依赖注入"
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

# InferDI 核心架构宣言

本文档规约 `packages/inferdi` 中的 `@inferdi/inferdi`。在评审任何触及公开 API、类型系统、`get()` 解析路径、注册形态、作用域语义或清理行为的 PR 之前，请先阅读本文档。

## 1. 哲学与承诺

### 使命

InferDI 证明 TypeScript 的依赖注入可以在不放弃静态保证的前提下保留运行时灵活性。依赖图就是一个 TypeScript 类型。只要编译器能够校验某条规则，InferDI 就必须把该规则编码进公开签名中。运行时检查的存在是为了应对 `as` 强制转换、被捕获的外部容器、动态键，以及其他 TypeScript 无法看到整个依赖图的场景。

### 价值主张

图即类型。缺失的键、错误的构造函数参数位置、重复注册，或者单例向作用域级服务的泄漏，都应该在生产代码运行之前就失败。InferDI 同样让运行时契约保持精简：核心软件包中没有运行时依赖、没有装饰器、没有元数据反射、没有 proxy 陷阱、也没有任何框架机制。

缓存命中的解析始终保持为单次 `Map.get()` 的快速路径。类的构造对 0-7 个依赖使用按参数个数展开的直接 `new Ctor(...)` 调用，对 8 个及以上依赖使用经过实测的尾部路径。

如果某个特性会削弱这些承诺，就应当拒绝它，或者将其移出核心。

## 2. 不可妥协的支柱

### 2.1 端到端的类型安全

在 TypeScript 能够表达规则的地方，每一个公开签名都必须让无效的依赖图状态无法被表达。

- `register*` 使用 `K & ([K] extends [keyof T] ? never : unknown)`，使重复的键在编译期失败，且出错的键在错误信息中保持可见。
- `DepsOf<AllowedDeps<T, Kind>, A>` 会按位置和结构可赋值性，将 `deps` 元组与构造函数参数进行核对。
- `AllowedDeps<T, Kind>` 会收窄传入工厂的容器。在单例工厂内部，`c.get('scoped')` 是一个类型错误。
- `Spec`、`LazySpec`、`SpecMap`、`Module`、`Container.Resolve`、`Container.ResolveUnwrapped`、`Container.UnwrappedValue` 和 `Container.Providers` 都属于契约的一部分。对它们的改动应视为公开 API 的变更。
- 新增或改动的公开类型接口需要在 `packages/inferdi/__tests__/container.test-d.ts` 中提供正向类型测试和负向的 `// @ts-expect-error` 测试。

已知的 TypeScript 限制必须被记录，而非被隐藏。例如，两个具有相同结构类型的依赖仍然可以互换，除非用户引入名义上的区分，例如 `unique symbol` 键或带品牌（branded）的值类型。

### 2.2 零装饰器，零 reflect metadata

InferDI 是面向 ES2022 的普通 TypeScript。不要添加装饰器、`reflect-metadata`、`experimentalDecorators`、`emitDecoratorMetadata`、TS transformer 或转译器插件。

- 构造函数类型是依赖类型的权威来源。
- 显式的 `deps` 元组是参数顺序的权威来源。
- 运行时不会检查构造函数的参数名、生成的元数据或类字段。

装饰器和元数据会把 InferDI 变成另一个库。它们会引入运行时状态、工具链要求和冷启动开销，而这些都是核心软件包所拒绝的。

### 2.3 生命周期即类型

核心有三种注册种类：`singleton`、`scoped` 和 `transient`。每个注册都通过 `Spec<V, Kind>` 携带其生命周期。

- 单例不得直接依赖作用域级或瞬态服务。`AllowedDeps<T, Kind>` 在编译期强制执行这一点；`strict: true` 在运行时针对强制转换和动态注册强制执行这一点。
- `Lazy<V>` 会保留目标生命周期。单例消费者只能注入 `LazySpec<V, 'singleton'>`。`Lazy<scoped>` 和 `Lazy<transient>` 对作用域级和瞬态消费者仍然合法，但对单例消费者仍然非法。
- 运行时的 `Registration.lazy` 标志只能在目标种类为 `'singleton'` 的惰性伴生项上为 `true`。
- 运行时的 `Registration.owned` 标志只会在创建值归容器所有的类或工厂注册上为 `true`；在 `registerValue`、`.override()` 和惰性伴生项上为 `false`。
- `registerValue` 和 `.override()` 的值由外部拥有。它们不会进入清理队列。
- `.override()` 是一个测试逃逸口。它必须保留原始的 `kind` 和 `lazy` 标志，保持作用域局部，拒绝未知的键，拒绝已释放的容器，并拒绝已在同一容器上被解析过的键。
- `dispose()` 只触及该容器所拥有的实例。父容器与子容器不会相互释放。

### 2.4 解析热路径保持精简

`get()` 中的第一个操作是本地缓存查找：

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

不要在此查找之前添加任何工作。

- 显式的 `undefined` 值通过 `UNDEFINED_MARKER` 表示；不要在缓存命中路径上重新引入第二次 `cache.has(key)` 查找。
- `_disposed`、本地注册查找、父级查找、`lookupCache`、循环检查、生命周期检查以及单例栈（singleton-stack）的变更，全部位于缓存快速路径之后。
- 本地注册必须在父链查找之前被检查。`lookupCache` 是仅用于父级命中的冷路径备忘录。
- 构造函数调用对 0-7 个参数保持按参数个数展开。8 个及以上的路径使用 `Reflect.construct`，并配合通过 `push` 构建的紧凑数组（packed array）。
- `get()` 保持同步。共享的 `resolving` 数组和 `singletonStack` 之所以能正常工作，仅仅是因为一次解析会在调用栈上原子地运行。
- `strict: false` 可以在缓存快速路径之后移除运行时的循环与生命周期检查。它不得改变可观察的缓存命中语义。

`packages/inferdi/__tests__/container.bench.ts` 不受 CI 强制约束。对于触及 `get()`、注册对象形态、缓存表示、作用域查找、惰性伴生项或构造函数调用的改动，评审者必须要求提供基准测试输出。在相关场景中超过 5% 的本地性能回退会阻止合并，除非该 PR 包含一份范围明确、书面的理由说明。

### 2.5 零运行时依赖

`@inferdi/inferdi` 没有运行时依赖。请保持这一点。

已发布的产物应保持在 gzip 压缩后 2.5KB 以下。CI 目前尚未强制执行这一预算，因此对于向核心实现或公开辅助函数添加代码的 PR，评审者必须检查产物大小。

## 3. PR 过滤器

对于每一个触及 `packages/inferdi/src`、`packages/inferdi/package.json`、`packages/inferdi/jsr.json` 或核心测试的 PR，请在评审时回答以下问题：

1. 该改动是否保留了编译期的依赖图保证，还是在没有记录 TypeScript 限制的情况下，把某条规则下放到了运行时检查？
2. 它是否触及 `get()` 的缓存命中行为、注册对象形态、作用域查找、惰性解析或构造函数调用？如果是，基准测试证据在哪里？
3. 它是否向核心软件包添加了运行时依赖、装饰器支持、元数据反射、基于 proxy 的解析行为或转译器要求？

如果第 1 点在没有正当理由的情况下把类型规则下放到运行时，第 2 点缺乏基准测试证据，或第 3 点的答案为“是”，则应拒绝该 PR。

## 4. 严格管控清单

以下任何一项匹配的改动都需要在 PR 中给出明确的理由说明。

### 热路径与运行时形态

- [ ] 在 `get()` 中的 `cache.get(key)` 之前添加了工作？
- [ ] `UNDEFINED_MARKER`、`cache`、`regs`、`lookupCache` 或 `Registration` 的形态发生了变化？
- [ ] `Registration` 的属性顺序从 `{kind, lazy, fn, owned}` 发生了改变？
- [ ] 本地注册表查找被移到了父级查找之后？
- [ ] 在解析过程中添加了 `Proxy`、`Reflect.get`、`Object.defineProperty` 或元数据查找？
- [ ] `get()` 被改为 `async`？
- [ ] 移除或重塑了针对 0-7 个构造函数参数的按参数个数展开分支？

### 类型系统

- [ ] 在 `.override()` 之外削弱了重复键守卫？
- [ ] 在任何公开键约束中，`string | symbol` 被收窄为 `string`？
- [ ] 削弱了 `AllowedDeps`、`LazySpec` 或生命周期过滤？
- [ ] `NoKeyOverlap`、`Module`、`SpecMap` 或命名空间辅助类型发生了变化？
- [ ] 在 `src/` 中新增了不安全的 `any`、`unknown as` 或 `// @ts-ignore`？
- [ ] 公开类型行为在没有类型测试的情况下发生了变化？

### 依赖与构建

- [ ] 向 `packages/inferdi/package.json` 添加了运行时依赖？
- [ ] 添加了对 `reflect-metadata`、`tslib` 或框架胶水代码的 peer 依赖？
- [ ] 在未经评审批准的情况下超出了产物预算？
- [ ] 需要 TS 插件、transformer、装饰器标志或元数据生成？

### 生命周期与释放

- [ ] `dispose()` 或 `[Symbol.dispose]()` 不再在调用 disposer 之前设置 `_disposed`？
- [ ] 状态清理被移到了 disposer 调用之后？
- [ ] 移除了父级分离（detach）或 `lookupCache` 清理？
- [ ] 改变了 LIFO 的释放顺序？
- [ ] disposer 的探测顺序从 `Symbol.asyncDispose` 到 `Symbol.dispose` 再到 `.dispose()` 发生了改变？
- [ ] 多个清理失败不再聚合为 `AggregateError`？
- [ ] 同步清理不再报告对异步资源的误用？

### 逃逸口与动态使用

- [ ] 在首次解析之后允许了 `.override()`？
- [ ] `.override()` 不再保留 `kind` 或 `lazy`？
- [ ] `.has()` 变成了一个解析器，或开始变更缓存？
- [ ] 运行时构造的键被推举为主要 API？
- [ ] 向核心添加了自动装配（auto-wire）、自动注入（auto-inject）、按参数名注入、文件系统扫描或模块发现？

## 5. 有意识的权衡

请记录这些选择，而不是去“修复”它们。

| 权衡 | 原因 |
|---|---|
| 不支持 ES5 或低于 ES2022 的目标 | `Map`、`Symbol`、`WeakRef`、`Reflect.construct`、`Symbol.dispose` 和 `Symbol.asyncDispose` 是基础设施。该软件包只为缺少这些符号的运行时填补释放符号（disposal symbols）的 polyfill。Node 16+ 始终是下限。 |
| 没有装饰器 API | 基于装饰器的 DI 是另一个库。 |
| 没有运行时元数据 | 构造函数签名和显式的 `deps` 元组提供了依赖图。运行时自省会引入依赖以及更弱的失败模式。 |
| 对相同结构的依赖不做名义区分 | TypeScript 使用结构可赋值性。如果两个键暴露相同的形态，`DepsOf` 无法得知用户的语义意图。当相同形态的服务之间顺序重要时，请使用带品牌的类型或 `unique symbol` 键。 |
| 没有异步 `get()` | 当前的循环与生命周期守卫使用共享的同步调用栈状态。异步解析 API 将需要独立的逐次解析记账。 |
| 不检测异步工厂之间的循环 | 在一次 `await` 之后，同步解析栈已不复存在，待定的 promise 可能满足后续的 `c.get()` 调用。检测这一点会向解析引入异步追踪。请拆分循环、提升共享初始化逻辑，或在合法的地方使用 `Lazy<singleton>`。 |
| 不在异步边界后进行运行时生命周期检测 | `AllowedDeps` 仍会阻止无效的类型化工厂，但 `await` 后通过 `as` 强制转换或捕获的外部容器会在 `singletonStack` 清理后运行。完整防护需要异步上下文跟踪。请在同步阶段读取依赖项。 |
| 没有自动断环 | 循环属于架构缺陷，除非其中一端是显式的惰性单例伴生项。InferDI 会检测受支持的运行时循环并报告它们；它不会臆造 proxy 或部分构造的实例。 |
| 不支持泛型 `<T>(c: Container<T>) => ...` 模块 | 在泛型函数体内部，`keyof T` 会坍缩为 `DependenciesMap` 的上界。请使用内联的 `.use()` lambda，或带有已知输入形态的 `Module<TIn, TOut>`。 |
| 没有动态 DI 解析器 API | `.has(key)` 是被认可的动态探测方式。静态键应直接使用 `.get()`。 |
| 没有生产环境覆盖方案 | `.override()` 仅用于测试和热重载夹具。生产环境的依赖图选择应当存在于 `.use()` 或常规的构建器代码中。 |
| 没有父到子的级联释放 | 每个容器拥有其自身的实例。级联释放会使 `dispose()` 成为非局部的副作用，并破坏作用域所有权。 |
| 解析时没有钩子、拦截器或中间件 | 那是 AOP。它会向热路径添加工作，并模糊核心契约。 |
| 核心中没有框架胶水代码 | 框架适配器应当存在于适配器软件包中。核心保持零依赖、与框架无关。 |

## 6. 非目标

InferDI 不会成为：

- 一个通用的 IoC 框架。
- 一个装饰器或反射容器。
- 一个请求上下文系统或 `AsyncLocalStorage` 的替代品。
- 一个自动装配扫描器。
- 一个用于解析期中间件的插件宿主。
- 一个面向旧式 DI 容器的兼容层。

最终规则：图即类型，类型即契约。
