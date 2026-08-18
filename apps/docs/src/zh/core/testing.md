# 测试与覆盖

当测试需要用 mock 替换现有注册时，请使用 `.override()`。

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

覆盖值必须可赋值给原始注册的类型。缺失的键和不兼容的 mock 都是 TypeScript 错误。

## 类型化 Provider

`Container.Providers<C>` 将已构建的容器类型转换为 provider 函数集合。测试辅助函数可以借此创建 mock，而无需解析生产依赖图。

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

该类型保留每项已注册服务的具体类型，包括受管理的惰性伴生键。仅通过 `declareScopeInputs()` 声明的键不会出现在映射中，因为它们由 `createScope(inputs)` 提供。InferDI 不会自动注册或接管这些 provider，它们仍由测试代码管理。

## 覆盖时机

请在解析依赖图之前应用覆盖：

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

第二行会抛出异常，因为 singleton 值已缓存在当前容器中。该检查有意只依赖本地缓存：它也能发现缓存在当前作用域中的 scoped 值、`registerValue` 和重复覆盖。在默认 `{fast: false}` 下，transient 解析以及通过子容器解析但由祖先容器拥有的值不会进入本地缓存，因此不会被记录。Fast scope 可以把委托解析的 singleton 镜像到本地缓存中，并且不支持激活后的变更。已经返回的 transient 仍由原调用方持有，之后的解析则会返回 mock。这是需要了解的契约边界，并不意味着应当延迟覆盖；在解析依赖图之前完成所有覆盖才能避免图发生割裂。

## 所有权

覆盖值由外部拥有。与 `registerValue` 一样，覆盖不会被加入容器的释放队列。测试夹具拥有它自己的清理职责。

## 作用域局部性

覆盖只会改变它被调用的那个容器：

```ts
const scope = root.createScope().override('db', mockDb)
```

根容器和同级作用域不受影响。父级的覆盖通过常规的父级查找仍然可见。
