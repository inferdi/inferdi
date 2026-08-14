# 作用域输入

作用域输入由打开作用域的代码提供，例如 HTTP 请求、已认证用户、租户、任务载荷或追踪上下文。InferDI 会在依赖图中传播这些要求，并在输入齐备前阻止服务解析。

## 声明输入

`declareScopeInputs()` 只把键加入类型级依赖图，不创建运行时注册或值。

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

作用域输入采用 `scoped` 生命周期。单例不能依赖它们，因此编译器会拒绝上例中省略 lifetime 或显式使用 `singleton` 的写法。

## 打开类型安全的配置

`createScope(inputs)` 接受尚未提供的输入子集。返回容器的类型记录了哪些要求已经就绪。

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth has not been provided
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

用普通函数为应用中的作用域配置命名。函数返回类型会保留准确的就绪键集合，无需手写容器类型。

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

在请求、消息或任务边界打开配置。根依赖图无需依赖框架对象。

## 要求会沿依赖图传播

InferDI 会通过类、惰性 companion、声明依赖的同步工厂和声明式异步工厂传播输入要求。

```ts
const app = root
  .registerFactory(
    'requestId',
    (c) => c.get('request').requestId,
    ['request'],
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

带依赖的 `registerFactory` 重载使用元组声明类型级边，并把回调限制为只含这些键的 resolver。运行时仍把 resolver 传给回调。`registerAsyncFactory` 的契约不同：InferDI 解析元组并把位置参数传给回调。

两种 API 的参数顺序也不同：

```ts
registerFactory(key, factory, deps, lifetime)
registerAsyncFactory(key, factory, deps, lifetime)
```

## 嵌套作用域的所有权

子作用域继承输入值，但会创建自己的 scoped 实例。输入值由应用持有，容器不会释放它们。

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript 按声明的逆序释放资源，因此先关闭细化后的子作用域，再关闭父作用域。`root.dispose()` 不会关闭这两个作用域。

## 可复用的类型契约

`ScopeInputMap` 描述具名 `Module` 的输入。`WithRequirements` 把输入要求附加到模块输出。

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

泛型辅助函数也要保留就绪状态：

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## 输入契约

- 声明必须使用有限且必填的 string 或 symbol 键。可选键、数字键、`__proto__`、宽泛索引签名以及键集合不同的联合类型会被拒绝。
- 值为 `undefined` 的必填属性仍算已提供。InferDI 检查属性是否存在，不检查真假值。
- `createScope(inputs)` 对可枚举的自有 string 和 symbol 属性做浅拷贝。复制过程会执行 getter 和 Proxy trap，请传入普通数据对象。
- 输入 schema 只存在于 TypeScript。JavaScript、`any` 或类型断言可以加入未知键，也可以覆盖子容器缓存中的注册。
- `{fast: true}` 支持逐步提供输入，但仍要求依赖图固定：在第一次 `.get()` 或 `.createScope()` 前完成注册。

所有权规则见[作用域与资源释放](./scopes)，依赖作用域输入的异步服务见[异步依赖](./async-dependencies)。
