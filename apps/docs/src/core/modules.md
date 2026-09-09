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

## Dynamic Imports

Use `import()` when an optional or route-specific module should load in a separate JavaScript chunk.

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

The runtime loads and evaluates `reports.module` before `.use()` runs. `.use()` then executes the module synchronously, adds its registrations, and returns the inferred container type. A dynamic import does not make those services asynchronous; use `registerAsyncFactory` when service initialization itself is asynchronous.

In a browser, use this pattern at a route or feature boundary, and only when your bundler emits a separate chunk that nothing else imports statically. Build the feature container after that chunk loads. On a backend, prefer static imports during normal startup. A dynamic import is useful for deployment-selected optional features or cold-start-sensitive serverless paths whose unused code and dependencies should remain unloaded. In either runtime, assemble the container before its first resolution or `createScope()`; do not mutate the application container per request.

For keys selected at runtime, use the [`.has()` type guard](./type-safety#dynamic-keys) before resolution.
