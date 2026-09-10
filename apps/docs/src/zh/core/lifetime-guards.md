# 生命周期

InferDI 提供三种生命周期：

| 种类 | 创建时机 | 缓存于 | 由容器释放 |
| --- | --- | --- | --- |
| `singleton` | 每个拥有它的容器创建一次 | 拥有它的容器 | 是 |
| `scoped` | 每个子作用域创建一次 | 子作用域 | 是 |
| `transient` | 每次解析都创建 | 从不缓存 | 否 |

请从 `createScope()` 返回的子容器解析 `scoped` 键。默认的检查契约会拒绝从根容器解析这些键。

## 生命周期规则

单例不能直接依赖 `scoped` 或 `transient` 服务。单例只创建一次并在每个请求间共享，因此如果它捕获了一个作用域级的值——当前请求的上下文、用户或事务——那么这一个请求的状态就会悄无声息地泄漏到所有其他请求中。InferDI 让这种边界情况在类型系统中无法被表达出来，而不是把它留给代码评审。

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

无论选择哪种运行时契约，TypeScript 都会拒绝该注册。在默认的检查契约下，如果类型转换绕过了类型系统，运行时也会拒绝同样的形态。

声明的作用域输入属于 scoped 依赖。读取请求、认证上下文、租户或任务载荷的服务应注册为 `scoped` 或 `transient`；编译器会在运行前拒绝 singleton 消费方。参见[作用域输入](./scope-inputs)。

<!-- Preserve deep links from before the container-option sections moved -->
<h6 id="默认运行时检查" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>
<h6 id="fast-true" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>

运行时是否执行这些检查取决于容器契约。默认契约与 fast 契约的准确行为见
[容器选项](../reference/api#容器选项)。
