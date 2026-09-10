# 不良实践

每次调用 `register*` 后，请继续使用该方法返回的容器引用。旧引用仍携带旧的依赖图类型，即使它指向同一个运行时容器。

## 复用旧引用

每个 `register*` 方法都会修改容器，并返回带有扩展泛型类型的同一对象。TypeScript 会扩展返回值的类型，但不会更改调用前创建的引用类型。

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// 这段代码可以编译，因为 base 的类型仍是 Container<{}>。
base.registerAsyncFactory('dependency', async () => 2, [])

// TypeScript 认为这里是 number，但新注册会提供 Promise<number>。
syncGraph.get('consumer').dependency
```

`base` 和 `syncGraph` 指向同一个对象。最后一次调用会覆盖 `dependency` 的运行时注册，而 `syncGraph` 的类型仍描述原来的同步依赖图。覆盖前注册的类也会保留原来的依赖分类。

## 编译器为何允许这段代码

重复键检查读取当前引用的依赖图类型。`syncGraph` 的类型包含 `dependency`，因此通过 `syncGraph` 再次注册该键会产生类型错误。`base` 的类型仍是 `Container<{}>`，其中 `keyof T` 为 `never`。

TypeScript 不会更新一个可变对象所有别名的泛型参数。它也没有 linear type 或 affine type，无法在注册后把 `base` 标记为已使用。InferDI 不会在每次注册时查询 registry 来追踪旧引用，因为这种检查会增加正确依赖图的构建成本。

## 使用最新返回的引用

请用一条调用链构建依赖图，并使用最终结果：

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

不要忽略 `register*` 的返回值，也不要通过旧引用继续注册。模块也应返回最后一次注册产生的容器。参见[模块](./modules)。

## 不要把 `register*` 当作替换 API

构建生产依赖图时，每个键只选择一次实现。配置需要选择不同实现时，请使用普通条件分支或 `.use()`。

测试可以在解析依赖图之前调用 `.override()`，前提是替换值保留原有的生命周期、惰性模式和异步模式。`.override()` 不能把同步注册转换为声明式异步注册。参见[测试与覆盖](./testing)。

## 在业务逻辑中使用 Service Locator

把容器传给领域服务会隐藏真实依赖，并把缺少键的问题推迟到调用位置。请直接传入服务：

```ts
class UserController {
  constructor(
    private readonly container: AppContainer // [!code --]
    private readonly users: UserRepo // [!code ++]
  ) {}

  show(id: string) {
    return this.container.get('users').find(id) // [!code --]
    return this.users.find(id) // [!code ++]
  }
}
```

如果组装代码确实需要 resolver-aware factory，请把它留在组合根。

## 全局请求作用域

可变的全局作用域可能把一个并发请求的值泄漏给另一个请求。请在请求边界内创建并关闭作用域：

```ts
let currentScope = root.createScope({ request }) // [!code warning]

async function handle(request: Request) {
  const scope = root.createScope({ request }) // [!code focus]
  try {
    return await scope.getAsync('handler')
  } finally {
    await scope.dispose()
  }
}
```

框架适配器会自动管理这条边界，并保留相同的所有权规则。

## 擦除具体容器类型

使用 `Container` 注解会丢失累积的依赖图状态。让 builder 的返回类型自动推断，再从中生成别名：

```ts
const buildContainer = (): Container => new Container() // [!code --]
const buildContainer = () => new Container() // [!code ++]
  .registerClass('users', UserRepo, [])

type AppContainer = ReturnType<typeof buildContainer>
```

使用 `ReturnType` 定义应用自己的容器和作用域别名，不要手写它们的泛型参数。

## 丢失所有权

创建作用域却没有对应的清理路径，会泄漏由作用域拥有的实例。请在创建作用域的生命周期边界清理它：

```ts
const scope = root.createScope({ request }) // [!code warning]
return scope.get('handler').run()

await using ownedScope = root.createScope({ request }) // [!code focus]
return ownedScope.get('handler').run()
```

如果工具链不支持 `await using`，请使用 `try/finally` 和 `await scope.dispose()`。values、overrides、scope inputs 和 transient 结果仍由调用方拥有，需要各自的清理策略。
