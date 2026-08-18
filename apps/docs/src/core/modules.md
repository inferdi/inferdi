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

Reusable named modules declare only what they require and provide with
`Module<TRequirements, TProvides>`. The actual graph may contain additional
registrations; they are preserved in the result.

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

The callback sees only `Container<TRequirements>`. Requirements must match by
service type, exact lifetime, sync/async mode, managed-lazy mode, and scope-input
readiness. Outputs cannot collide with any actual key. Missing requirements,
incompatible requirements, and output collisions produce named diagnostics.

For keys selected at runtime, use the [`.has()` type guard](./type-safety#dynamic-keys) before resolution.
