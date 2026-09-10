# Adaptateur Koa

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) est un middleware Koa v3. Il crée un scope de requête, l’expose via `ctx.state.di` et le libère lorsque la réponse Node se termine ou se ferme.

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

## Scope de requête

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

## Clé d’état personnalisée

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

| Option | Valeur par défaut | Description |
|---|---|---|
| `container` | obligatoire | Conteneur racine, jamais libéré par ce middleware. |
| `key` | `'di'` | Clé dans le contexte du framework. |
| `createScope` | `root.createScope()` | Création personnalisée du scope de requête. |
| `setupScope` | aucune | Après la création, avant les gestionnaires suivants. |
| `disposeScope` | `scope.dispose()` | Libération personnalisée. |
| `autoDispose` | `true` | `false`, ou un prédicat renvoyant `false`, transfère la responsabilité à l’application. |
| `onDisposeError` | `ctx.app.emit('error')` | Destinataire des erreurs de libération. |

## Streaming

Les corps de réponse Koa en streaming ordinaires n’ont pas besoin de désactiver la libération. L’adaptateur attend `finish` ou `close`.

Utilise `skipInferdiDispose(ctx)` seulement si le code conserve volontairement le scope au-delà de la réponse HTTP, par exemple pour une tâche en arrière-plan :

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

Une erreur en aval libère toujours le scope ; les requêtes réussies dont la libération est ignorée passent sous la responsabilité de l’application.

Un seul appel à `skipInferdiDispose(ctx)` s’applique à toutes les instances du middleware InferDI sur cette requête, même avec des clés d’état différentes. L’application doit libérer chaque scope conservé.

