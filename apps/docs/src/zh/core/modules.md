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
  type SpecMap,
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
  .registerValue('config', {env: 'test'})
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

回调只能看到 `Container<TRequirements>`。要求会按服务类型、精确生命周期、同步/异步模式、managed-lazy 模式和作用域输入就绪状态检查。输出不得与实际图中的任何键冲突；缺少要求、不兼容要求和输出冲突都有具名诊断。

如果键在运行时确定，请在解析前使用 [`.has()` 类型守卫](./type-safety#动态键)。
