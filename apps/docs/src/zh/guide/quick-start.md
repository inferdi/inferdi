# 快速开始

你通过流式 API 构建依赖图，TypeScript 会随着你的编写实时校验：每个依赖元组都会与目标构造函数的参数位置进行匹配，因此交换或缺失的参数是编译错误，而不是运行时的意外。这里没有 `@Injectable()` 装饰器，也没有 `reflect-metadata` —— 接线就是编译器能读懂的普通代码。

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string,
  ) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

对 `registerClass('userRepo', UserRepo, ['logger', 'dsn'])` 的调用会按位置进行校验。如果你把元组换成 `['dsn', 'logger']`，TypeScript 会在应用运行之前报告这个不匹配。

## 解析值

使用 `.get(key)` 进行解析：

```ts
const repo = container.get('userRepo')
```

该键必须在容器类型中注册过。未知的静态键是编译错误。动态键应在 `.get(key)` 之前用 `.has(key)` 探测。

## 选择生命周期

注册默认为 `singleton`。对于类，将生命周期作为第四个参数传入；对于工厂，则作为第三个参数。

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| 类型 | 创建时机 | 是否缓存 | 是否由容器释放 |
| --- | --- | --- | --- |
| `singleton` | 每个拥有它的容器创建一次 | 是 | 是 |
| `scoped` | 每个作用域创建一次 | 是 | 是 |
| `transient` | 每次解析都创建 | 否 | 否 |

单例不能直接依赖 `scoped` 或 `transient` 服务。该规则由类型强制，并在严格模式下由运行时守卫强制。
