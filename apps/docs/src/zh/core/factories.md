# 工厂

如果创建过程只是 `new Ctor(...deps)`，请使用 `registerClass`。需要读取配置、调用第三方 API、绑定接口或执行其他显式逻辑时，再使用 `registerFactory`。

```ts
const container = new Container()
  .registerValue('config', {
    dsn: 'postgres://localhost/app',
    poolSize: 10
  })
  .registerFactory('pool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepository, ['pool'])
```

工厂的返回类型就是注册后的服务类型。

## 可访问容器的工厂

基本回调接收一个按生命周期过滤后的容器。singleton 工厂只能解析对 singleton 安全的依赖；scoped 和 transient 键会被 TypeScript 拒绝。

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

需要条件解析或多步创建时使用此形式。回调中的 `.get()` 必须保持同步。如果初始化边界需要沿依赖图传播，请改用 `registerAsyncFactory`。

## 声明工厂依赖

带 `deps` 的重载会把工厂要求写入依赖图，并把回调中的解析器限制到这些键：

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('logger', Logger, [])
  .registerFactory(
    'requestLog',
    (deps) => new RequestLog(
      deps.get('request'),
      deps.get('logger')
    ),
    ['request', 'logger'],
    'scoped'
  )
```

声明的依赖会把作用域输入和生命周期要求传递到模块及后续注册中。与 `registerAsyncFactory` 不同，此回调接收解析器，而不是按位置排列的值。

## 工厂生命周期

工厂与类使用同一套生命周期：

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

singleton 和 scoped 结果会被缓存并由容器管理。transient 结果既不缓存，也不由 InferDI 释放。

第四个参数可传入 `lazyKey`，创建保留目标生命周期的伴生键：

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

创建伴生键时必须明确指定生命周期，包括 `'singleton'`。完整规则见[惰性注入](./lazy-injection)。

## 绑定接口

接口在运行时没有构造函数。若消费者应依赖抽象，请显式指定服务类型：

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>(
    'mailer',
    () => new SendGridMailer()
  )
```

此后 `mailer` 的消费者看到的是 `Mailer`，而不是 `SendGridMailer`。

## 选择 Promise 契约

`registerFactory` 返回的 Promise 本身就是服务值：`.get()` 返回 `Promise<T>`，依赖它的工厂收到同一个 Promise。只有同步依赖图确实需要 Promise 对象时才使用这种形式。

如果服务是 `T`，Promise 只是初始化边界，请使用 `registerAsyncFactory`。异步状态会沿图传播，服务通过 `.getAsync()` 解析。[异步依赖](./async-dependencies)说明了两种契约、缓存、惰性伴生键、失败行为和资源释放。
