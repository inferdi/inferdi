# 类型安全

InferDI 把已声明的依赖图保存在容器类型中。每次注册都会加入键、服务类型、生命周期、同步或异步状态，以及作用域输入要求。后续调用都按这份不断累积的图类型状态检查。

## 构造函数签名

`registerClass` 按位置和结构兼容性，将依赖键与构造函数参数逐一核对。

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

这两个依赖有不同的公开结构，因此交换顺序会产生示例所说的错误：

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript 采用结构类型。两个空类或公开成员相同的类可以互相赋值，编译器无法识别它们的业务含义。请让契约具有不同结构。若两个值结构相同但语义上必须区分，请使用 [Symbol 键](./symbol-keys#same-value-shape)一节介绍的品牌类型。

## 键的唯一性

每次链式注册都会返回图类型更宽的容器。再次注册已有键会报错：

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

测试需要有意替换服务时使用 `.override()`。每次注册后都要保留返回的新容器；旧引用没有后续节点的图状态。[不良实践](./bad-practices#stale-builder-references)展示了这种错误。

唯一性检查会覆盖键类型的全部候选值。注册 `'dsn'` 后，类型为 `'dsn' | 'replica'` 的候选键会被拒绝，因为运行时值可能覆盖 `'dsn'`。宽泛的 `string` 和 `symbol` 在不与已知图重叠时仍然可用，但宽泛键也会降低整张图的类型精度。

## 动态键

`.get()` 直接检查字面量键。运行时获得的键应先用 `.has()` 收窄：

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` 只证明键已注册。它不能证明缺少的作用域输入已经就绪，也不能让同步 `.get()` 接受异步键。

## 类型中的生命周期

每个条目都记录生命周期。单例不能捕获作用域级或瞬态依赖：

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

默认运行时契约会再次检查循环和生命周期，用来捕捉类型转换、动态键和 TypeScript 无法分析的外部容器引用。`{ fast: true }` 是另一套固定图契约，运行时检查更少。

## 就绪状态与异步状态

作用域输入和声明式异步依赖还会改变键是否就绪，以及应使用 `.get()` 还是 `.getAsync()`：

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

根容器缺少 `request`；作用域中的 `handler` 虽已就绪，却仍因依赖 `database` 而保持异步。接着阅读[作用域输入](./scope-inputs)和[异步依赖](./async-dependencies)。
