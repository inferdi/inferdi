# Express-Adapter

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) ist Middleware für Express 5. Sie erstellt einen Request-Scope, veröffentlicht ihn als `req.di` und gibt ihn frei, sobald die Node-Antwort beendet oder geschlossen wird.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { Container } from '@inferdi/inferdi'
import { inferdiExpress } from '@inferdi/express'
```

## Request-Scope

```ts
type RequestContext = {
  requestId: string
  userId?: string
  ip?: string
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

declare global {
  namespace Express {
    interface Request {
      di: RequestScope
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  createScope: (_root, req) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: req.get('x-user-id') || undefined,
    ip: req.ip
  })
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

Der Adapter erweitert `Express.Request` nicht global um `any`, `unknown` oder einen unpräzisen Basistyp des Containers. Die Anwendung definiert ihren konkreten Request-Typ selbst.

## Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `container` | erforderlich | Root-Container. Diese Middleware gibt ihn nie frei. |
| `createScope` | `root.createScope()` | Eigene Erstellung des Request-Scopes. |
| `setupScope` | keiner | Nach Erstellung, vor den nachfolgenden Handlern. |
| `disposeScope` | `scope.dispose()` | Eigene Freigabe. |
| `autoDispose` | `true` | `false` oder ein Prädikat mit Ergebnis `false` überträgt die Verantwortung an die Anwendung. |
| `onDisposeError` | `console.error` | Empfänger für Freigabefehler. |

## Streaming und Hintergrundarbeit

Normale Express-Streaming-Antworten benötigen keinen Skip, da der Adapter auf `finish` oder `close` wartet.

Nutze `skipInferdiDispose(req)`, wenn Arbeit absichtlich länger als die HTTP-Antwort läuft:

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

## Einschränkung bei fehlgeschlagenen Requests

Anders als die übrigen Adapter kann Express die Freigabe eines übersprungenen Scopes nach einem behandelten Routenfehler nicht zuverlässig erzwingen. Seine Middleware verwendet Callbacks: Nach der Rückkehr von `next()` kann der Adapter einen nachgelagerten, später behandelten Fehler nicht erkennen. Ruft eine Route `skipInferdiDispose(req)` auf und scheitert danach, bleibt der Scope anwendungseigen. Gib ihn im eigenen Fehlerpfad frei oder vermeide diese Kombination bei potenziell fehlschlagenden Routen.

Ein Aufruf von `skipInferdiDispose(req)` gilt für jede InferDI-Middleware-Instanz derselben Anfrage. Die Anwendung muss alle Scopes behalten und freigeben; `req.di` enthält nur den von der letzten Middleware zugewiesenen Scope.

