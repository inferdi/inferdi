# Pratiques à éviter

Utilise toujours la référence renvoyée par le dernier appel `register*`. Une ancienne référence conserve un ancien type de graphe, même si elle pointe vers le même conteneur à l’exécution.

## Réutiliser une ancienne référence du builder {#stale-builder-references}

Chaque méthode `register*` modifie le conteneur et renvoie ce même objet avec un type générique enrichi. TypeScript enrichit le type de retour, pas celui des références créées avant l’appel.

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// Compiles because base still has the type Container<{}>.
base.registerAsyncFactory('dependency', async () => 2, [])

// Typed as number, but the new registration supplies Promise<number>.
syncGraph.get('consumer').dependency
```

`base` et `syncGraph` pointent vers le même objet. Le dernier enregistrement remplace `dependency` à l’exécution, alors que le type de `syncGraph` décrit toujours le graphe synchrone d’origine. Les classes déjà enregistrées conservent leur classification des dépendances.

## Pourquoi le compilateur l’autorise

La détection des clés en double utilise les clés du type de la référence appelante. `syncGraph` contient `dependency`, donc un nouvel enregistrement de cette clé via cette référence serait une erreur. `base` reste `Container<{}>`, où `keyof T` vaut `never`.

TypeScript ne met pas à jour les arguments génériques à travers les alias d’un objet mutable. Il ne possède pas non plus de types linéaires ou affines permettant de marquer `base` comme consommé après un enregistrement. InferDI n’ajoute pas une recherche dans le registre à chaque enregistrement pour repérer ces alias, car cela pénaliserait aussi les assemblages valides.

## Conserver la dernière référence renvoyée

Construis le graphe dans une seule chaîne et utilise son résultat :

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

N’ignore pas le retour de `register*` pour continuer ensuite avec une ancienne référence. Un module doit lui aussi renvoyer le conteneur produit par son dernier enregistrement. Voir [Modules](./modules).

## Ne pas utiliser `register*` pour remplacer un service

Choisis chaque enregistrement de production une seule fois lors de la construction du graphe. Utilise le contrôle de flux habituel ou `.use()` si la configuration sélectionne une implémentation.

Les tests peuvent utiliser `.override()` avant la résolution si le remplacement conserve la durée de vie, le mode différé et le mode asynchrone. `.override()` ne peut pas convertir un enregistrement synchrone en enregistrement asynchrone déclaratif. Voir [Tests et substitutions](./testing).

## Service Locator dans la logique métier

Passer un conteneur à un service métier masque ses véritables dépendances et déplace les erreurs de clés manquantes au point d’appel. Passe plutôt le service nécessaire :

```ts
class UserController {
  constructor(
    private readonly container: AppContainer // [!code --]
    private readonly users: UserRepo // [!code ++]
  ) {}

  show(id: string) {
    return this.container.get('users').find(id) // [!code --]
    return this.users.find(id) // [!code ++]
  }
}
```

Garde les fabriques qui utilisent un résolveur dans le point de composition lorsque l’assemblage en a réellement besoin.

## Scope de requête global

Un scope global mutable peut transmettre les valeurs d’une requête à une autre requête concurrente. Crée et ferme le scope à l’intérieur de la limite de requête :

```ts
let currentScope = root.createScope({ request }) // [!code warning]

async function handle(request: Request) {
  const scope = root.createScope({ request }) // [!code focus]
  try {
    return await scope.getAsync('handler')
  } finally {
    await scope.dispose()
  }
}
```

Les adaptateurs automatisent cette limite en conservant les mêmes règles de responsabilité.

## Effacer le type concret du conteneur

Une annotation comme `Container` efface l’état accumulé du graphe. Laisse inférer le retour du builder et dérive les alias à partir de celui-ci :

```ts
const buildContainer = (): Container => new Container() // [!code --]
const buildContainer = () => new Container() // [!code ++]
  .registerClass('users', UserRepo, [])

type AppContainer = ReturnType<typeof buildContainer>
```

Utilise `ReturnType` pour les alias de conteneurs et de scopes de l’application au lieu de reconstruire leurs arguments génériques.

## Perdre la responsabilité des ressources

Créer un scope sans chemin de libération correspondant laisse ses instances scoped allouées. Place la libération à la même limite de cycle de vie que la création :

```ts
const scope = root.createScope({ request }) // [!code warning]
return scope.get('handler').run()

await using ownedScope = root.createScope({ request }) // [!code focus]
return ownedScope.get('handler').run()
```

Si `await using` n’est pas disponible, utilise `try/finally` avec `await scope.dispose()`. Les valeurs, substitutions, entrées de scope et résultats transient restent sous la responsabilité de l’appelant et nécessitent leur propre politique de libération.

