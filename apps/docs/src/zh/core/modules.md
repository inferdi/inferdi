# 模块

使用 `.use()` 可以把一个庞大的容器构建器拆分成更小的部分，同时在整个流式链路上保持类型推断。

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

内联 lambda 是最符合人体工学的形态。lambda 的容器类型会从调用点推断出来，包含链路中先前注册的那些键。

## 具名模块

可复用的具名模块使用 `Module<TRequirements, TProvides>`，只声明所需项和新增项。实际图可以包含额外注册，结果会保留它们。

```ts
import {
  Container,
  type Module,
  type SpecMap
} from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Requirements, Provides> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

const app = new Container()
  .registerValue('config', { env: 'test' })
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

回调只能看到 `Container<TRequirements>`。要求会按服务类型、精确生命周期、同步/异步模式、managed-lazy 模式和作用域输入就绪状态检查。输出不得与实际图中的任何键冲突；缺少要求、不兼容要求和输出冲突都有具名诊断。

## 动态导入

当可选模块或路由专用模块需要作为独立 JavaScript chunk 加载时，可以使用 `import()`。

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

运行时会先加载并执行 `reports.module`，然后才调用 `.use()`。随后，`.use()` 会同步执行该模块、添加注册项，并返回带有推断类型的容器。动态导入不会让这些服务变成异步服务；如果服务初始化本身是异步的，请使用 `registerAsyncFactory`。

在浏览器中，请在路由或功能边界使用此模式，并确保构建工具生成独立 chunk，且其他代码没有静态导入同一模块。chunk 加载后再创建该功能的容器。在后端的常规启动流程中，应优先使用静态导入。动态导入适合由部署配置选择的可选功能，或对冷启动敏感的 serverless 路径，让未使用的代码和依赖保持未加载状态。无论在哪种运行时，都应在首次解析或调用 `createScope()` 前完成容器组装；不要按请求修改应用容器。

如果键在运行时确定，请在解析前使用 [`.has()` 类型守卫](./type-safety#动态键)。

## 编译器检查

在依赖图满足声明的要求之前，不能安装具名模块：

```ts twoslash
// @errors: 2345
import { Container, type Module, type SpecMap } from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ feature: string }>

const addFeature: Module<Requirements, Provides> = (container) =>
  container.registerFactory('feature', (c) => c.get('config').env, ['config'])

new Container().use(addFeature) // [!code error]

const app = new Container()
  .registerValue('config', { env: 'test' })
  .use(addFeature)

const feature = app.get('feature')
//    ^?
```
