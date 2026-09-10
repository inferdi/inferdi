# Fastify-Adapter

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) ist ein Plugin für Fastify v5. Im Scope-Modus stellt es den Root als `app.di` bereit, erstellt in `onRequest` einen Request-Scope, veröffentlicht ihn als `request.di` und gibt ihn in `onResponse` frei.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { Container } from '@inferdi/inferdi'
import { inferdiFastify } from '@inferdi/fastify'
```

## Request-Scope

Mache deine konkreten Containertypen per Modulerweiterung verfügbar:

```ts
type RequestContext = {
  requestId: string
  ip: string
}

class Users {
  constructor(readonly request: RequestContext) {}

  profile(id: string) {
    return { id, requestId: this.request.requestId }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('users', Users, ['request'], 'scoped')
const app = Fastify()

type RootContainer = typeof root
const openRequestScope = (request: FastifyRequest) => root.createScope({
  request: {
    requestId: request.id,
    ip: request.ip
  }
})
type RequestContainer = ReturnType<typeof openRequestScope>

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

await app.register(inferdiFastify, {
  container: root,
  createScope: (_root, request) => openRequestScope(request),
  disposeRootOnClose: true
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

Fastifys `app.register` kann die Plugin-Generics für Inline-Hooks nicht tief genug ableiten. Annotiere Hook-Parameter, wenn du konkrete Scope-Typen benötigst.

## Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `container` | erforderlich | Root-Container, verfügbar als `app.di`. |
| `scopePerRequest` | `true` | Mit `false` nur den Root bereitstellen. |
| `createScope` | `root.createScope()` | Eigene Erstellung des Request-Scopes. Darf asynchron sein. |
| `setupScope` | keiner | Nach Erstellung und vor Veröffentlichung; darf asynchron sein. |
| `disposeScope` | `scope.dispose()` | Eigene Freigabe. Synchron oder asynchron. |
| `autoDispose` | `true` | `false` oder ein Prädikat mit Ergebnis `false` überträgt die Verantwortung an die Anwendung. |
| `disposeRootOnClose` | `false` | Root bei `fastify.close()` freigeben. |
| `onDisposeError` | `request.log.error` | Empfänger für Freigabefehler. |

## Nur den Root verwenden

Wenn Handler nur Singletons benötigen, nutze den Root-Modus:

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

Dieser Modus installiert weder Request-Dekorationen noch Request-Lebenszyklushooks.

## Hinweise zum Lebenszyklus

- `request.di` wird erst nach erfolgreichem Setup bereitgestellt.
- Bei Setup-Fehlern wird der teilweise aufgebaute Scope freigegeben und nur der ursprüngliche Setup-Fehler weitergereicht.
- Freigabehooks können während ihrer Ausführung auf `request.di` zugreifen.
- Fehlgeschlagene Requests ignorieren `skipInferdiDispose`; die Freigabe erfolgt weiterhin gemäß `autoDispose`.
- Bei Client-Abbruch erfolgt die Freigabe eines bereits veröffentlichten Scopes in `onRequestAbort`.
- Root-Freigabefehler werden nur bei aktiviertem `disposeRootOnClose` durch `fastify.close()` weitergegeben.

Mit `autoDispose: false` oder einem Prädikat, das `false` liefert, bleibt `request.di` nach Antwort oder Abbruch verfügbar. Die Anwendung kann den behaltenen Scope später selbst freigeben.

