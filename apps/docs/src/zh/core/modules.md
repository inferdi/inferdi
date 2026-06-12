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

对于可复用的固定形态模块，请使用导出的 `Module<TIn, TOut>` 类型。

```ts
import {
  Container,
  type Module,
  type SpecMap,
} from '@inferdi/inferdi'

type Base = SpecMap<{ config: { env: string } }>
type Added = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Base, Added> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}
```

像 `<T>(c: Container<T>) => ...` 这样的泛型模块函数无法在函数体内部表达键的唯一性。请使用内联 lambda 或固定形态的 `Module<TIn, TOut>` 声明。

## 动态检查

`.has(key)` 是针对动态键的类型守卫：

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` 从不解析值，并在已释放的容器上返回 `false`。
