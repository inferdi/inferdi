# Migration des versions

InferDI documente les changements incompatibles par version majeure. La référence reste [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md) ; cette page résume le parcours de mise à niveau actuel.

## Migration vers 6.0

Ce résumé part de la version stable `5.0.7`. Mets tous les paquets `@inferdi/*` installés à jour vers `6.0.0` ; les adaptateurs exigent `@inferdi/inferdi@^6.0.0`.

- Remplace `RegistrationKind` par `Lifetime` et `Spec.kind` par `Spec.lifetime`. Aucun alias obsolète n’est conservé.
- La v5 stable n’avait pas de surcharge `registerFactory` avec `deps`. La v6 ajoute `registerFactory(key, factory, deps, ...)`. Seuls les utilisateurs de la préversion v6 `registerFactory(key, deps, factory, ...)` doivent réordonner les arguments. Un compagnon de fabrique synchrone exige une durée de vie explicite, y compris `'singleton'`.
- Remplace `{strict: false}` de v5 par `{fast: true}`, et `{strict: true}` par le mode par défaut ou `{fast: false}`. La polarité du booléen est inversée. L’option de préversion `mode` a été supprimée.
- `Module<TRequirements, TProvides>` accepte et conserve les enregistrements supplémentaires, vérifie exactement les exigences et refuse les collisions de sorties. `new Container(parent)` n’est plus public ; utilise `createScope()`.
- L’enregistrement refuse tout type de clé pouvant recouper une clé principale ou différée existante. Affine les clés larges ou unions vers un membre nouveau ; utilise `.override()` pour un remplacement volontaire.
- La v6 ajoute les entrées de scope uniquement typées via `declareScopeInputs<Inputs>()` et `createScope(inputs)`. Les scopes sans argument conservent leur comportement v5.
- La v6 ajoute `registerAsyncFactory`, `AsyncSpec` et `getAsync()` pour les dépendances asynchrones déclaratives. Un `registerFactory` de valeur promesse reste synchrone dans le graphe et se résout avec `get()`.
- La libération asynchrone signale une seule fois un objet de rejet partagé entre plusieurs promesses en cache. La libération synchrone observe le rejet des promesses natives avant de signaler l’usage incorrect d’une ressource asynchrone.

### Les résolveurs génériques utilisent les clés prêtes

`.get()` accepte désormais les clés synchrones prêtes dont les entrées de scope ont été fournies. Les conteneurs concrets sans entrées de scope gardent les mêmes clés synchrones. Les utilitaires génériques avec `K extends keyof T` doivent préserver la disponibilité et l’état asynchrone.

```ts
// Before
function resolve<T extends DependenciesMap, K extends keyof T>(
  container: Container<T>,
  key: K
) {
  return container.get(key)
}

// After
function resolve<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}
```

Utilise `Container.ReadyKeys<Container<T>>` dans les utilitaires qui appellent `getAsync()`. Un `T extends DependenciesMap` générique peut contenir des entrées asynchrones ou des services bloqués par des entrées manquantes.

### Specs nommés pour les compagnons différés

`LazySpec` porte désormais une marque de mode privée uniquement typée ; la v6 ajoute `AsyncLazySpec`. Les formes explicites de `Container` et `Module` doivent utiliser ces exports nommés au lieu de reproduire `{type, lifetime, lazyOf}`. La marque n’a pas de champ à l’exécution.

`registerAsyncFactory` accepte un cinquième `lazyKey` et produit `AsyncLazy<T>`. Les classes devenues asynchrones utilisent la même enveloppe ; les classes mixtes exposent `Lazy<T> | AsyncLazy<T>`. Les compagnons de `registerFactory` de valeur promesse restent `Lazy<Promise<T>>`. `Container.ResolveUnwrapped` déballe distributivement les compagnons gérés synchrones, asynchrones et mixtes.

Le [Résumé de l’API](./api), les [Entrées de scope](../core/scope-inputs) et les [Dépendances asynchrones](../core/async-dependencies) décrivent les nouveaux ensembles de clés.

## Migration vers 5.0

La première version v5 ne concernait que les adaptateurs. Le changement de version synchronise les paquets et unifie leur contrat de libération. Les versions v5 suivantes ont aussi renforcé la responsabilité des scopes enfants et le contrat `{fast: true}` décrit ci-dessous.

Les adaptateurs partagent désormais ces règles :

- Vocabulaire commun : `createScope`, `setupScope`, `disposeScope`, `autoDispose`, `onDisposeError`.
- Exports communs : `MaybePromise`, `InferdiScope`, `InferdiRoot`, `InferdiScopeOf`.
- Un échec de `setupScope` expose uniquement son erreur d’origine.
- Les erreurs de libération pendant l’échec du setup vont à `onDisposeError` ou au destinataire de l’adaptateur.
- Une requête échouée libère son scope même après `skipInferdiDispose`, sauf limite Express documentée.
- Les hooks de libération voient l’emplacement public du scope pendant leur exécution.

### Une résolution scoped exige un scope enfant

Avec `{fast: false}` par défaut, résoudre une clé scoped depuis la racine lève désormais `Scoped "key" cannot be resolved from the root container. Use createScope().` Crée un enfant avec `const scope = root.createScope()`, appelle `scope.get(scopedKey)` et libère-le à sa limite de cycle de vie. `{fast: true}` ignore ce contrôle à l’exécution. Le code doit néanmoins résoudre les clés scoped depuis des enfants.

### Contrat de graphe fixe avec `fast: true`

`new Container({fast: true})` lit directement le registre racine immuable depuis les scopes, évite les parcours de parents et recopie les singletons délégués dans le cache local. Les scopes par défaut parcourent leur chaîne exacte à chaque absence locale, sans conserver d’instantané de recherche. Les mutations restent visibles sans suivi d’invalidation ni métadonnées supplémentaires. Les deux modes dédupliquent les instances possédées lors de la libération. Enregistre chaque clé une fois dans une chaîne linéaire, termine avant la première résolution ou création de scope, garde l’arbre activé immuable et libère les enfants avant leurs ancêtres. Utilise `{fast: false}` pour le hot reload et les arbres modifiables.

### Notes sur les adaptateurs

| Paquet | Notes de migration |
|---|---|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Renommer `logDisposeError` en `onDisposeError` ; `InferdiScope.dispose()` peut renvoyer `void` ou `Promise<void>`. Ajouts : `disposeScope`, `autoDispose`, `skipInferdiDispose` et `InferdiScopeOf`. |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Les erreurs de libération après `next()` sont journalisées ou envoyées à `onDisposeError` et ne remplacent plus une réponse réussie. La libération du setup ne lève plus d’`AggregateError`. |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` reçoit chaque erreur de libération du setup et de fin de réponse. Express ne peut pas forcer la libération d’un scope ignoré après une erreur de route traitée. |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | La libération du setup expose seulement l’erreur du setup. Une erreur en aval libère le scope même après `skipInferdiDispose(ctx)`. |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | La libération du setup expose seulement son erreur. Les erreurs de libération vont à `onDisposeError` ou `console.error`. |

## Migration vers 4.0

La v4 précise les durées de vie de `Lazy<T>`. Un compagnon géré conserve désormais celle de sa cible ; un singleton ne peut injecter que `Lazy<singleton>`.

Principaux changements :

- `AllowedDeps<T, 'singleton'>` n’accepte plus n’importe quel `Lazy<V>`.
- `LazySpec<V, TargetKind>` devient public pour les formes explicites de conteneurs et modules.
- L’exception différée à l’exécution ne s’applique qu’à une cible `singleton`.
- Un singleton injectant `Lazy<scoped>` ou `Lazy<transient>` doit changer la durée de vie de la cible ou du consommateur.

Adaptations courantes :

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## Migration vers 3.0

La v3 place la sûreté des durées de vie dans les types. Le comportement à l’exécution reste compatible et les contrôles par défaut restent une défense supplémentaire.

Principaux changements :

- Les entrées de `DependenciesMap` deviennent `Spec<V, Kind>` plutôt que des types de services bruts.
- `RegistrationKind`, `Spec<V, K>` et `SpecMap<M, K>` sont exportés publiquement.
- `registerFactory` restreint `c` pour les fabriques singleton.
- `registerClass` filtre `deps` pour les singletons.
- `override(key, value)` conserve la durée de vie d’origine.
- `new Container({fast: true})` peut désactiver les contrôles de cycles et de durées de vie après audit du graphe.

Adaptations courantes :

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## Migration vers 2.0

La v2 comporte deux changements incompatibles mécaniques.

### Suppression de `container.cradle`

Utilise `.get(key)` :

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` devient `lazyKey`

Passe la clé du compagnon :

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

La v2 a aussi ajouté les clés chaînes ou symboles à chaque méthode d’enregistrement et amélioré les diagnostics d’ancêtres libérés.

## Versions synchronisées

Tous les paquets InferDI publiés partagent la même version :

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)
- [`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react)

Lors d’une mise à niveau, garde les adaptateurs et [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) sur la même version majeure.

## Liste de vérification de mise à niveau

1. Lis les notes de chaque version majeure traversée.
2. Mets à jour ensemble [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) et tous les adaptateurs installés.
3. Exécute les tests de types ou `tsc --noEmit` pour détecter les changements du graphe.
4. Exécute les tests à l’exécution avec le contrat vérifié par défaut.
5. Vérifie la responsabilité des scopes si tu utilises `skipInferdiDispose`, `autoDispose: false` ou un `disposeScope` personnalisé.

## Limites stables

Le cœur reste sans décorateurs et sans dépendances. Les cycles de vie des frameworks appartiennent aux adaptateurs, pas à [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).

