# Express Adapter

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) is Express 5 middleware. It creates one request scope, exposes it as `req.di`, and disposes it after the Node response finishes or closes.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
```

## Request Scope

```ts
const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  setupScope: (scope, req) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = req.get('x-user-id') || undefined
    request.ip = req.ip
  },
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

The adapter does not globally augment `Express.Request` with `any`, `unknown`, or a base container. Applications own their concrete request type.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | required | Root container. Never disposed by this middleware. |
| `createScope` | `root.createScope()` | Custom request scope creation. |
| `setupScope` | none | Hydrates the scope before route handlers. |
| `disposeScope` | `scope.dispose()` | Custom disposal. |
| `autoDispose` | `true` | `false` or predicate `false` transfers ownership. |
| `onDisposeError` | `console.error` | Cleanup failure sink. |

## Streaming and Background Work

Normal Express stream responses do not need a skip because the adapter waits for `finish` or `close`.

Use `skipInferdiDispose(req)` when work intentionally outlives the HTTP response:

```ts
import { skipInferdiDispose } from '@inferdi/express'

app.get('/background', (req, res) => {
  skipInferdiDispose(req)
  const scope = req.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  res.status(202).json({ status: 'queued' })
})
```

## Failed Request Caveat

Unlike the other adapters, Express cannot reliably force-dispose a skipped scope on a handled route error. Express middleware is callback-style; after `next()` returns, the adapter cannot observe a downstream exception that was later handled by an error handler. If a route calls `skipInferdiDispose(req)` and then fails, the scope remains application-owned. Dispose it from your own error path or avoid combining skips with routes that may throw.
