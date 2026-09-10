# Adaptateur Hono

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) est un middleware Hono v4. Il crée un scope par invocation, l’expose dans les variables de contexte Hono et le libère une fois le traitement de la route terminé.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { Container } from '@inferdi/inferdi'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
```

## Scope de requête

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

`c.get('di')` est équivalent à `c.var.di`.

## Clé personnalisée

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

L’adaptateur n’augmente pas globalement `ContextVariableMap` de Hono : l’absence du middleware reste donc visible pour TypeScript.

## Options

| Option | Valeur par défaut | Description |
|---|---|---|
| `container` | obligatoire | Conteneur racine, jamais libéré par ce middleware. |
| `key` | `'di'` | Clé dans le contexte du framework. |
| `createScope` | `root.createScope()` | Création personnalisée du scope de requête. |
| `setupScope` | aucune | Après la création, avant les gestionnaires suivants. |
| `disposeScope` | `scope.dispose()` | Libération personnalisée. |
| `autoDispose` | `true` | `false`, ou un prédicat renvoyant `false`, transfère la responsabilité à l’application. |
| `onDisposeError` | `console.error` | Destinataire des erreurs de libération. |

## Streaming

Les utilitaires de streaming Hono peuvent renvoyer une `Response` avant la fin du callback de flux. Appelle `skipInferdiDispose(c)` et libère le scope dans le cycle de vie du flux.

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

`skipInferdiDispose` ne supprime la libération que pour une réponse réussie. Les chemins d’erreur libèrent toujours le scope.

