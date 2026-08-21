# 类型安全

InferDI 的核心原则：依赖图存在于类型系统之中。一个无效的依赖图——错误的参数顺序、从未注册的键、单例去引用作用域级状态——都是你在编辑器里就能看到的类型错误，而不是在高负载下才发现的堆栈跟踪。凡是编译器能够静态证明的，都会被静态校验；运行时守卫只是用来捕捉那些被 `as` 类型转换和动态键绕过的问题。

## 构造函数签名

`registerClass` 会根据构造函数的参数列表来校验依赖元组。

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

如果构造函数发生变化，注册也会随之改变。把参数交换成 `['db', 'logger']` 会被拒绝，因为第一个构造函数参数期望的是 `Logger`。

## 键的唯一性

每次注册都会返回一个被扩宽的容器类型。通过流式 API 重复注册同一个键会被拒绝：

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

当替换是有意为之时，测试应使用 `.override()`。

每次注册后，请继续使用返回的扩展容器。旧引用不包含当前调用链的依赖图类型；参见[不良实践](./bad-practices)。

唯一性守卫会检查键类型所表示的全部候选值。注册 `'dsn'` 后，如果候选键的类型是 `'dsn' | 'replica'`，TypeScript 会拒绝这次调用，因为运行时值可能覆盖 `'dsn'`。宽泛的 `string` 或 `symbol` 也遵循这项规则；`lazyKey` 不能与主键或已有键重叠。

只要候选值不与依赖图重叠，宽泛键和联合键仍可使用。宽泛的 `string` 可以注册到空容器，也可以跟在仅含 symbol 键的注册之后。注册前请把运行时键收窄到确定的新成员；需要替换时请使用 `.override()`。

## 动态键

静态键由 `.get()` 直接检查。键来自运行时输入时，应先用 `.has()` 缩小类型：

```ts
const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

上面的具体依赖图没有缺失的作用域输入，`.getAsync()` 可以接受任一已注册键，无论其为同步还是异步模式。`.has()` 只证明键已注册。容器已释放时它返回 `false`，但它不能证明作用域输入已就绪，也不能证明键可传给 `.get()`。

## 类型中的生命周期

每个条目都同时携带值类型及其生命周期种类。类型系统会对依赖进行过滤，使单例无法直接依赖作用域级或瞬态服务。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

默认 `{fast: false}` 的运行时检查仍作为针对 `as` 类型转换、动态键、捕获的外层容器以及依赖循环的纵深防御手段。

## 就绪状态与异步状态

依赖图类型还会记录作用域输入要求和声明式异步注册。输入尚未提供时，对应键不会出现在 `.get()` 中。`AsyncSpec` 键及依赖它的类需要通过 `.getAsync()` 解析。

```ts
const root = new Container()
  .declareScopeInputs<{request: Request}>()
  .registerAsyncFactory('db', openDatabase, [])
  .registerClass('handler', Handler, ['request', 'db'], 'scoped')

const scope = root.createScope({request})

// @ts-expect-error: handler is async
scope.get('handler')

await scope.getAsync('handler')
```

使用[作用域输入](./scope-inputs)建模就绪状态，使用[异步依赖](./async-dependencies)选择 Promise 契约。
