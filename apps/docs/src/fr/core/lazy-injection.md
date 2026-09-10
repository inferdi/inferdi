# Injection différée

`Lazy<T>` et `AsyncLazy<T>` reportent la résolution jusqu’à l’appel de `.get()`. Le mode d’enregistrement de la cible détermine le type de retour.

| Cible | Compagnon |
|---|---|
| Enregistrement synchrone | `Lazy<T>` avec `get(): T` |
| Enregistrement asynchrone déclaratif | `AsyncLazy<T>` avec `get(): Promise<T>` |
| Classe avec dépendance union synchrone/asynchrone | `Lazy<T> \| AsyncLazy<T>` |

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

Passer `lazyKey` à `registerClass` ou `registerFactory` crée un enregistrement compagnon donnant un accès différé de la forme `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` reçoit la clé du compagnon en cinquième argument :

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Résoudre ou injecter `dbLazy` n’appelle pas `connectDatabase`. Le premier `.get()` démarre la cible. Les cibles singleton et scoped renvoient leur promesse native en cache, y compris un rejet conservé. Une cible transient redémarre à chaque appel et reste sous la responsabilité de l’appelant.

Un `registerFactory` dont la valeur est une promesse reste dans le graphe synchrone et produit `Lazy<Promise<T>>`. Seules les cibles asynchrones déclaratives produisent `AsyncLazy<T>`.

## La durée de vie est conservée

Les compagnons différés conservent la durée de vie de leur cible. Un singleton ne peut injecter un `Lazy` ou un `AsyncLazy` que pour une cible singleton. TypeScript refuse aussi les unions pouvant contenir une durée de vie plus courte et les unions de compagnons gérés et non gérés.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Les consommateurs scoped et transient peuvent utiliser des compagnons de toute durée de vie, puisqu’ils ne sont pas mis en cache globalement.

## Scope capturé et libération

L’enveloppe conserve le conteneur qui l’a résolue. Une enveloppe obtenue depuis un scope enfant continue à l’utiliser même après la création d’un autre enfant. Après la libération du scope capturé, `AsyncLazy.get()` renvoie une promesse rejetée.

Le conteneur propriétaire libère les cibles singleton et scoped déjà résolues. Avant le premier `.get()`, aucune cible n’existe à libérer. La libération attend une initialisation singleton ou scoped déjà démarrée. Les résultats transient restent sous la responsabilité de l’appelant.

## Dépendances circulaires

InferDI détecte les cycles synchrones, y compris les dépendances asynchrones déclaratives lors de la vérification préalable. `Lazy<singleton>` peut différer une relation singleton synchrone. `AsyncLazy` peut la déplacer après une frontière de promesse, hors du suivi synchrone des cycles. Si une initialisation retrouve sa propre promesse en attente via `AsyncLazy.get()`, les deux côtés attendent indéfiniment. Isole l’initialisation partagée, remonte-la ou supprime le cycle. Voir [Dépendances asynchrones](./async-dependencies).

