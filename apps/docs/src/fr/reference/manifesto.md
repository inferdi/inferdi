# Manifeste architectural du cœur InferDI

Ce document fixe les règles de `@inferdi/inferdi` dans `packages/inferdi`. Lis-le avant toute revue de PR touchant l’API publique, les types, la résolution de `get()`, la structure des enregistrements, les scopes ou la libération.

## 1. Philosophie et engagements

### Mission

InferDI montre que l’injection de dépendances en TypeScript peut conserver sa souplesse à l’exécution sans abandonner les garanties statiques. Le graphe est un type TypeScript. Si le compilateur peut vérifier une règle, InferDI doit l’exprimer dans ses signatures publiques. Les vérifications à l’exécution couvrent les assertions `as`, conteneurs externes capturés, clés dynamiques et autres cas où TypeScript ne voit pas le graphe.

### Apport

Le graphe est le type. Une clé absente, une mauvaise position de constructeur, un enregistrement en double ou un état scoped capturé par un singleton doivent échouer avant l’exécution en production. Le contrat d’exécution reste compact : aucune dépendance, aucun décorateur, aucune réflexion sur les métadonnées, aucun piège de proxy ni mécanisme de framework dans le cœur.

Un accès réussi au cache reste un chemin rapide avec un seul `Map.get()`. Les classes à 0–7 dépendances utilisent des branches explicites `new Ctor(...)` ; au-delà, un chemin de repli mesuré prend le relais.

Une fonctionnalité qui affaiblit ces engagements doit être refusée ou placée hors du cœur.

## 2. Principes non négociables

### 2.1 Sûreté des types de bout en bout

Chaque signature publique doit rendre les états de graphe invalides impossibles à représenter lorsque TypeScript sait exprimer la règle.

- `register*` accepte `key: K & NoKeyOverlap<K, keyof T>`. `NoKeyOverlap` vérifie `[K & keyof T]` sans distribution. Les clés littérales, larges, symboles et unions restent acceptées ; tout recoupement refuse le candidat entier au lieu de retirer silencieusement un membre d’union.
- `DepsOf<AllowedDeps<T, L>, A>` compare `deps` aux paramètres du constructeur selon leur position et leur assignabilité structurelle.
- `AllowedDeps<T, L>` restreint le conteneur transmis aux fabriques. `c.get('scoped')` est une erreur de type dans une fabrique singleton.
- La forme par closure de `registerFactory` reçoit un conteneur filtré par durée de vie. Sa surcharge avec `deps` reçoit un résolveur limité aux clés synchrones déclarées ; `registerAsyncFactory` reçoit des valeurs positionnelles résolues. Ces contrats doivent rester distincts.
- `Lazy`, `AsyncLazy`, `Lifetime`, `Spec`, `AsyncSpec`, `LazySpec`, `AsyncLazySpec`, `ScopeInputMap`, `WithRequirements`, `DependenciesMap`, `SpecMap`, `ContainerOptions`, `Module`, ainsi que `Container.ReadyKeys`, `Container.SyncReadyKeys`, `Container.Resolve`, `Container.ResolveUnwrapped`, `Container.UnwrappedValue` et `Container.Providers` sont des contrats publics. Toute modification de leur assignabilité ou inférence est un changement d’API, même sans modification du runtime.
- Les résolveurs génériques utilisent `Container.SyncReadyKeys<C>` pour `get()` et `Container.ReadyKeys<C>` pour `getAsync()`. `.has()` prouve seulement l’enregistrement, ni le mode synchrone ni la présence d’entrées manquantes.
- Tout type public nouveau ou modifié exige des tests positifs et négatifs avec `// @ts-expect-error` dans `container.test-d.ts` ou la suite de types asynchrones déclaratifs. Les diagnostics publics de modules et d’entrées exigent leurs fixtures de compilation. Les déclarations émises doivent toujours passer `consumer-dts.ts` avec TypeScript 5.2.

Les limites de TypeScript doivent être documentées. Deux dépendances structurellement identiques restent interchangeables sans distinction nominale : clés `unique symbol` ou valeurs marquées selon le besoin. Une clé nominale seule ne distingue toutefois pas des valeurs d’arguments de constructeur de même structure.

### 2.2 Aucun décorateur ni métadonnée Reflect

InferDI est du TypeScript ordinaire ciblant ES2022. N’ajoute ni décorateurs, ni `reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata`, transformateurs TypeScript ou plugins de transpilation.

- Le type du constructeur définit les types des dépendances.
- Le tuple explicite `deps` définit l’ordre des arguments.
- Le runtime n’inspecte ni les noms de paramètres, ni les métadonnées émises, ni les champs de classes.

Les décorateurs et métadonnées feraient d’InferDI une autre bibliothèque. Ils ajoutent de l’état, des contraintes de compilation et des coûts de démarrage à froid que le cœur exclut.

### 2.3 La durée de vie est un type

Le cœur connaît `singleton`, `scoped` et `transient`. Chaque enregistrement conserve sa durée de vie via `Spec<V, L>` et sa propriété publique `lifetime`.

- Un singleton ne dépend pas directement d’un service scoped ou transient. `AllowedDeps<T, L>` le vérifie statiquement, et le contrat par défaut à l’exécution pour les assertions et enregistrements dynamiques. Toute union de durées de vie pouvant contenir `'singleton'` applique le filtre compatible singleton. Seule une union l’excluant peut accepter des dépendances plus courtes.
- `Lazy<V>` et `AsyncLazy<V>` conservent la durée de vie de leur cible. Un consommateur singleton ne peut injecter qu’un compagnon géré dont tout l’état de durée de vie cible est `'singleton'`. Les cibles scoped, transient, mixtes et unions gérées/non gérées restent interdites.
- `Registration.lazy` ne vaut `true` que pour les compagnons différés à cible singleton.
- `Registration.owned` ne vaut `true` que pour les résultats de classes ou fabriques appartenant au conteneur. Il vaut `false` pour `registerValue`, `.override()`, compagnons différés, entrées de scope et résultats transient.
- Les valeurs `registerValue`, `.override()` et entrées de scope restent externes. Les résultats transient appartiennent à l’appelant. Aucun n’entre dans la file de libération.
- `.override()` est une possibilité réservée aux tests. Il préserve `kind`, `lazy` et `async`, reste local et refuse les entrées déclarées, clés inconnues, conteneurs libérés et clés du cache local. Le contrôle détecte les résolutions singleton/scoped locales, `registerValue` et les remplacements répétés, mais pas les transient ni les valeurs d’ancêtres résolues via un enfant vérifié. Applique les substitutions avant la résolution, même si le contrôle ne peut pas prouver le bon moment.
- `dispose()` ne touche que les instances possédées par ce conteneur. Parents et enfants ne se libèrent pas mutuellement.

#### 2.3.1 Le mode asynchrone appartient à l’état des types

Les services asynchrones déclaratifs partagent graphe, registre, cache, recherche de scopes, responsabilité et libération avec les services synchrones.

- `registerAsyncFactory` conserve le type final dans `AsyncSpec<V, L>`, pas `Promise<V>`. Son tuple positionnel est vérifié comme celui d’un constructeur et reste readonly, car les positions classées sont conservées.
- Les enregistrements singleton et scoped asynchrones gardent une promesse native en cache. Les appels `getAsync()` concurrents partagent l’initialisation. Résoudre seulement une enveloppe `AsyncLazy` ne démarre pas sa cible.
- Une classe dépendant d’un service asynchrone déclaratif devient asynchrone transitivement. Sa cible utilise `getAsync()` et son compagnon devient `AsyncLazy`. Une union de clés synchrone/asynchrone reste prudemment mixte.
- `get()` refuse les clés asynchrones déclaratives dans les types. `getAsync()` accepte toutes les clés prêtes, renvoie une promesse et convertit les erreurs synchrones en rejets sans créer de second registre ni chemin de résolution.
- Un `registerFactory` de valeur promesse reste une entrée synchrone ordinaire. Ne requalifie pas silencieusement ce contrat historique en `AsyncSpec`.
- `Registration.async` est une métadonnée ajoutée à la fin, utilisée pour classer les dépendances à l’enregistrement. Le chemin fréquent de résolution ne doit jamais la lire.

#### 2.3.2 La disponibilité du scope appartient aux types

Les entrées de scope décrivent des valeurs de l’application disponibles seulement à l’ouverture des scopes enfants.

- `declareScopeInputs<Inputs>()` n’agit que sur les types et ne modifie pas le conteneur à l’exécution.
- Les déclarations acceptent des clés finies obligatoires, chaînes ou symboles. Elles refusent les nombres, `__proto__`, signatures d’index larges, propriétés facultatives, unions d’ensembles de clés différents et collisions.
- `createScope(inputs)` peut fournir tout sous-ensemble d’entrées manquantes. La disponibilité se propage aux enregistrements dépendants ; les scopes imbriqués héritent des entrées présentes. Seules les clés prêtes sont résolubles.
- Les valeurs sont copiées superficiellement dans le cache enfant, restent sous la responsabilité de l’application, ne peuvent être réenregistrées ou remplacées et sont exclues de `Container.Providers<C>`.

#### 2.3.3 Les modules sont des contrats d’exigences

`Module<TRequirements, TProvides>` décrit une transformation réutilisable du graphe, pas un alias exact du conteneur entier.

- Le graphe réel peut avoir des entrées supplémentaires. Chaque exigence doit néanmoins correspondre à l’assignabilité du service, la durée de vie exacte, l’état asynchrone, le mode différé géré, l’identité d’entrée de scope et la disponibilité.
- Le callback ne voit que les exigences déclarées. Le graphe renvoyé conserve toutes les entrées réelles et ajoute les sorties déclarées.
- Les clés de sortie ne peuvent pas entrer en collision avec le graphe réel. Les exigences d’entrée déjà satisfaites par l’appelant sont retirées de l’état des sorties.
- Les utilitaires génériques `<T>(c: Container<T>) => ...` ne peuvent pas prouver la nouveauté de clés arbitraires face à la borne `DependenciesMap`. Utilise des lambdas `.use()` en ligne ou un module nommé.

### 2.4 Le chemin de résolution reste court

La première opération de `get()` est la lecture du cache local :

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

Aucun travail ne doit précéder cette lecture.

- `UNDEFINED_MARKER` représente les valeurs `undefined` explicites. Ne réintroduis pas de seconde recherche `cache.has(key)` sur un succès du cache.
- `_disposed`, recherche d’enregistrement et de parent, contrôles de cycles et durées de vie et mutations de la pile singleton viennent après le chemin rapide.
- Les arbres par défaut examinent les enregistrements locaux avant la chaîne exacte des parents. Ils ne conservent pas d’instantané de recherche, donc les mutations restent visibles sans suivi d’invalidation ni métadonnées de recherche par scope.
- Garde les branches directes pour 0–7 arguments de constructeur. Au-delà, utilise `Reflect.construct` avec un tableau compact construit par `push`.
- `get()` reste synchrone. `resolving` et `singletonStack` fonctionnent parce qu’une résolution et chaque vérification préalable asynchrone déclarative sont atomiques sur la pile d’appels. `getAsync()` entoure le même résolveur d’une frontière de promesse et ne modifie jamais ces piles dans une continuation.
- Les enregistrements synchrones et asynchrones partagent `regs`, `cache`, recherche de scopes, responsabilité et libération. `Registration.async` reste une métadonnée froide d’enregistrement, jamais lue par `get()`.
- `{fast: false}` est le contrat mutable vérifié par défaut. `{fast: true}` supprime les contrôles après le chemin du cache, lit directement le propriétaire du registre et recopie les singletons délégués localement. Termine `register*`, `.use()` et `.override()` avant la première résolution ou `createScope()`. Libère les enfants avant les ancêtres. Seul `true` active ce mode ; les autres valeurs inconnues ou issues d’assertions retombent sur le contrat vérifié.
- Garde l’ordre des champs fréquents de `Registration` : `{kind, lazy, fn, owned}`. Le marqueur `async` facultatif ne peut être qu’ajouté après eux et reste hors du chemin de résolution.

`packages/inferdi/__tests__/container.bench.ts` n’est pas imposé par la CI. La revue doit exiger des résultats de benchmark pour toute modification de `get()`, structure d’enregistrement, cache, recherche de scope, compagnon différé ou appel de constructeur. Une régression locale supérieure à 5 % dans un scénario pertinent bloque la fusion sans justification écrite précise dans la PR.

### 2.5 Aucune dépendance à l’exécution

`@inferdi/inferdi` n’a aucune dépendance à l’exécution. Cette propriété doit être conservée.

Le bundle publié doit rester strictement inférieur à 3 KiB (3072 octets) avec gzip. La CI l’impose via `pnpm run test:bundle-size`. La revue doit tout de même examiner les variations de taille lorsque du code est ajouté au cœur ou aux utilitaires publics.

### 2.6 La libération fait respecter la responsabilité

La libération ferme seulement les valeurs possédées et mises en cache par le conteneur courant. Elle est idempotente, sûre en cas de réentrance et indépendante entre parents et enfants.

- Marque d’abord le conteneur comme libéré, copie et déduplique `owned`, puis vide `owned`, `cache`, `regs`, `scopeInputs` et `parent` avant d’appeler les libérations utilisateur. Une résolution réentrante doit immédiatement voir un conteneur démonté.
- Préserve le LIFO selon la première création. Les entrées de cache dupliquées et fabriques asynchrones distinctes produisant la même ressource ne la ferment qu’une fois.
- `dispose()` asynchrone partage une promesse de fin en cours, déballe les promesses de fabriques en cache, cherche `Symbol.asyncDispose` → `Symbol.dispose` → `.dispose()`, continue après les échecs et lève une erreur ou un `AggregateError` s’il y en a plusieurs.
- `[Symbol.dispose]()` synchrone appelle seulement les protocoles synchrones. Une promesse en cache ou renvoyée par un `.dispose()` ordinaire est un usage incorrect ; ne masque pas l’erreur par une libération invisible en arrière-plan.
- `registerValue`, `.override()`, entrées de scope, enveloppes différées et valeurs transient restent exclus, car leur responsabilité n’a jamais été transférée.

## 3. Questions de revue des PR

Pour toute PR touchant `packages/inferdi/src`, `packages/inferdi/package.json`, `packages/inferdi/jsr.json` ou les tests du cœur, réponds à ces questions :

1. Les garanties statiques du graphe sont-elles préservées, ou une règle passe-t-elle à l’exécution sans limite TypeScript documentée ?
2. Le succès du cache de `get()`, la structure des enregistrements, la recherche de scopes, la résolution différée ou les constructeurs changent-ils ? Si oui, où sont les benchmarks ?
3. Le cœur reçoit-il une dépendance à l’exécution, des décorateurs, de la réflexion, une résolution par proxy ou une exigence de transpilation ?

Refuse la PR si la première réponse affaiblit les types sans motif, si la deuxième manque de mesures ou si la troisième est positive.

## 4. Liste des changements sous contrôle strict

Chaque point suivant exige une justification explicite dans la PR.

### Chemin fréquent et structure à l’exécution

- [ ] Travail ajouté avant `cache.get(key)` dans `get()` ?
- [ ] `UNDEFINED_MARKER`, `cache`, `regs`, recherche de parent ou structure de `Registration` modifiés ?
- [ ] Ordre `{kind, lazy, fn, owned}` changé ou `async` déplacé avant ces champs ?
- [ ] Recherche locale du contrat vérifié déplacée après celle des parents ?
- [ ] `Proxy`, `Reflect.get`, `Object.defineProperty` ou recherche de métadonnées ajoutés à la résolution ?
- [ ] `get()` devenu `async` ?
- [ ] `get()` lit désormais `Registration.async` ou vérifie la disponibilité ?
- [ ] Branches de construction pour 0–7 arguments supprimées ou restructurées ?
- [ ] Les scopes fast ne lisent plus directement le propriétaire ou recopient autre chose que les singletons délégués ?

### Système de types

- [ ] Contrôle des doublons affaibli hors `.override()` ?
- [ ] Contrainte publique de clé réduite de `string | symbol` à `string` ?
- [ ] `AllowedDeps`, `LazySpec`, `AsyncLazySpec`, propagation asynchrone, disponibilité ou filtre de durée de vie affaiblis ?
- [ ] `NoKeyOverlap`, `ScopeInputMap`, `WithRequirements`, compatibilité des modules, `SpecMap` ou utilitaires de namespace modifiés ?
- [ ] Entrées facultatives, numériques, larges, variables ou en collision acceptées, ou résolubles avant fourniture ?
- [ ] Un module peut masquer des exigences absentes/incompatibles ou des collisions de sorties ?
- [ ] Ajout non sûr de `any`, `unknown as` ou `// @ts-ignore` dans `src/` ?
- [ ] Comportement public des types changé sans tests positifs/négatifs, fixtures de diagnostics utiles et test des déclarations consommées ?

### Dépendances et compilation

- [ ] Dépendance à l’exécution ajoutée à `packages/inferdi/package.json` ?
- [ ] Dépendance pair sur `reflect-metadata`, `tslib` ou une intégration de framework ?
- [ ] Budget strict `< 3 KiB` gzip dépassé ou contrôle CI affaibli ?
- [ ] Plugin TypeScript, transformateur, option de décorateur ou émission de métadonnées requis ?

### Cycle de vie et libération

- [ ] `dispose()` ou `[Symbol.dispose]()` ne définit plus `_disposed` avant les libérations ?
- [ ] Vidage de `owned`, `cache`, `regs`, `scopeInputs` ou `parent` déplacé après les libérations ?
- [ ] Détachement du parent supprimé ?
- [ ] Déduplication ne préservant plus le LIFO de première création ?
- [ ] Ordre LIFO changé ?
- [ ] Ordre `Symbol.asyncDispose` → `Symbol.dispose` → `.dispose()` modifié ?
- [ ] Promesses de fabriques en cache non attendues, ou ressource partagée libérable deux fois ?
- [ ] Appels `dispose()` concurrents ne partageant plus une promesse de fin ?
- [ ] Échecs multiples non rassemblés dans `AggregateError` ?
- [ ] Libération synchrone ne signalant plus l’usage incorrect de ressources asynchrones ?

### Exceptions et usages dynamiques

- [ ] Contrôle temporel du cache local d’`.override()` affaibli, ou limites sur les transient et valeurs d’ancêtres masquées ?
- [ ] `.override()` ne préserve plus `kind`, `lazy`, `async`, devient non local ou accepte les entrées de scope ?
- [ ] `.has()` devient un résolveur ou modifie les caches ?
- [ ] `.has()` prétend prouver la disponibilité ou la résolution synchrone ?
- [ ] Arbre fast mutable après activation ou règle de libération enfants avant ancêtres affaiblie ?
- [ ] Clés construites à l’exécution promues comme API principale ?
- [ ] Auto-wiring, auto-injection, injection par nom de paramètre, recherche de fichiers ou découverte de modules ajoutés au cœur ?

## 5. Compromis assumés

Documente ces choix au lieu de les « corriger ».

| Choix | Raison |
|---|---|
| Pas de cible ES5 ou antérieure à ES2022 | `Map`, `Symbol`, `WeakRef`, `Reflect.construct` et les symboles de libération sont fondamentaux. Seuls les symboles de libération absents sont complétés. Node 16+ reste le minimum. |
| Pas d’API de décorateurs | L’injection par décorateurs serait une autre bibliothèque. |
| Pas de métadonnées à l’exécution | Les signatures et `deps` fournissent le graphe. L’introspection ajouterait des dépendances et des erreurs moins bien détectées. |
| Pas de distinction nominale des structures identiques | `DepsOf` ne connaît pas l’intention sémantique. Marque les valeurs, ou utilise `unique symbol` pour l’identité nominale des clés. |
| Pas de `get()` asynchrone | `getAsync()` enveloppe le même résolveur synchrone sans second registre, cache ou voie de résolution. |
| Les promesses de `registerFactory` restent synchrones dans le graphe | La promesse peut être volontairement le service. Seul `registerAsyncFactory` crée `AsyncSpec` et la propagation déclarative. |
| Pas de détection des cycles dynamiques après une promesse | Les relations déclaratives sont pré-vérifiées synchroniquement. Les accès de fabriques historiques ou conteneurs capturés après `await` surviennent après vidage de la pile. Sépare le cycle ou remonte l’initialisation commune. |
| Pas de contrôle de durée de vie après une frontière asynchrone | `AllowedDeps` contrôle les types, mais les assertions et conteneurs externes après `await` arrivent après vidage de `singletonStack`. Une protection complète exigerait un suivi de contexte asynchrone. Lis les dépendances au début synchrone de la fabrique. |
| Pas de rupture automatique des cycles | Un cycle est un défaut architectural sauf compagnon singleton différé explicite. InferDI détecte les cycles pris en charge sans inventer de proxies ni d’instances partielles. |
| Pas de modules génériques `<T>(c: Container<T>) => ...` | `keyof T` se réduit à la borne `DependenciesMap` dans le corps générique. Utilise `.use()` en ligne ou des modules nommés avec exigences. |
| Pas de source implicite d’entrées | L’application passe ses valeurs à `createScope(inputs)`. Le cœur ne lit ni contexte ambiant ni `AsyncLocalStorage`. |
| Pas d’API de résolveur DI dynamique | `.has(key)` sonde l’enregistrement seulement. Les clés statiques prêtes utilisent directement `.get()` ou `.getAsync()`. |
| Pas de stratégie de substitutions en production | `.override()` sert aux tests et fixtures de hot reload ; son contrôle ne voit que le cache local. Le choix de production appartient à `.use()` ou au builder. |
| Le mode fast exige un graphe fixe | La recherche aplatie et la recopie des singletons reposent sur les invariants de topologie, cycle de vie, cycles et durées de vie. Le contrat mutable vérifié reste le défaut. |
| Pas de libération en cascade parent-enfant | Chaque conteneur possède ses instances. Une cascade ferait de `dispose()` un effet non local et briserait la responsabilité des scopes. |
| Pas de hooks ni middleware de résolution | Ce serait de l’AOP, ajoutant du travail au chemin fréquent et brouillant le contrat du cœur. |
| Pas d’intégration de framework dans le cœur | Elle appartient aux adaptateurs. Le cœur reste indépendant et sans dépendances. |
| Pas de moteur d’analyse du graphe | `@inferdi/graph` reste une proposition du dépôt. Un éventuel compagnon de développement/CI ne doit modifier ni la résolution de production ni la structure des enregistrements. |

## 6. Hors périmètre

InferDI ne deviendra pas :

- un framework IoC universel
- un conteneur de décorateurs ou de réflexion
- un système de contexte de requête ou un remplacement d’`AsyncLocalStorage`
- un scanner d’assemblage automatique
- un DSL de fournisseurs ou système de découverte de modules à l’exécution
- un moteur d’analyse, de règles, de rapports ou de snapshots dans le cœur de production
- un hôte de plugins pour middleware de résolution
- une couche de compatibilité pour anciens conteneurs DI

Le graphe est le type, et le type est le contrat.

