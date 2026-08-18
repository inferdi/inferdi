# Hono Adapter

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) is Hono v4 middleware. It creates one request scope per middleware invocation, exposes it through Hono context variables, and disposes it after the bounded route pipeline completes.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
```

## Request Scope

```ts
const root = buildRootContainer()
const openRequestScope = (requestId: string, userId?: string) =>
  root.createScope({ request: { requestId, userId } })
type RequestScope = ReturnType<typeof openRequestScope>
type AppEnv = InferdiHonoScopeEnv<RequestScope>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  createScope: (_root, c) => openRequestScope(
    crypto.randomUUID(),
    c.req.header('x-user-id')
  )
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` is equivalent to `c.var.di`.

## Custom Key

```ts
type AppEnv = InferdiHonoScopeEnv<RequestScope, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({
  container: root,
  key: 'container',
  createScope: (_root, c) => openRequestScope(
    crypto.randomUUID(),
    c.req.header('x-user-id')
  )
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

The adapter does not globally augment Hono's `ContextVariableMap`, so missing middleware remains visible to TypeScript.

## Options

| Option           | Default              | Description                                        |
|------------------|----------------------|----------------------------------------------------|
| `container`      | required             | Root container. Never disposed by this middleware. |
| `key`            | `'di'`               | Context variable key.                              |
| `createScope`    | `root.createScope()` | Custom request scope creation.                     |
| `setupScope`     | none                 | Runs after creation and before route handlers.     |
| `disposeScope`   | `scope.dispose()`    | Custom disposal.                                   |
| `autoDispose`    | `true`               | `false` or predicate `false` transfers ownership.  |
| `onDisposeError` | `console.error`      | Cleanup failure sink.                              |

## Streaming

Hono streaming helpers can return a `Response` before the stream callback finishes. Call `skipInferdiDispose(c)` and dispose the scope from the stream lifecycle.

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

`skipInferdiDispose` suppresses cleanup only for a successful response. Error paths still dispose.
