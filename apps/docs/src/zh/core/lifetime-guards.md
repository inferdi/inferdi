# 生命周期

InferDI 提供三种生命周期：

| 种类 | 创建时机 | 缓存于 | 由容器释放 |
| --- | --- | --- | --- |
| `singleton` | 每个拥有它的容器创建一次 | 拥有它的容器 | 是 |
| `scoped` | 每个子作用域创建一次 | 子作用域 | 是 |
| `transient` | 每次解析都创建 | 从不缓存 | 否 |

在默认的 `{fast: false}` 契约下，从根容器解析 `scoped` 键会抛出 `Scoped "key" cannot be resolved from the root container. Use createScope().`。请从 `createScope()` 返回的子容器解析 scoped 服务。

## 生命周期规则

单例不能直接依赖 `scoped` 或 `transient` 服务。单例只创建一次并在每个请求间共享，因此如果它捕获了一个作用域级的值——当前请求的上下文、用户或事务——那么这一个请求的状态就会悄无声息地泄漏到所有其他请求中。InferDI 让这种边界情况在类型系统中无法被表达出来，而不是把它留给代码评审。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

该注册会被 TypeScript 拒绝。使用 `fast: false` 时，如果有类型转换绕过了类型系统，运行时检查也会拒绝同样的形态。

声明的作用域输入属于 scoped 依赖。读取请求、认证上下文、租户或任务载荷的服务应注册为 `scoped` 或 `transient`；编译器会在运行前拒绝 singleton 消费方。参见[作用域输入](./scope-inputs)。

## 默认运行时检查

`fast` 默认为 `false`。依赖图保持可变，运行时会捕捉：

- 直接从根容器解析 scoped 键
- 由类型转换引入的单例到作用域级或单例到瞬态的违规
- 捕获外层容器的工厂泄漏
- 同步单例循环
- 同步瞬态循环
- 绕过静态检查的动态键误用

```ts
const root = new Container()
const explicitRoot = new Container({ fast: false })
```

## `fast: true`

仅在测试已证明依赖图形态之后才使用 `fast: true`：

```ts
const root = new Container({ fast: true })
```

该选项保留类型层面的契约，但移除运行时循环与生命周期记录。容器树激活后会被视为固定结构，根容器的 scoped 检查也会关闭。

开发和测试时使用 `fast: false`。只有经过验证且不再变更的生产依赖图才应启用 `fast: true`。具体的运行时取舍和激活规则见[性能](../guide/performance#fast-true)。
