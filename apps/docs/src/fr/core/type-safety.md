# Sûreté des types

InferDI représente le graphe de dépendances déclaré dans le type du conteneur. Chaque enregistrement ajoute une clé, un type de service, une durée de vie, un état synchrone ou asynchrone et d’éventuelles exigences d’entrées de scope. Les appels suivants sont vérifiés contre cet état accumulé.

## Signatures des constructeurs

`registerClass` vérifie les clés de dépendances contre les paramètres du constructeur, selon leur position et leur compatibilité structurelle.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

Les deux dépendances ont des structures publiques différentes. Les permuter produit donc bien l’erreur montrée ici :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript utilise un typage structurel. Deux classes vides, ou dotées des mêmes membres publics, sont assignables entre elles : le compilateur ne peut pas vérifier leur ordre sémantique. Donne aux contrats des structures distinctes. Si deux valeurs de même forme doivent rester différentes, marque leurs types comme expliqué dans [Clés symboles](./symbol-keys#same-value-shape).

## Unicité des clés

Chaque enregistrement renvoie un conteneur dont le type de graphe est enrichi. Réenregistrer une clé existante est une erreur :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

Utilise `.override()` lorsqu’un test remplace volontairement un service. Conserve le conteneur renvoyé après chaque enregistrement ; une ancienne référence ne connaît pas les ajouts suivants. La page [Pratiques à éviter](./bad-practices#stale-builder-references) montre ce qui peut se passer.

Le contrôle d’unicité examine toutes les valeurs possibles du type d’une clé. Après `'dsn'`, le type `'dsn' | 'replica'` est refusé, car il pourrait écraser `'dsn'` à l’exécution. Les clés larges `string` et `symbol` restent acceptées si elles ne peuvent pas recouper le graphe connu, mais rendent ce graphe moins précis.

## Clés dynamiques {#dynamic-keys}

`.get()` vérifie directement les clés littérales. Affine une clé obtenue à l’exécution avec `.has()` :

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` prouve l’existence d’un enregistrement. Il ne garantit ni la présence des entrées de scope manquantes ni la compatibilité d’une clé asynchrone avec `.get()`.

## Durée de vie dans les types

Chaque entrée conserve sa durée de vie. Un singleton ne peut pas capturer une dépendance scoped ou transient :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

Le contrat par défaut répète les contrôles de cycles et de durées de vie à l’exécution pour les assertions, clés dynamiques et conteneurs capturés que TypeScript ne peut pas analyser. `{ fast: true }` est un contrat distinct pour les graphes fixes, avec moins de contrôles à l’exécution.

## Disponibilité et état asynchrone

Les entrées de scope et les dépendances asynchrones déclaratives déterminent aussi les clés disponibles et leur résolution par `.get()` ou `.getAsync()` :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

Il manque `request` à la racine. Même lorsqu’il est prêt, `handler` reste asynchrone puisqu’il dépend de `database`. Voir [Entrées de scope](./scope-inputs) et [Dépendances asynchrones](./async-dependencies).

