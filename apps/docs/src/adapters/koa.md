# Koa Adapter

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) is Koa v3 middleware. It creates one request scope, exposes it as `ctx.state.di`, and disposes it after the Node response finishes or closes.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiKoaState } from '@inferdi/koa'
```

## Request Scope

```ts
const root = buildRootContainer()
const openRequestScope = (request: RequestContext) =>
  root.createScope({ request })
type RequestScope = ReturnType<typeof openRequestScope>

declare module 'koa' {
  interface DefaultState {
    di: RequestScope
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  createScope: (_root, ctx) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: ctx.get('x-user-id') || undefined,
    ip: ctx.ip
  })
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## Custom State Key

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<RequestScope, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({
  container: root,
  key: 'container',
  createScope: (_root, ctx) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: ctx.get('x-user-id') || undefined,
    ip: ctx.ip
  })
}))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | required | Root container. Never disposed by this middleware. |
| `key` | `'di'` | Koa state key. |
| `createScope` | `root.createScope()` | Custom request scope creation. |
| `setupScope` | none | Runs after creation and before downstream middleware. |
| `disposeScope` | `scope.dispose()` | Custom disposal. |
| `autoDispose` | `true` | `false` or predicate `false` transfers ownership. |
| `onDisposeError` | `ctx.app.emit('error')` | Cleanup failure sink. |

## Streaming

Normal Koa stream bodies do not need a skip. The adapter waits for `finish` or `close`.

Use `skipInferdiDispose(ctx)` only when application code intentionally keeps the scope beyond the HTTP response boundary, such as background work:

```ts
import { skipInferdiDispose } from '@inferdi/koa'

app.use(async (ctx) => {
  skipInferdiDispose(ctx)
  const scope = ctx.state.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  ctx.body = { status: 'queued' }
})
```

A downstream error always disposes the scope; successful skipped requests become application-owned.
