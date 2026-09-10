# 快速开始

先用两个普通类和一条显式组合链搭出最小图。理解基础图之后，再加入请求作用域。

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

<<< ../../../snippets/quick-start-sync.ts

`UserService` 不导入 InferDI。组合代码选择 `Logger`，为两个注册命名，并写明构造函数参数顺序。返回的 `root` 类型已经包含这两个服务。

如果修改构造函数却没有更新依赖图，错误会出现在应用组装处：

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class UserService {
  constructor(readonly logger: Logger, readonly region: string) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger']) // [!code error]
```

这就是图类型状态的实际作用：注册逐步细化容器类型，后续操作必须符合已经声明的图。

## 解析服务

`root.get('users')` 同步返回 `UserService`。默认生命周期是 `singleton`，因此重复调用会取得缓存实例。

请求数据需要更短的边界。先声明作用域输入，再在创建子作用域时传入：

<<< ../../../snippets/quick-start-scope.ts

即使请求处理抛错，`finally` 也会关闭子作用域。`scope.dispose()` 释放作用域拥有的 `RequestLog`；传入的 `request` 仍由应用管理。如果 TypeScript 工具链支持 Explicit Resource Management，也可以改用 `await using` 完成同样的清理。

## 选择生命周期

| 生命周期 | 实例策略 | 缓存所有者 | 释放责任 |
|---|---|---|---|
| `singleton` | 每个注册所有者创建一次 | 根容器或注册所有者 | 该容器 |
| `scoped` | 每个解析作用域创建一次 | 子作用域 | 该作用域 |
| `transient` | 每次解析都创建 | 无 | 调用方 |

通过 `registerValue`、`.override()` 或作用域输入提供的值也由应用持有。单例不能直接依赖作用域级或瞬态服务；InferDI 会在类型中拒绝这条声明关系，并在默认运行时契约中再次检查。

## 下一步

[为什么选择 InferDI](./why-inferdi)解释设计取舍，[类型安全](../core/type-safety)列出完整的图检查。[作用域与资源释放](../core/scopes)讲清所有权，[框架适配器](../adapters/)则把作用域接入应用生命周期。
