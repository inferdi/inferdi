# Adaptateur Fastify

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) est un plugin Fastify v5. En mode scoped, il expose la racine via `app.di`, crée un scope dans `onRequest`, le rend accessible par `request.di` et le libère dans `onResponse`.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { Container } from '@inferdi/inferdi'
import { inferdiFastify } from '@inferdi/fastify'
```

## Scope de requête

Expose tes types concrets de conteneur par augmentation de module :

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

`app.register` de Fastify n’infère pas assez profondément les génériques du plugin pour les hooks en ligne. Annote leurs paramètres lorsque tu as besoin des types concrets de scope.

## Options

| Option | Valeur par défaut | Description |
|---|---|---|
| `container` | obligatoire | Conteneur racine exposé via `app.di`. |
| `scopePerRequest` | `true` | Avec `false`, expose uniquement la racine. |
| `createScope` | `root.createScope()` | Création personnalisée du scope de requête. Peut être asynchrone. |
| `setupScope` | aucune | Après la création et avant l’exposition ; peut être asynchrone. |
| `disposeScope` | `scope.dispose()` | Libération personnalisée. Synchrone ou asynchrone. |
| `autoDispose` | `true` | `false`, ou un prédicat renvoyant `false`, transfère la responsabilité à l’application. |
| `disposeRootOnClose` | `false` | Libère la racine lors de `fastify.close()`. |
| `onDisposeError` | `request.log.error` | Destinataire des erreurs de libération. |

## Mode racine seule

Utilise ce mode lorsque les gestionnaires n’ont besoin que de singletons :

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

Ce mode n’installe ni décoration de requête ni hooks de cycle de vie des requêtes.

## Notes sur le cycle de vie

- `request.di` n’est exposé qu’après la réussite du setup.
- Un échec du setup libère le scope partiellement construit et ne propage que l’erreur d’origine.
- Les hooks de libération voient `request.di` pendant leur exécution.
- Une requête échouée ignore `skipInferdiDispose` ; sa libération reste soumise à `autoDispose`.
- Après exposition du scope, un abandon du client déclenche la libération dans `onRequestAbort`.
- Les erreurs de libération de la racine remontent via `fastify.close()` uniquement si `disposeRootOnClose` est activé.

Avec `autoDispose: false` ou un prédicat renvoyant `false`, `request.di` reste disponible après la réponse ou l’abandon afin que l’application libère elle-même le scope conservé.

