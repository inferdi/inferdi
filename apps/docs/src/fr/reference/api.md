# Résumé de l’API

Cette page résume l’API publique du cœur. Les définitions génériques exactes figurent dans le README du paquet et les déclarations TypeScript.

## Conteneur

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Options du conteneur {#container-options}

Le constructeur accepte une option facultative :

| Option | Type | Par défaut | Rôle |
|---|---|---|---|
| `fast` | `boolean` | `false` | Choisit le contrat mutable vérifié ou le contrat de graphe fixe non vérifié |

```ts
const checked = new Container()
const explicitChecked = new Container({ fast: false })
const fast = new Container({ fast: true })
```

Le mode par défaut et `false` explicite conservent les contrôles de cycles et de durées de vie, refusent les résolutions scoped depuis la racine et préservent la chaîne exacte et mutable des parents. Utilise ce contrat pour le développement, les tests, le hot reload et les graphes modifiés après le démarrage.

Le littéral `{fast: true}` conserve tous les contrôles de compilation mais désactive le suivi des cycles et des durées de vie à l’exécution, y compris le contrôle scoped à la racine. Il suppose un arbre fixe, recherche directement le propriétaire du registre et recopie les singletons délégués dans les caches locaux. Les enfants héritent de la configuration racine.

Dans un arbre fast, termine tous les appels `register*`, `.use()` et `.override()` avant la première résolution ou `createScope()`. Garde ensuite l’arbre immuable et libère les enfants avant leurs ancêtres. Seule la valeur littérale `true` active ce contrat ; toute autre valeur retombe sur le contrat vérifié. Voir [Performances](../guide/performance#fast-true) pour comprendre les coûts concernés.

## Méthodes d’enregistrement

| Méthode | Entrée du callback | Type du graphe | Résolution |
|---|---|---|---|
| `registerClass` | arguments du constructeur issus de `deps` | `Spec` ou `AsyncSpec` propagé | `get` ou `getAsync` |
| `registerFactory(key, factory, ...)` | conteneur filtré par durée de vie | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | résolveur limité à `deps` | `Spec` avec exigences | `get` |
| `registerAsyncFactory` | valeurs positionnelles ; attente des dépendances asynchrones déclaratives | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | aucune | `Spec` singleton appartenant à l’appelant | `get` |

`registerClass`, `registerFactory` et `registerAsyncFactory` acceptent `singleton`, `scoped` et `transient`. Un compagnon de `registerFactory` exige une durée de vie explicite, y compris `'singleton'`. `registerValue` est toujours singleton et reste externe au conteneur.

Un `lazyKey` sur `registerClass` ou `registerFactory` ajoute un `LazySpec` géré. Une classe devenue asynchrone ajoute plutôt un `AsyncLazySpec`. Un `registerFactory` de valeur promesse reste un `Spec<Promise<T>>` synchrone et son compagnon reste `Lazy<Promise<T>>`. Utilise `registerAsyncFactory` pour stocker le type final du service dans le graphe.

`registerAsyncFactory` accepte les mêmes durées de vie et un cinquième argument `lazyKey` facultatif. Il enregistre le type final comme `AsyncSpec` ; son compagnon est `AsyncLazySpec<Awaited<ReturnType>, L>`. Les classes dépendant de la cible héritent de son état asynchrone, mais les consommateurs de l’enveloppe restent synchrones. Utilise `getAsync()` pour la cible et `get()` pour l’enveloppe.

`registerAsyncFactory` et les appels `registerClass` dont le tuple peut choisir une clé asynchrone exigent des dépendances readonly. InferDI classe les positions asynchrones une fois et conserve la référence du tuple. Les littéraux en ligne sont inférés readonly ; les appels `registerClass` purement synchrones restent compatibles avec les tuples mutables.

`registerFactory` avec `deps` et `registerAsyncFactory` utilisent le même ordre d’arguments mais des contrats de callback différents : le premier reçoit un résolveur limité à `deps`, le second les valeurs selon leur position.

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` remplace un enregistrement existant qui n’est pas une entrée de scope ; `use` applique un constructeur de module. Le contrôle temporel d’`override` ne consulte que le cache local : singletons et valeurs scoped locaux, `registerValue` et substitutions répétées. Il ne suit jamais les résolutions transient. En mode vérifié, il ne suit pas non plus les singletons d’ancêtres résolus depuis un enfant. Un enfant fast les recopie localement, ce qui permet de les détecter. Applique les substitutions avant la résolution du graphe.

## Entrées de scope et résolution

`declareScopeInputs<Inputs>()` ajoute des entrées scoped uniquement dans les types. `createScope(inputs)` fournit un sous-ensemble des valeurs manquantes et renvoie un conteneur dont les clés prêtes reflètent les propriétés obligatoires fournies. Les valeurs restent sous la responsabilité de l’application.

| API | Clés acceptées |
|---|---|
| `get()` | clés prêtes sans `AsyncSpec` |
| `getAsync()` | toutes les clés prêtes synchrones et asynchrones déclaratives |
| `has()` | toute chaîne ou symbole ; prouve seulement l’enregistrement |

`has()` ne prouve ni la disponibilité ni le mode synchrone. Les entrées de scope déclarées ne sont pas des enregistrements : `has()` renvoie `false` pour elles même après fourniture via `createScope(inputs)`. Voir [Entrées de scope](../core/scope-inputs) et [Dépendances asynchrones](../core/async-dependencies).

## Types de l’espace de noms

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Type | Utilisation |
|---|---|
| `Container.ReadyKeys<C>` | Extrait les clés dont les exigences d’entrées sont satisfaites, pour les appels génériques à `getAsync`. |
| `Container.SyncReadyKeys<C>` | Extrait les clés prêtes non asynchrones pour les appels génériques à `get`. |
| `Container.Resolve<C>` | Extrait une table plate `{ key: Value }` du conteneur construit. |
| `Container.ResolveUnwrapped<C>` | Comme `Resolve`, mais déballe distributivement les `LazySpec` et `AsyncLazySpec` gérés vers `T` ; les enveloppes non gérées restent intactes. |
| `Container.UnwrappedValue<C, K>` | Extrait un seul type de service déballé. |
| `Container.Providers<C>` | Produit une table de fonctions de fourniture pour les tests ; exclut les entrées de scope déclarées. |

Les résolveurs génériques v6 doivent préserver les clés acceptées. Utilise `Container.SyncReadyKeys<C>` avec `get()` et `Container.ReadyKeys<C>` avec `getAsync()` au lieu d’un `keyof T` sans contrainte.

## Types publics

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` et `AsyncLazySpec` portent un discriminant de mode privé uniquement dans les types publiés. Utilise ces interfaces nommées pour les compagnons gérés dans les formes explicites de `Container` et `Module`. Ce discriminant n’a pas de champ à l’exécution et n’est pas exporté.

`Spec`, `AsyncSpec`, `LazySpec` et `AsyncLazySpec` décrivent les entrées du graphe de types. Leurs champs ne sont pas ajoutés aux valeurs de services résolues.

`ScopeInputMap<M>` transforme les propriétés obligatoires finies, chaînes et symboles, en entrées scoped. Il refuse les clés facultatives ou numériques, `__proto__`, les signatures d’index larges et les unions d’ensembles de clés différents. `WithRequirements<S, K>` attache les clés d’entrée requises à une entrée du graphe, notamment aux sorties de modules nommés. Les définitions conditionnelles exactes restent dans les déclarations publiées.

## Formes des API d’adaptateurs

### Adaptateurs HTTP

Fastify, Hono, Koa, Express et Elysia exportent :

- la fonction d’intégration, comme `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- les utilitaires structurels `InferdiScope`, `InferdiRoot` et `InferdiScopeOf`
- les types d’options et de contexte propres au framework

### Adaptateur React

React exporte `inferdiReact` et les types de liaison, `Provider` externe, `ScopeProvider` géré, hooks de services, extraction du graphe, clés synchrones et asynchrones stables et options du cycle de vie. Il n’exporte pas `skipInferdiDispose`, car les scopes de composants suivent les commits et nettoyages d’Effects React plutôt qu’une requête HTTP.

Consulte les pages des adaptateurs pour les noms exacts et les détails de cycle de vie.

