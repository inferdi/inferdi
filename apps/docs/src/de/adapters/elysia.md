# Elysia-Adapter

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) ist ein Plugin für Elysia v1. Im Scope-Modus erstellt es einen Request-Scope, stellt ihn im Elysia-Kontext bereit, hält ihn für Fehlerhandler verfügbar und gibt ihn über `onAfterResponse` frei.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { Container } from '@inferdi/inferdi'
import { inferdiElysia } from '@inferdi/elysia'
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

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    createScope: (_root, { request }) => root.createScope({
      request: {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      }
    })
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

Für einen eigenen Kontextschlüssel:

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    key: 'container',
    createScope: (_root, { request }) => root.createScope({
      request: {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      }
    })
  }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

Registriere Routen in der typisierten Elysia-Kette nach `.use(inferdiElysia(...))`.

## Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `container` | erforderlich | Root-Container. |
| `key` | `'di'` | Schlüssel im Framework-Kontext. |
| `scopePerRequest` | `true` | Mit `false` nur den Root bereitstellen. |
| `createScope` | `root.createScope()` | Eigene Erstellung des Request-Scopes. |
| `setupScope` | keiner | Nach Erstellung und vor Validierung. |
| `setupValidatedScope` | keiner | Nach der Elysia-Validierung. |
| `disposeScope` | `scope.dispose()` | Eigene Freigabe. |
| `autoDispose` | `true` | `false` oder ein Prädikat mit Ergebnis `false` überträgt die Verantwortung an die Anwendung. |
| `onDisposeError` | `console.error` | Empfänger für Freigabefehler. |

## Nur den Root verwenden

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

Der Root-Modus stellt den Root-Container bereit und installiert keine Request-Scope-Lebenszyklushooks. Optionen, die ausschließlich zum Scope-Modus gehören, werden statisch abgelehnt.

## Hinweise zum Lebenszyklus

Die Freigabe ist an `onAfterResponse` gebunden. Erreicht Elysia diesen Hook nie, kann der Adapter die Ressourcen des Request-Scopes nicht freigeben. Die Verwaltungsdaten je Anfrage werden zwar nur schwach referenziert; die Ressourcenfreigabe benötigt aber die Ausführung des Hooks.

Nutze `setupScope` für Werte, die vor der Validierung benötigt werden. `setupValidatedScope` ist für Werte aus validiertem Body, Query, Params, Headers oder Cookies vorgesehen.

## Streaming

Elysia kann eine Streaming-`Response` erzeugen, bevor der Stream vollständig übertragen wurde. Werden scoped Services nach Rückkehr der Route weiterverwendet, rufe `skipInferdiDispose(context)` auf und gib den Scope selbst frei.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` unterdrückt nur die erfolgreiche Freigabe. Fehlerpfade geben weiterhin frei.

