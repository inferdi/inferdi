# Entrées de scope

Les entrées de scope sont les valeurs fournies par le code qui ouvre un scope : requête HTTP, utilisateur authentifié, locataire, données de job ou contexte de trace. InferDI propage ces exigences dans le graphe et empêche de résoudre un service avant que ses entrées soient disponibles.

## Déclarer les entrées

`declareScopeInputs()` ajoute des clés au graphe de types. Il ne crée ni enregistrements ni valeurs à l’exécution.

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

Les entrées ont une durée de vie scoped. Un singleton ne peut pas en dépendre : pour les deux services ci-dessus, le compilateur refuse donc une durée de vie omise ou explicitement `'singleton'`.

## Ouvrir des profils typés

`createScope(inputs)` accepte n’importe quel sous-ensemble des entrées manquantes. Chaque type de conteneur renvoyé conserve les exigences désormais satisfaites.

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth has not been provided
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

Nomme les profils de ton application au moyen de fonctions. Leurs types de retour conservent l’ensemble exact des clés disponibles sans annotation manuelle du conteneur.

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

Ouvre le profil à la limite d’une requête, d’un message ou d’un job. Garde le graphe racine indépendant des objets du framework.

## Les exigences suivent le graphe

InferDI propage les exigences d’entrées à travers les classes, compagnons différés, fabriques synchrones avec `deps` et fabriques asynchrones déclaratives.

```ts
const app = root
  .registerFactory(
    'requestId',
    (c) => c.get('request').requestId,
    ['request'],
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

Le tuple de la surcharge `registerFactory` avec `deps` déclare des relations dans les types et limite le callback à un résolveur pour ces clés. Le callback reçoit toujours ce résolveur. `registerAsyncFactory` suit un autre contrat : il résout le tuple et transmet les valeurs au callback selon leur position.

L’ordre des arguments change aussi :

```ts
registerFactory(key, factory, deps, lifetime)
registerAsyncFactory(key, factory, deps, lifetime)
```

## Responsabilité des scopes imbriqués

Un enfant hérite des valeurs d’entrée et crée ses propres instances scoped. Les valeurs d’entrée restent sous la responsabilité de l’application et ne sont pas libérées par le conteneur.

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript libère ces déclarations dans l’ordre inverse : l’enfant affiné est fermé avant son parent. `root.dispose()` ne ferme aucun de ces scopes.

## Contrats de types réutilisables

`ScopeInputMap` décrit les entrées d’un `Module` nommé. `WithRequirements` attache des exigences d’entrées à une sortie de module.

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

Les utilitaires génériques doivent eux aussi préserver la disponibilité :

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## Contrat des entrées

- Les déclarations exigent un ensemble fini de clés obligatoires, chaînes ou symboles. Les clés facultatives ou numériques, `__proto__`, les signatures d’index larges et les unions d’ensembles de clés différents sont refusés.
- Une propriété obligatoire présente avec la valeur `undefined` est considérée comme fournie. InferDI vérifie sa présence, pas sa valeur de vérité.
- `createScope(inputs)` copie superficiellement les propriétés propres énumérables, chaînes et symboles. Les getters et pièges de proxy s’exécutent pendant cette copie : passe un simple objet de données.
- Le schéma des entrées n’existe que dans TypeScript. JavaScript, `any` ou une assertion peuvent ajouter des clés inconnues ou masquer un enregistrement dans le cache enfant.
- `{fast: true}` permet l’affinement des entrées mais conserve sa règle de graphe fixe : termine les enregistrements avant le premier `.get()` ou `.createScope()`.

Voir [Scopes et libération](./scopes) pour la responsabilité des ressources et [Dépendances asynchrones](./async-dependencies) pour les services asynchrones utilisant des entrées de scope.

## Vérification par le compilateur

Le même graphe rend de nouvelles clés disponibles une fois l’entrée fournie :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Handler {
  constructor(readonly request: RequestContext) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('handler', Handler, ['request'], 'scoped')

root.get('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
const handler = scope.get('handler')
//    ^?
```

