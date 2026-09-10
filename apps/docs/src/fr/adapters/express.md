# Adaptateur Express

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) est un middleware Express 5. Il crée un scope de requête, l’expose via `req.di` et le libère lorsque la réponse Node se termine ou se ferme.

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

## Scope de requête

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

L’adaptateur n’augmente pas globalement `Express.Request` avec `any`, `unknown` ou un type de conteneur de base. L’application définit son propre type concret de requête.

## Options

| Option | Valeur par défaut | Description |
|---|---|---|
| `container` | obligatoire | Conteneur racine, jamais libéré par ce middleware. |
| `createScope` | `root.createScope()` | Création personnalisée du scope de requête. |
| `setupScope` | aucune | Après la création, avant les gestionnaires suivants. |
| `disposeScope` | `scope.dispose()` | Libération personnalisée. |
| `autoDispose` | `true` | `false`, ou un prédicat renvoyant `false`, transfère la responsabilité à l’application. |
| `onDisposeError` | `console.error` | Destinataire des erreurs de libération. |

## Streaming et travail en arrière-plan

Les réponses Express en streaming ordinaires n’ont pas besoin de désactiver la libération, car l’adaptateur attend `finish` ou `close`.

Utilise `skipInferdiDispose(req)` lorsque le travail doit volontairement survivre à la réponse HTTP :

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

## Limite en cas d’échec de requête

Contrairement aux autres adaptateurs, Express ne peut pas forcer de façon fiable la libération d’un scope ignoré après une erreur de route traitée. Son middleware fonctionne par callbacks : après le retour de `next()`, l’adaptateur ne peut pas observer une exception en aval qui est ensuite traitée par un gestionnaire d’erreurs. Si une route appelle `skipInferdiDispose(req)` puis échoue, le scope reste sous la responsabilité de l’application. Libère-le dans ton propre chemin d’erreur ou évite cette combinaison sur les routes susceptibles d’échouer.

Un appel à `skipInferdiDispose(req)` s’applique à toutes les instances du middleware InferDI sur cette requête. L’application doit conserver et libérer chaque scope ; `req.di` expose celui assigné par le dernier middleware.

