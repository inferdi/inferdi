# Dépendances asynchrones

`registerAsyncFactory` déclare une relation asynchrone explicite. Le graphe conserve le type final du service, attend les dépendances asynchrones déclarées et propage cet état aux classes qui en dépendent.

## Choisir le modèle de promesse

InferDI propose deux contrats, car une promesse peut être le service lui-même ou représenter seulement son initialisation.

| API | Valeur du graphe | Injection | Résolution |
|---|---|---|---|
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | le même objet promesse | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` dans `AsyncSpec` | la `Database` initialisée | `getAsync()` |

Utilise `registerAsyncFactory` si les services suivants ont besoin de la valeur initialisée. Garde une promesse comme valeur de `registerFactory` seulement si elle appartient elle-même au graphe synchrone.

Cette distinction détermine aussi les compagnons différés : `registerFactory(..., lazyKey)` avec une valeur promesse produit `Lazy<Promise<T>>`, tandis que `registerAsyncFactory(..., lazyKey)` produit `AsyncLazy<T>`.

## Enregistrer des fabriques asynchrones

Ce graphe initialise une base de données pour la racine et une session par scope authentifié. Une classe devient asynchrone dès qu’une de ses dépendances déclarées l’est.

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard belongs to the async graph
scope.get('dashboard')
```

Le compilateur refuse aussi `root.getAsync('dashboard')`, car l’entrée `auth` manque à la racine. Voir [Entrées de scope](./scope-inputs) pour construire les profils.

## Résoudre et propager

`getAsync()` accepte les clés synchrones et asynchrones prêtes et renvoie une promesse. Une erreur synchrone de recherche, de cycle, de durée de vie ou liée à un conteneur libéré devient un rejet.

InferDI démarre les dépendances dans l’ordre du tuple. Il attend les entrées déclarées asynchrones, puis appelle la fabrique avec les valeurs positionnelles. Des dépendances asynchrones indépendantes peuvent s’initialiser en même temps.

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

Le callback reçoit des valeurs plutôt qu’un conteneur. Les relations asynchrones restent ainsi visibles pour TypeScript et pour la vérification préalable à l’exécution.

Si `deps` n’est pas vide, annote chaque paramètre du callback ou passe une fonction dont la signature existe déjà. Le tuple vérifie les types et leur ordre ; il ne fournit pas d’inférence contextuelle des paramètres.

## Ordonnancement et cache

| Durée de vie | Initialisation | Responsable |
|---|---|---|
| `singleton` | une promesse native dans le conteneur propriétaire | conteneur propriétaire |
| `scoped` | une promesse native par scope de résolution | scope de résolution |
| `transient` | une nouvelle initialisation par appel | appelant |

Les appelants concurrents partagent l’initialisation singleton ou scoped. Une promesse rejetée reste dans le cache comme état d’échec ; InferDI ne réessaie pas. Ouvre un nouveau scope ou reconstruis la racine si le cycle de vie de l’application prévoit une nouvelle tentative.

`has()` vérifie l’enregistrement sans démarrer l’initialisation. Il ne prouve pas qu’une clé est synchrone et ne fournit pas les entrées de scope manquantes.

## Compagnons AsyncLazy

Passe `lazyKey` en cinquième argument pour différer une cible asynchrone déclarative :

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

La création de l’enveloppe reste synchrone. Une classe qui injecte `AsyncLazy<T>` n’hérite donc pas de l’état asynchrone par cette dépendance. Une classe devenue asynchrone et dotée de son propre `lazyKey` produit `AsyncLazy<Class>`. Si une clé de dépendance peut choisir un enregistrement synchrone ou asynchrone, le compagnon est `Lazy<Class> | AsyncLazy<Class>`.

L’enveloppe conserve le conteneur de résolution. Les cibles scoped restent isolées par ce scope capturé. Les cibles transient redémarrent à chaque appel et restent sous la responsabilité de l’appelant.

## Libération et échecs

Les enregistrements singleton et scoped gardent leur promesse dans le cache après sa résolution. Libère leur conteneur de façon asynchrone pour qu’InferDI puisse attendre l’initialisation et examiner la ressource obtenue.

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

`await using`, `dispose()` et `Symbol.asyncDispose` prennent en charge les ressources asynchrones possédées. Un `using` synchrone ne peut pas déballer une promesse en cache et signale cet usage incorrect.

Avant de lever cette erreur, la libération synchrone attache un observateur de rejet à une promesse native en cache. Un rejet ultérieur ne déclenche donc pas `unhandledRejection`. Cela n’attend pas la promesse et n’assimile pas un thenable personnalisé.

Une initialisation singleton ou scoped rejetée reste en cache sans nouvelle tentative automatique. L’application doit reconstruire la racine ou ouvrir un autre scope pour réessayer. Si une dépendance ultérieure échoue pendant la vérification préalable, les initialisations déjà démarrées conservent leur cache et leur responsabilité.

L’échec d’une dépendance peut se propager à plusieurs promesses d’initialisation en cache. La libération asynchrone ne signale qu’une fois un même objet `Error`. Des objets distincts restent des causes distinctes dans `AggregateError`, même s’ils ont le même message.

## Valeurs promesses historiques

Une promesse renvoyée par `registerFactory` reste une valeur de service synchrone. Les fabriques asynchrones déclaratives reçoivent exactement ce même objet promesse, puisqu’il n’a pas de marqueur `AsyncSpec`.

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

Au premier niveau, `getAsync('dbPromise')` suit la sémantique JavaScript de `await` et fournit une `Database`.

## Limites dynamiques

- Passe des tuples de dépendances readonly à `registerAsyncFactory` et à `registerClass` si le tuple peut sélectionner une clé asynchrone. InferDI classe les positions asynchrones une fois et conserve la référence du tuple. Les littéraux en ligne sont inférés comme tuples readonly.
- Les cycles déclaratifs et violations de durée de vie à froid échouent pendant la vérification synchrone préalable. Les appels via un conteneur capturé après une frontière de promesse créent des relations dynamiques hors de cette analyse.
- `AsyncLazy<T>` diffère la résolution sans ajouter de nouvelle tentative, d’annulation ni de rollback.
- Une initialisation transient asynchrone déjà lancée peut continuer sans moyen de libération si une dépendance ultérieure échoue pendant la vérification préalable.
- Un cycle dynamique via `AsyncLazy.get()` après une frontière de promesse peut attendre sa propre promesse en cache. Le détecteur synchrone ne peut pas signaler ce blocage.

Voir [Fabriques](./factories) pour la construction synchrone et [Scopes et libération](./scopes) pour la responsabilité des ressources.

## Vérification par le compilateur

Un enregistrement asynchrone déclaratif est exclu de `.get()` mais reste accessible avec `.getAsync()` :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Database {
  query() {}
}

const container = new Container()
  .registerAsyncFactory('database', async () => new Database(), [])

container.get('database') // [!code error]

const database = await container.getAsync('database')
//    ^?
```

