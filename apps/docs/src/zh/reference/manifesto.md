# InferDI 核心架构宣言

本文档规约 `packages/inferdi` 中的 `@inferdi/inferdi`。在评审任何涉及公开 API、类型系统、`get()` 解析路径、注册形态、作用域语义或清理行为的 PR 之前，请先阅读本文档。

## 1. 哲学与承诺

### 使命

InferDI 证明 TypeScript 的依赖注入可以在不放弃静态保证的前提下保留运行时灵活性。依赖图就是一个 TypeScript 类型。只要编译器能够校验某条规则，InferDI 就必须把该规则编码进公开签名中。运行时检查用于应对 `as` 强制转换、被捕获的外部容器、动态键，以及其他 TypeScript 无法看到整个依赖图的场景。

### 价值主张

图即类型。缺失的键、错误的构造函数参数位置、重复注册，或者单例向作用域级服务的泄漏，都应该在生产代码运行之前就失败。InferDI 同样让运行时契约保持精简：核心软件包中没有运行时依赖、没有装饰器、没有元数据反射、没有 proxy 陷阱，也没有框架机制。

缓存命中的解析始终保持为单次 `Map.get()` 的快速路径。类的构造对 0-7 个依赖使用按参数个数展开的直接 `new Ctor(...)` 调用，对 8 个及以上依赖使用经过实测的尾部路径。

如果某项功能会削弱这些承诺，就应当拒绝它，或者将其移出核心。

## 2. 不可妥协的支柱

### 2.1 端到端的类型安全

在 TypeScript 能够表达规则的地方，每一个公开签名都必须让无效的依赖图状态无法被表达。

- `register*` 接受 `key: K & NoKeyOverlap<K, keyof T>`，其中 `NoKeyOverlap` 以非分布式方式检查 `[K & keyof T]`。字面量键、宽类型键、symbol 键和联合键仍然受支持；只要存在任何重叠，就会拒绝整个候选键，而不是静默丢弃联合类型中的某个成员。
- `DepsOf<AllowedDeps<T, L>, A>` 会按位置和结构可赋值性，将 `deps` 元组与构造函数参数进行核对。
- `AllowedDeps<T, L>` 会收窄传入工厂的容器。在单例工厂内部，`c.get('scoped')` 是一个类型错误。
- 闭包形式的 `registerFactory` 接收按 lifetime 过滤后的容器。带依赖项的 overload 接收一个仅限于已声明同步键的 resolver；`registerAsyncFactory` 接收解析后的各位置值，而不是容器。不要混淆这些 callback 契约。
- `Lazy`、`AsyncLazy`、`Lifetime`、`Spec`、`AsyncSpec`、`LazySpec`、`AsyncLazySpec`、`ScopeInputMap`、`WithRequirements`、`DependenciesMap`、`SpecMap`、`ContainerOptions`、`Module`，以及 `Container.ReadyKeys`、`Container.SyncReadyKeys`、`Container.Resolve`、`Container.ResolveUnwrapped`、`Container.UnwrappedValue` 和 `Container.Providers` 都是公开契约。即使运行时代码没有变化，对其可赋值性或推断的任何改动也应视为 API 变更。
- 泛型 resolver 对 `get()` 使用 `Container.SyncReadyKeys<C>`，对 `getAsync()` 使用 `Container.ReadyKeys<C>`。`.has()` 只能证明注册存在；它不能证明同步模式，也不能补足缺失的作用域输入。
- 新增或改动的公开类型接口，需要在 `container.test-d.ts` 或声明式异步类型测试套件中提供正向测试和带 `// @ts-expect-error` 的负向测试。模块或作用域输入的公开诊断文案还需要对应的编译器诊断 fixture，生成的声明也必须继续在 TypeScript 5.2 下通过 `consumer-dts.ts`。

已知的 TypeScript 限制必须被记录，而不是被隐藏。例如，两个具有相同结构类型的依赖仍然可以互换，除非用户通过 `unique symbol` 键或品牌值类型引入名义上的区分。

### 2.2 零装饰器，零反射元数据

InferDI 是面向 ES2022 的普通 TypeScript。不要添加装饰器、`reflect-metadata`、`experimentalDecorators`、`emitDecoratorMetadata`、TS transformer 或转译器插件。

- 构造函数类型是依赖类型的权威来源。
- 显式的 `deps` 元组是参数顺序的权威来源。
- 运行时不会检查构造函数的参数名、生成的元数据或类字段。

装饰器和元数据会把 InferDI 变成另一个库。它们会引入运行时状态、工具链要求和冷启动开销，而这些都是核心软件包所拒绝的。

### 2.3 生命周期即类型

核心有三种注册生命周期：`singleton`、`scoped` 和 `transient`。每个注册都通过 `Spec<V, L>` 及其公开的 `lifetime` 属性携带生命周期。

- 单例不得直接依赖作用域级或瞬态服务。`AllowedDeps<T, L>` 在编译期强制执行这一点；默认的 checked 契约则在运行时针对强制转换和动态注册执行这一点。任何可能包含 `'singleton'` 的目标生命周期联合类型都要使用单例安全过滤器；只有排除了 singleton 的联合类型才能接受短生命周期依赖。
- `Lazy<V>` 和 `AsyncLazy<V>` 会保留目标生命周期。单例消费者只能注入目标生命周期完整状态为 `'singleton'` 的托管 companion。scoped、transient、混合生命周期，以及托管与非托管值的联合类型，对单例消费者都仍然非法。
- 运行时的 `Registration.lazy` 标志只能在目标生命周期为 `'singleton'` 的惰性 companion 上为 `true`。
- 运行时的 `Registration.owned` 标志只在创建值归容器所有的类或工厂注册上为 `true`；在 `registerValue`、`.override()`、惰性 companion、作用域输入和 transient 结果上为 `false`。
- `registerValue`、`.override()` 和作用域输入的值由外部拥有。transient 结果由调用者拥有。它们都不会进入清理队列。
- `.override()` 是面向测试的逃逸口。它必须保留原始的 `kind`、`lazy` 和 `async` 状态，保持作用域局部，并拒绝已声明的作用域输入、未知键、已释放的容器，以及当前容器本地缓存中已有的键。缓存守卫能捕获本地已缓存的 singleton/scoped 解析、`registerValue` 和重复 override，但无法观察 transient 解析，也无法观察通过 checked 子容器解析的祖先所有值。即使运行时守卫无法证明时序，也要在解析依赖图之前应用 override。
- `dispose()` 只触及该容器所拥有的实例。父容器与子容器不会相互释放。

#### 2.3.1 异步模式是类型状态

声明式异步服务与同步服务共用同一依赖图、注册映射、缓存、作用域查找、所有权规则和释放路径。

- `registerAsyncFactory` 在 `AsyncSpec<V, L>` 中记录最终值类型，而不是 `Promise<V>`。它的位置依赖元组像构造函数元组一样接受检查，并保持 readonly，因为注册会保留已经分类的位置。
- singleton 和 scoped 异步注册会缓存同一个原生 Promise，因此并发的 `getAsync()` 调用会加入同一次初始化。仅解析 `AsyncLazy` wrapper 本身不得启动其目标。
- 带有声明式异步依赖的类会传递性地变成异步。它的目标通过 `getAsync()` 解析，其托管 companion 会变成 `AsyncLazy`；由同步/异步键联合类型选出的类会保守地保持混合状态。
- `get()` 在类型层面拒绝声明式异步键。`getAsync()` 接受所有已就绪的键，返回 Promise，并将 resolver 的同步失败转换为 rejection，而不会创建另一套 registry 或解析通道。
- 返回 Promise 的 `registerFactory` 仍然是普通的同步图条目，其服务值就是 Promise 本身。不要把这项兼容契约静默重新分类为 `AsyncSpec`。
- `Registration.async` 是追加在末尾的冷元数据，只在注册期间用于依赖分类。解析热路径绝不能读取它。

#### 2.3.2 作用域就绪性是类型状态

作用域输入描述由应用所有、仅在打开子作用域时才可用的值。

- `declareScopeInputs<Inputs>()` 仅作用于类型，不得修改运行时容器。
- 声明只接受必需且有限的 string 或 symbol 键。数字键、`__proto__`、宽泛索引签名、可选属性、键集合不同的联合类型，以及与现有依赖图冲突的键都会被拒绝。
- `createScope(inputs)` 可以提供缺失输入的任意子集。就绪性会传播到依赖这些输入的注册；嵌套作用域继承已经提供的输入；只有已就绪的键才能被解析。
- 提供的值会浅拷贝到子缓存中，仍由应用所有，不能被重新注册或 override，并且会从 `Container.Providers<C>` 中排除。

#### 2.3.3 模块是需求契约

`Module<TRequirements, TProvides>` 描述可复用的依赖图变换，而不是整个容器的精确别名。

- 实际依赖图可以包含额外条目，但每一项需求都必须在服务可赋值性、精确生命周期、同步/异步状态、托管惰性模式、作用域输入身份和就绪性上匹配。
- 模块 callback 只能看到其声明的需求。返回的依赖图保留所有实际条目，并添加声明的输出。
- 输出键不得与实际依赖图冲突。调用者已经满足的作用域输入需求会从返回的输出状态中移除。
- 泛型 helper `<T>(c: Container<T>) => ...` 无法针对 `DependenciesMap` 上界证明任意新键。请使用 `.use()` 中的内联 lambda，或具名的 `Module<TRequirements, TProvides>`。

### 2.4 解析热路径保持精简

`get()` 中的第一个操作是本地缓存查找：

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

不要在此查找之前添加任何工作。

- 显式的 `undefined` 值通过 `UNDEFINED_MARKER` 表示；不要在缓存命中路径上重新引入第二次 `cache.has(key)` 查找。
- `_disposed`、注册查找、父级查找、循环检查、生命周期检查以及单例栈的变更，全部位于缓存快速路径之后。
- 默认依赖树会先检查本地注册，再遍历精确的父链。它们不保留父级查找快照，因此无需失效账簿或每个作用域的查找元数据，也能继续观察到变更。
- 构造函数调用对 0-7 个参数保持按参数个数展开。8 个及以上的路径使用 `Reflect.construct`，并配合通过 `push` 构建的紧凑数组。
- `get()` 保持同步。共享的 `resolving` 数组和 `singletonStack` 之所以有效，是因为一次解析及每次声明式异步依赖预检都会在调用栈上原子运行。`getAsync()` 只在同一个 resolver 外增加 Promise 边界，绝不会从 continuation 中修改这些栈。
- 声明式异步注册与同步注册共用 `regs`、`cache`、作用域查找、所有权和释放逻辑。`Registration.async` 只是注册阶段依赖分类使用的冷元数据；`get()` 永远不会读取它。
- `{fast: false}` 是默认的 checked 可变契约。`{fast: true}` 会在本地缓存快速路径之后移除循环与生命周期检查，直接读取 registry owner，并将委托的 singleton 镜像到本地缓存。fast 树是一项固定依赖图契约：必须在首次解析或 `createScope()` 之前完成所有 `register*`、`.use()` 和 `.override()`，并且先释放子容器，再释放祖先。只有字面量 `true` 会启用它；强制转换或未知选项值会安全地回退到 checked 契约。
- 保持 `Registration` 热字段的顺序为 `{kind, lazy, fn, owned}`。可选的 `async` 标记只能追加在这些字段之后，并且必须远离解析路径。

`packages/inferdi/__tests__/container.bench.ts` 不受 CI 强制约束。对于涉及 `get()`、注册对象形态、缓存表示、作用域查找、惰性 companion 或构造函数调用的改动，评审者必须要求提供基准测试输出。在相关场景中超过 5% 的本地性能回退会阻止合并，除非该 PR 包含一份范围明确的书面理由。

### 2.5 零运行时依赖

`@inferdi/inferdi` 没有运行时依赖。请保持这一点。

已发布的 bundle 在 gzip 压缩后必须严格小于 3 KiB（3072 字节）。CI 通过 `pnpm run test:bundle-size` 强制执行这一预算；对于向核心实现或公开 helper 添加代码的 PR，评审者仍应检查体积变化。

### 2.6 释放用于落实所有权

释放只会关闭当前容器拥有且已缓存的值。它是幂等的、可安全重入的，并且父子容器彼此独立。

- 先将容器标记为已释放，对 `owned` 取快照并去重，然后在调用用户 disposer 之前清空 `owned`、`cache`、`regs`、`scopeInputs` 和 `parent`。重入解析必须立即看到已经拆除的容器。
- 保持首次创建的 LIFO 顺序。重复的缓存条目，以及解析为同一资源的不同异步工厂，只能关闭该资源一次。
- 异步 `dispose()` 共享同一个进行中的完成 Promise，等待缓存的异步工厂 Promise，依次探测 `Symbol.asyncDispose` → `Symbol.dispose` → `.dispose()`，在失败后继续，并在只有一个错误时抛出该错误、在有多个错误时抛出 `AggregateError`。
- 同步 `[Symbol.dispose]()` 只调用同步协议。缓存的 Promise 或返回 Promise 的普通 `.dispose()` 会被报告为误用；不要启动不可见的后台清理来掩盖错误。
- `registerValue`、`.override()`、作用域输入、惰性 wrapper 和 transient 值都不参与容器清理，因为它们的所有权从未转移给容器。

## 3. PR 过滤器

对于每一个涉及 `packages/inferdi/src`、`packages/inferdi/package.json`、`packages/inferdi/jsr.json` 或核心测试的 PR，请在评审时回答以下问题：

1. 该改动是否保留了编译期的依赖图保证，还是在没有记录 TypeScript 限制的情况下，把某条规则下放到了运行时检查？
2. 它是否涉及 `get()` 的缓存命中行为、注册对象形态、作用域查找、惰性解析或构造函数调用？如果是，基准测试证据在哪里？
3. 它是否向核心软件包添加了运行时依赖、装饰器支持、元数据反射、基于 proxy 的解析行为或转译器要求？

如果第 1 点无正当理由地把类型规则下放到运行时，第 2 点缺少基准测试证据，或第 3 点的答案为“是”，则应拒绝该 PR。

## 4. 严格控制清单

任何符合下列项目的改动，都需要在 PR 中给出明确理由。

### 热路径与运行时形态

- [ ] 是否在 `get()` 的 `cache.get(key)` 之前添加了工作？
- [ ] 是否改动了 `UNDEFINED_MARKER`、`cache`、`regs`、父级查找或 `Registration` 形态？
- [ ] `Registration` 热属性是否不再按 `{kind, lazy, fn, owned}` 排列，或者可选的 `async` 标记是否被移到了这些字段之前？
- [ ] checked 契约中的本地注册查找是否被移到了父级查找之后？
- [ ] 是否向解析过程添加了 `Proxy`、`Reflect.get`、`Object.defineProperty` 或元数据查找？
- [ ] 是否把 `get()` 改成了 `async`？
- [ ] `get()` 是否开始读取 `Registration.async` 或执行就绪性工作？
- [ ] 是否删除或改变了构造函数 0-7 个参数的按 arity 展开分支？
- [ ] fast 作用域是否不再直接读取 registry owner，或者不再只镜像委托的 singleton？

### 类型系统

- [ ] `.override()` 之外的重复键守卫是否被削弱？
- [ ] 是否在任何公开键约束中把 `string | symbol` 缩窄成了 `string`？
- [ ] 是否削弱了 `AllowedDeps`、`LazySpec`、`AsyncLazySpec`、异步传播、就绪性或生命周期过滤？
- [ ] 是否改动了 `NoKeyOverlap`、`ScopeInputMap`、`WithRequirements`、模块兼容性、`SpecMap` 或命名空间 helper 类型？
- [ ] 作用域输入声明是否可以接受可选键、数字键、宽类型键、变体键或冲突键，或者能否在提供之前被解析？
- [ ] 具名模块是否可以隐藏缺失或不兼容的需求，或者让其输出与实际依赖图冲突？
- [ ] 是否在 `src/` 中新增了不安全的 `any`、`unknown as` 或 `// @ts-ignore`？
- [ ] 公开类型行为的变更是否缺少正向/负向类型测试、适用的诊断 fixture 和声明消费者检查？

### 依赖与构建

- [ ] 是否向 `packages/inferdi/package.json` 添加了运行时依赖？
- [ ] 是否添加了对 `reflect-metadata`、`tslib` 或框架 glue 的 peer dependency？
- [ ] 是否超出了严格的 `< 3 KiB` gzip 预算，或者削弱了其 CI 检查？
- [ ] 是否要求 TS plugin、transformer、装饰器 flag 或元数据 emit？

### 生命周期与释放

- [ ] `dispose()` 或 `[Symbol.dispose]()` 是否不再在调用 disposer 之前设置 `_disposed`？
- [ ] 清空 `owned`、`cache`、`regs`、`scopeInputs` 或 `parent` 是否被移到了调用 disposer 之后？
- [ ] 是否移除了父级分离？
- [ ] 所有实例的去重是否不再保留首次创建的 LIFO 顺序？
- [ ] LIFO 释放顺序是否发生了变化？
- [ ] 异步 disposer 的探测顺序是否不再是 `Symbol.asyncDispose`、`Symbol.dispose`、`.dispose()`？
- [ ] 是否不再在探测前等待缓存的异步工厂 Promise，或者共享的已解析资源是否可能被释放两次？
- [ ] 并发的异步 `dispose()` 调用是否不再共享同一个完成 Promise？
- [ ] 多个清理失败是否不再生成 `AggregateError`？
- [ ] 同步清理是否不再报告异步资源误用？

### 逃逸口与动态使用

- [ ] `.override()` 的本地缓存时序守卫是否被削弱，或者其对 transient 和祖先所有解析的已知限制是否被隐藏？
- [ ] `.override()` 是否不再保留 `kind`、`lazy` 或 `async` 状态，变成非局部操作，或者可用于已声明的作用域输入键？
- [ ] `.has()` 是否变成 resolver 或开始修改缓存？
- [ ] `.has()` 是否开始声称能证明就绪性或同步解析安全性？
- [ ] fast 树是否在启用后变为可变，或者“先子级、后祖先”的释放契约是否被削弱？
- [ ] 是否把运行时构造的键提升为主要 API？
- [ ] 是否向核心添加了自动连线、自动注入、按参数名注入、文件系统扫描或模块发现？

## 5. 有意识的取舍

请记录这些选择，而不是“修复”它们。

| 取舍 | 原因 |
|---|---|
| 不支持 ES5 或 ES2022 之前的目标 | `Map`、`Symbol`、`WeakRef`、`Reflect.construct`、`Symbol.dispose` 和 `Symbol.asyncDispose` 都是基础。软件包只为缺少释放 symbol 的运行时提供其 polyfill。Node 16+ 始终是最低要求。 |
| 不提供装饰器 API | 基于装饰器的 DI 是另一个库。 |
| 不提供运行时元数据 | 构造函数签名和显式 `deps` 元组提供依赖图。运行时内省会增加依赖，并产生更弱的失败模式。 |
| 不为结构相同的依赖提供名义区分 | TypeScript 使用结构可赋值性。如果两个键暴露相同的形态，`DepsOf` 无法知道用户的语义意图。当相同形态服务之间的顺序很重要时，请使用品牌类型或 `unique symbol` 键。 |
| 不提供异步 `get()` | `get()` 保持同步。`getAsync()` 包装同一个同步 resolver 并返回 Promise，不会创建另一套 registry、缓存或解析通道。 |
| 返回 Promise 的 `registerFactory` 保持为同步图状态 | 现有工厂可能有意把 Promise 作为服务值暴露。只有 `registerAsyncFactory` 会创建 `AsyncSpec` 和声明式异步传播。 |
| 不检测 Promise 边界后的动态循环 | 声明式异步边会经过同步预检，并使用现有的循环守卫。来自返回 Promise 的兼容工厂或捕获容器的调用，如果发生在 `await` 之后，就会在解析栈清空后运行。请拆分该循环，或提升共享初始化。 |
| 不在异步边界后进行运行时生命周期检测 | `AllowedDeps` 仍会阻止无效的类型化工厂，但 `as` 强制转换和在 `await` 后使用的外部捕获容器会在 `singletonStack` 清空后运行。完整的纵深防御需要异步上下文跟踪。请在工厂的同步前序中读取依赖。 |
| 不自动打破循环 | 除非一侧是显式的惰性 singleton companion，否则循环就是架构缺陷。InferDI 会检测并报告受支持的运行时循环，但不会虚构 proxy 或半成品实例。 |
| 不提供泛型 `<T>(c: Container<T>) => ...` 模块 | 在泛型函数体中，`keyof T` 会收敛到 `DependenciesMap` 上界。请使用 `.use()` 中的内联 lambda，或声明需求的 `Module<TRequirements, TProvides>`。 |
| 不提供隐式作用域输入源 | `declareScopeInputs()` 仅作用于类型。应用需要显式地把自己拥有的值传给 `createScope(inputs)`；核心不会读取环境请求上下文或 `AsyncLocalStorage`。 |
| 不提供动态 DI resolver API | `.has(key)` 是允许的注册探针。它不能证明就绪性或同步模式；对于静态的已就绪键，应直接使用 `.get()` 或 `.getAsync()`。 |
| 不提供生产环境 override 方案 | `.override()` 用于测试和热重载 fixture，其时序检查只能观察本地缓存。生产依赖图的选择应放在 `.use()` 或普通 builder 代码中。 |
| fast 模式是一项固定依赖图契约 | `{fast: true}` 通过信任拓扑、生命周期、循环和 lifetime 不变量，获得更扁平的查找和 singleton 镜像。checked 可变契约仍然是默认值。 |
| 不从父级向子级级联释放 | 每个容器都拥有自己的实例。级联释放会让 `dispose()` 产生非局部副作用，并破坏作用域所有权。 |
| 不在解析时提供 hook、interceptor 或 middleware | 那属于 AOP。它会增加热路径工作并模糊核心契约。 |
| 核心不包含框架 glue | 框架适配器属于适配器软件包。核心保持零依赖，并且与框架无关。 |
| 核心不包含依赖图分析引擎 | 仓库中关于可能的 `@inferdi/graph` 的说明只是提案，不是当前 API。任何未来的开发/CI companion 都必须位于生产解析之外，并且不得改变热注册形态。 |

## 6. 非目标

InferDI 不会成为：

- 通用 IoC 框架。
- 装饰器或反射容器。
- 请求上下文系统或 `AsyncLocalStorage` 的替代品。
- 自动连线扫描器。
- provider 定义 DSL 或运行时模块发现系统。
- 生产核心中的依赖图分析、规则、报告或快照引擎。
- 解析期 middleware 的插件宿主。
- 旧式 DI 容器的兼容层。

最终规则：图即类型，类型即契约。
