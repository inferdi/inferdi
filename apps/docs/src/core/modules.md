# Modules

Use `.use()` to split a large container builder into smaller pieces while keeping type inference across the fluent chain.

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

Inline lambdas are the most ergonomic shape. The lambda's container type is inferred from the call site, including keys registered earlier in the chain.

## Named Modules

For reusable fixed-shape modules, use the exported `Module<TIn, TOut>` type.

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

Generic module functions like `<T>(c: Container<T>) => ...` cannot express key uniqueness inside the body. Use inline lambdas or fixed-shape `Module<TIn, TOut>` declarations.

## Dynamic Checks

`.has(key)` is a type guard for dynamic keys:

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` never resolves the value and returns `false` on disposed containers.
