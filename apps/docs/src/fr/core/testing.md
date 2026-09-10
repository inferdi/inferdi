# Tests et substitutions

## Tester directement le service

Les services métier reçoivent des valeurs ordinaires : leurs tests unitaires n’ont donc pas besoin de conteneur.

```ts
type Logger = { info(message: string): void }
type Database = { findUser(id: string): { id: string } | undefined }

class UserRepo {
  constructor(readonly logger: Logger, readonly db: Database) {}

  find(id: string) {
    this.logger.info(`find ${id}`)
    return this.db.findUser(id)
  }
}

const messages: string[] = []
const repo = new UserRepo(
  { info: (message) => messages.push(message) },
  { findUser: (id) => ({ id }) }
)

expect(repo.find('42')).toEqual({ id: '42' })
expect(messages).toEqual(['find 42'])
```

Utilise un conteneur dans un test d’intégration lorsque le sujet du test est le graphe de l’application lui-même.

## Tester le graphe assemblé

Utilise `.override()` lorsqu’un test doit remplacer un enregistrement existant par un mock.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

La valeur de remplacement doit être assignable au type d’origine. Les clés absentes et les mocks incompatibles produisent des erreurs TypeScript.

## Fournisseurs typés

`Container.Providers<C>` transforme le type d’un conteneur construit en fonctions de fourniture sans argument. Ce type aide les utilitaires de test à créer des mocks sans résoudre le graphe de production.

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

Ce type conserve tous les types de services enregistrés, y compris les compagnons différés gérés. Les clés uniquement déclarées via `declareScopeInputs()` sont exclues, car elles sont fournies par `createScope(inputs)`. Il n’enregistre aucun fournisseur et ne transfère aucune responsabilité : le test décide comment les appliquer et les libérer.

## Quand appliquer les substitutions

Applique les substitutions avant de résoudre le graphe :

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

La deuxième ligne lève une erreur, car le singleton est déjà dans le cache local. Ce contrôle repose volontairement sur le cache : il détecte aussi les valeurs scoped mises en cache localement, `registerValue` et les substitutions répétées. Avec `fast: false`, les résolutions transient et les valeurs appartenant à un ancêtre résolues depuis un enfant ne sont pas conservées localement, donc ne sont pas suivies. Les scopes fast peuvent recopier les singletons délégués dans leur cache et interdisent les mutations après activation. Une instance transient déjà renvoyée reste chez son appelant, tandis que les résolutions suivantes renvoient le mock. Cette limite n’autorise pas les substitutions tardives : applique-les toutes avant la résolution pour éviter un graphe partiellement remplacé.

## Responsabilité des ressources

Les valeurs de substitution restent externes au conteneur. Comme avec `registerValue`, elles ne rejoignent pas sa file de libération. La fixture de test gère leur nettoyage.

## Portée locale au scope

Une substitution ne modifie que le conteneur sur lequel elle est appelée :

```ts
const scope = root.createScope().override('db', mockDb)
```

La racine et les scopes frères restent inchangés. Les substitutions d’un parent sont visibles par la recherche habituelle dans les parents.

