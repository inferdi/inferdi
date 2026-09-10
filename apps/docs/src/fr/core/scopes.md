# Scopes et libération

Un scope limite la durée de vie des services locaux à une requête ou à une autre unité de travail. Un scope enfant hérite des enregistrements de ses parents, mais conserve ses propres instances scoped et gère leur libération. L’état reste ainsi isolé si l’application respecte ces limites de cycle de vie.

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` est un singleton de la racine. La requête est une entrée de scope appartenant à l’application ; `handler` est créé par le scope de requête et lui appartient.

Les enregistrements `scoped` sont destinés aux scopes enfants. Avec `fast: false` (par défaut), une résolution depuis la racine lève `Scoped "key" cannot be resolved from the root container. Use createScope().` Appelle `createScope()`, puis résous la clé depuis le conteneur obtenu. `fast: true` ignore cette vérification à l’exécution.

## Entrées de scope

Les entrées de scope sont des valeurs externes disponibles seulement à son ouverture : requête, contexte d’authentification, locataire ou données de job. Déclare-les une fois, puis fournis le sous-ensemble nécessaire via `createScope(inputs)` :

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

Le type du conteneur suit les entrées fournies et n’autorise la résolution des services dépendants que lorsqu’ils sont prêts. Voir [Entrées de scope](./scope-inputs) pour les profils nommés, l’affinement imbriqué, les fabriques avec `deps`, les types réutilisables et les règles de validation.

## Responsabilité des ressources

La responsabilité dépend du type d’enregistrement, pas seulement du code qui appelle le constructeur.

| Valeur | Responsable de la libération |
|---|---|
| Résultat singleton d’une fabrique ou classe | Conteneur propriétaire de l’enregistrement |
| Résultat scoped d’une fabrique ou classe | Scope qui le résout et le met en cache |
| Résultat transient d’une fabrique ou classe | Appelant ; InferDI ne le conserve pas pour le libérer |
| Valeur `registerValue` | Application |
| Valeur `.override()` | Application ou fixture de test |
| Entrée de scope | Code qui ouvre le scope |

`root.dispose()` ne libère pas les scopes enfants déjà créés. Ferme chaque scope à sa propre limite de cycle de vie.

## Gestion native des ressources

Le conteneur implémente les deux symboles de libération :

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Utilise `await using` ou `await container.dispose()` dès qu’une ressource possédée peut être asynchrone.

## Protocole de libération

Les instances possédées sont libérées dans l’ordre inverse de leur création. Le conteneur recherche successivement :

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

Si plusieurs libérations échouent, InferDI rassemble les erreurs dans un `AggregateError`. Un échec n’empêche donc pas la fermeture des ressources suivantes.

