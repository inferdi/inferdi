# Koa-Adapter

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) ist Middleware für Koa v3. Sie erstellt einen Request-Scope, stellt ihn als `ctx.state.di` bereit und gibt ihn frei, sobald die Node-Antwort beendet oder geschlossen wird.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { Container } from '@inferdi/inferdi'
import { inferdiKoa, type InferdiKoaState } from '@inferdi/koa'
```

## Request-Scope

```ts
type RequestContext = {
  requestId: string
  userId?: string
  ip: string
}

class Users {
  constructor(readonly request: RequestContext) {}

  profile(id: string) {
    return { id, userId: this.request.userId }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('users', Users, ['request'], 'scoped')
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

## Eigener State-Schlüssel

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

## Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `container` | erforderlich | Root-Container. Diese Middleware gibt ihn nie frei. |
| `key` | `'di'` | Schlüssel im Framework-Kontext. |
| `createScope` | `root.createScope()` | Eigene Erstellung des Request-Scopes. |
| `setupScope` | keiner | Nach Erstellung, vor den nachfolgenden Handlern. |
| `disposeScope` | `scope.dispose()` | Eigene Freigabe. |
| `autoDispose` | `true` | `false` oder ein Prädikat mit Ergebnis `false` überträgt die Verantwortung an die Anwendung. |
| `onDisposeError` | `ctx.app.emit('error')` | Empfänger für Freigabefehler. |

## Streaming

Normale Koa-Stream-Bodies benötigen keinen Skip. Der Adapter wartet auf `finish` oder `close`.

Nutze `skipInferdiDispose(ctx)` nur, wenn die Anwendung den Scope absichtlich über die HTTP-Antwort hinaus benötigt, etwa für Hintergrundarbeit:

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

Ein Fehler in nachgelagerter Middleware gibt den Scope immer frei; bei erfolgreichen übersprungenen Anfragen übernimmt die Anwendung die Verantwortung.

Ein einziger Aufruf von `skipInferdiDispose(ctx)` gilt für alle InferDI-Middleware-Instanzen dieser Anfrage, auch mit unterschiedlichen State-Schlüsseln. Die Anwendung muss jeden behaltenen Scope freigeben.

