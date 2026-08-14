# 快速开始

本节将构建一个完整的依赖图，解析根容器中的服务，再创建请求作用域。无需装饰器或元数据配置。

## 安装

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## 构建依赖图

```ts
import { Container } from '@inferdi/inferdi'

type RequestContext = {
  requestId: string
}

class Logger {
  info(message: string) {
    console.info(message)
  }
}

class Database {
  constructor(readonly dsn: string) {}
}

class UserService {
  constructor(
    private readonly request: RequestContext,
    private readonly database: Database,
    private readonly logger: Logger
  ) {}

  find(id: string) {
    this.logger.info(`request=${this.request.requestId} user=${id}`)
    return { id, database: this.database.dsn }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, ['dsn'])
  .registerClass(
    'users',
    UserService,
    ['request', 'database', 'logger'],
    'scoped'
  )
```

每个依赖元组都会与构造函数参数进行检查。交换 `database` 和 `logger`、漏掉 `request` 或使用未知键都会触发 TypeScript 错误。

上面的依赖图包含一个外部输入和四项注册：

```text
dsn ───────────────▶ database (singleton) ─┐
logger (singleton) ────────────────────────┼─▶ users (scoped)
request (scope input) ─────────────────────┘
```

## 解析服务

根容器中的 singleton 可以用 `.get()` 同步解析：

```ts
const database = root.get('database')
```

`users` 需要 `request` 输入，因此要先创建作用域：

```ts
const request = { requestId: crypto.randomUUID() }

await using scope = root.createScope({ request })
const users = scope.get('users')

users.find('42')
```

返回的作用域类型记录了 `request` 已就绪。根容器没有请求输入，因此 `root.get('users')` 无法通过类型检查。

## 选择生命周期

注册默认使用 `singleton`。如果值属于某个作用域或调用方，请显式指定生命周期。

| 生命周期 | 创建时机 | 缓存位置 | 释放方 |
| --- | --- | --- | --- |
| `singleton` | 一次 | 创建它的容器 | 该容器 |
| `scoped` | 每个子作用域一次 | 子作用域 | 该作用域 |
| `transient` | 每次解析 | 不缓存 | 调用方 |

singleton 不能直接依赖 scoped 或 transient 服务。InferDI 会在类型层面执行此规则，默认也会在运行时再次检查。

## 下一步

| 需求 | 继续阅读 |
| --- | --- |
| 了解编译期依赖图检查 | [类型安全](../core/type-safety) |
| 建模请求、租户或任务数据 | [作用域输入](../core/scope-inputs) |
| 异步初始化依赖 | [异步依赖](../core/async-dependencies) |
| 安全关闭数据库和其他资源 | [作用域与资源释放](../core/scopes) |
| 将作用域接入 Web 框架 | [框架适配器](../adapters/) |
| 查看完整的框架与运行时示例 | [示例](./examples) |
