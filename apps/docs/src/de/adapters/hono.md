# Hono-Adapter

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) ist Middleware für Hono v4. Sie erstellt je Middleware-Aufruf einen Request-Scope, stellt ihn über Hono-Kontextvariablen bereit und gibt ihn nach Abschluss der begrenzten Routenpipeline frei.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { Container } from '@inferdi/inferdi'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
```

## Request-Scope

```ts
type RequestContext = {
  requestId: string
  userId?: string
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

`c.get('di')` entspricht `c.var.di`.

## Eigener Schlüssel

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

Der Adapter erweitert Honos `ContextVariableMap` nicht global. Fehlende Middleware bleibt dadurch für TypeScript erkennbar.

## Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `container` | erforderlich | Root-Container. Diese Middleware gibt ihn nie frei. |
| `key` | `'di'` | Schlüssel im Framework-Kontext. |
| `createScope` | `root.createScope()` | Eigene Erstellung des Request-Scopes. |
| `setupScope` | keiner | Nach Erstellung, vor den nachfolgenden Handlern. |
| `disposeScope` | `scope.dispose()` | Eigene Freigabe. |
| `autoDispose` | `true` | `false` oder ein Prädikat mit Ergebnis `false` überträgt die Verantwortung an die Anwendung. |
| `onDisposeError` | `console.error` | Empfänger für Freigabefehler. |

## Streaming

Honos Streaming-Helfer können eine `Response` zurückgeben, bevor der Stream-Callback fertig ist. Rufe `skipInferdiDispose(c)` auf und gib den Scope innerhalb des Stream-Lebenszyklus frei.

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

`skipInferdiDispose` unterdrückt die Freigabe nur bei erfolgreichen Antworten. Fehlerpfade geben weiterhin frei.

