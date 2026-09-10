# Performances

## Résultat enregistré

Lors du test public du **17 août 2026**, le contrat vérifié par défaut a résolu un singleton en cache avec une médiane de **6.233 ns/op**. Pour ce seul scénario et les versions enregistrées, les autres conteneurs ont mesuré **1.76 à 13.05 fois** cette médiane. Il s’agit du coût du conteneur, pas du débit HTTP ni des performances globales de l’application. Le [résultat brut](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json) contient les huit tours et les métadonnées de l’environnement.

Un accès à chaud lit `Map.get(key)` ; lorsqu’une construction est nécessaire, il appelle directement `new Ctor(...)`. Les scénarios couvrent les choix suivants :

| Choix d’exécution | Effet |
|---|---|
| Enregistrements explicites | Un `Map.set` par service, sans effets de décorateurs, analyse de noms de paramètres ni tables de métadonnées. |
| Singletons et services scoped en cache | `cache.get(key)` précède le suivi des cycles et durées de vie. `undefined` est représenté par `UNDEFINED_MARKER` pour conserver une seule recherche. |
| Appels directs de constructeurs | `new Ctor(...)` pour 0 à 7 dépendances, puis `Reflect.construct` au-delà. |
| Fabriques asynchrones | La promesse est conservée telle quelle ; les appelants concurrents partagent l’initialisation et `.get()` reste synchrone. |
| Contrat d’exécution | Le mode par défaut/`fast: false` garde les vérifications et la chaîne exacte mutable des parents. `fast: true` désactive les contrôles et suppose une topologie fixe. |

## Suite de benchmarks

Le workspace compare `InferDI (fast)` et `InferDI (default)` à InversifyJS v8, Awilix v13 en modes PROXY et CLASSIC, TSyringe v4, TypeDI v0.10 et Typed Inject v5. Le résultat brut consigne les versions et l’environnement de la machine.

**Vérifier la justesse avant de chronométrer**

La suite de contrats des adaptateurs de benchmark précède Tinybench. Chacun doit fournir le même graphe observable :

- `Logger`, `Config`, `Repo` et `Service` sont des singletons racine.
- Les nœuds transient produisent de nouvelles instances.
- Chaque scope conserve son propre `ScopedService` tout en partageant le logger racine.
- L’accès différé repousse la résolution de la cible.
- Chaque API de libération déclarée appelle la libération du service scoped.

Ces contrôles évitent de comparer des durées de vie ou identités différentes. Le coût n’est mesuré qu’une fois le contrat respecté.

**Protocole de mesure**

Le runner public installe depuis le lockfile figé, vérifie les types du workspace, construit l’artefact ESM de production d’InferDI et exécute les contrats contre cet artefact. Les mesures suivent ces règles :

1. Un bloc en carré latin équilibré comporte huit tours pour huit participants.
2. Chaque participant occupe chaque position une fois et suit chaque autre participant une fois. `InferDI (fast)` précède `InferDI (default)` quatre fois et le suit quatre fois.
3. Chaque participant utilise un nouveau processus Node, sans partage de retours JIT, de caches en ligne ni d’historique du GC.
4. Tinybench préchauffe chaque scénario pendant 50 ms et mesure pendant 100 ms. Un échantillon exécute un lot adapté à l’opération.
5. Pour chaque participant, scénario et tour, la durée médiane du lot est divisée par sa taille et enregistrée en `ns/op`.
6. Le rapport agrège les huit valeurs par leur médiane et leur écart absolu médian (MAD).

Une valeur `ns/op` plus faible est meilleure. Le MAD décrit la dispersion autour de la médiane, pas un intervalle de confiance. L’isolation et l’ordre équilibré réduisent les biais sans supprimer l’ordonnancement système, les variations de fréquence CPU, les décisions JIT ou le timing du GC.

**Périmètre des scénarios**

Chaque scénario isole une partie du travail du conteneur. Le code de production combine ces étapes selon son modèle de durée de vie.

| Groupe | Scénarios | Travail mesuré |
|---|---|---|
| Accès à chaud | Résolution singleton, scoped et différée | Recherche en cache ou via une enveloppe différée existante |
| Construction d’objets | Résolution transient, graphes profonds et larges | Absences du cache, parcours des dépendances, assemblage des arguments et constructeurs |
| Démarrage et accès à froid | Enregistrement, première résolution | Configuration du graphe et remplissage initial du cache |
| Cycle de vie du scope | Création, première résolution scoped, libérations synchrone et asynchrone | Gestion par requête ou job, de la création à la libération |

Les hooks de setup Tinybench préparent les graphes froids et les scopes hors des zones chronométrées. Le nettoyage des scénarios d’enregistrement et de résolution est lui aussi exclu. Seuls les scénarios de libération chronomètrent ce nettoyage.

TypeDI affiche `N/A` pour l’enregistrement, car ses définitions comparables s’exécutent par effets de décorateurs pendant l’évaluation des modules, exclue du chronométrage. Les lignes de libération ne retiennent que les contrats publics équivalents : InversifyJS affiche `N/A`, TypeDI participe à la libération synchrone, Awilix, TSyringe et Typed Inject à l’asynchrone. InferDI expose les deux.

**Résultat public**

Chaque cellule indique `médiane ± MAD` en `ns/op`. Le facteur entre parenthèses compare cette médiane à la plus basse de la ligne.

![Benchmark](https://raw.githubusercontent.com/inferdi/inferdi/main/assets/benchmarking_results.jpg)

| Scénario                     |          InferDI (fast) |       InferDI (default) |               InversifyJS |              Awilix PROXY |            Awilix CLASSIC |                TSyringe |                   TypeDI |            Typed Inject |
|------------------------------|------------------------:|------------------------:|--------------------------:|--------------------------:|--------------------------:|------------------------:|-------------------------:|------------------------:|
| Singleton en cache        |   6.233 ± 0.091 (1.00×) |   6.233 ± 0.000 (1.00×) |    10.954 ± 0.321 (1.76×) |    40.425 ± 0.596 (6.49×) |    41.525 ± 0.367 (6.66×) | 81.354 ± 3.254 (13.05×) |  71.729 ± 0.962 (11.51×) |  48.354 ± 1.374 (7.76×) |
| Résolution transient            |  41.798 ± 2.196 (1.00×) |  45.834 ± 1.284 (1.10×) |    79.566 ± 3.850 (1.90×) |    219.82 ± 8.250 (5.26×) |    227.15 ± 8.068 (5.43×) | 301.40 ± 16.682 (7.21×) |  519.75 ± 5.498 (12.43×) |  138.05 ± 1.464 (3.30×) |
| Graphe profond (10 niveaux)       | 344.21 ± 11.460 (1.00×) | 445.50 ± 10.085 (1.29×) |    397.37 ± 7.795 (1.15×) |   1306.3 ± 16.500 (3.79×) |   1190.8 ± 12.375 (3.46×) | 1463.0 ± 34.835 (4.25×) | 4478.8 ± 26.582 (13.01×) |  717.75 ± 3.670 (2.09×) |
| Graphe large (4 dépendances)  |  59.584 ± 1.282 (1.00×) |  71.316 ± 1.284 (1.20×) |    103.22 ± 2.932 (1.73×) |    331.10 ± 6.416 (5.56×) |    302.69 ± 5.498 (5.08×) | 457.97 ± 18.150 (7.69×) | 863.32 ± 12.832 (14.49×) |  197.63 ± 1.468 (3.32×) |
| Graphe large (10 dépendances) |  188.37 ± 4.125 (1.00×) |  200.74 ± 4.130 (1.07×) |    394.63 ± 4.580 (2.09×) |   681.08 ± 21.080 (3.62×) |   571.54 ± 12.830 (3.03×) | 979.46 ± 15.125 (5.20×) | 2234.1 ± 25.888 (11.86×) |  321.29 ± 4.585 (1.71×) |
| Enregistrement                 | 2007.5 ± 27.500 (1.00×) | 2158.8 ± 13.750 (1.08×) | 61274.6 ± 1537.7 (30.52×) | 74763.4 ± 1024.4 (37.24×) | 95225.6 ± 467.45 (47.43×) | 3762.9 ± 36.650 (1.87×) |                      N/A | 3593.3 ± 18.300 (1.79×) |
| Première résolution                | 653.13 ± 24.745 (1.00×) |  794.98 ± 6.190 (1.22×) |  9967.4 ± 551.61 (15.26×) |   2434.9 ± 96.250 (3.73×) |   3044.2 ± 70.360 (4.66×) | 1236.8 ± 25.440 (1.89×) |  3322.9 ± 22.455 (5.09×) | 1275.3 ± 22.917 (1.95×) |
| Création de scope               |  79.750 ± 2.290 (1.00×) |  83.415 ± 5.505 (1.05×) |  6194.4 ± 167.98 (77.67×) |  1054.4 ± 16.960 (13.22×) |   1031.2 ± 7.790 (12.93×) | 503.26 ± 10.540 (6.31×) |   419.38 ± 3.210 (5.26×) |  164.08 ± 1.835 (2.06×) |
| Première résolution scoped         |  115.05 ± 1.830 (1.00×) |  128.34 ± 1.835 (1.12×) |  3048.6 ± 32.765 (26.50×) |    352.92 ± 1.835 (3.07×) |    362.54 ± 4.590 (3.15×) | 373.54 ± 11.915 (3.25×) |   296.08 ± 4.125 (2.57×) |  203.05 ± 0.920 (1.76×) |
| Résolution scoped en cache          |   8.387 ± 0.092 (1.05×) |   8.250 ± 0.046 (1.03×) |    30.204 ± 0.367 (3.79×) |   90.841 ± 1.421 (11.39×) |   95.242 ± 1.421 (11.94×) |  78.375 ± 2.429 (9.83×) |  92.630 ± 0.458 (11.61×) |   7.975 ± 0.092 (1.00×) |
| Libération synchrone                |  99.455 ± 1.370 (1.01×) |  98.085 ± 0.925 (1.00×) |                       N/A |                       N/A |                       N/A |                     N/A |   124.21 ± 3.665 (1.27×) |                     N/A |
| Libération asynchrone               |  242.91 ± 3.210 (1.00×) |  249.34 ± 1.840 (1.03×) |                       N/A |   860.52 ± 20.170 (3.54×) |   886.87 ± 13.750 (3.65×) | 1311.8 ± 10.080 (5.40×) |                      N/A | 721.42 ± 19.935 (2.97×) |
| Résolution différée                 |  18.837 ± 0.458 (1.00×) |  19.020 ± 0.274 (1.01×) |    64.212 ± 3.621 (3.41×) |    115.68 ± 0.825 (6.14×) |    124.09 ± 3.231 (6.59×) |  155.01 ± 5.271 (8.23×) |  271.06 ± 3.941 (14.39×) |  76.496 ± 0.962 (4.06×) |

::: info Données sources
Le graphique et le tableau utilisent [`public-2026-08-17T16-46-00-483Z.json`](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json). Ce fichier contient les huit tours, mesures normalisées, statistiques Tinybench, métadonnées et versions des dépendances. Le [README des benchmarks](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) décrit chaque scénario, son lien avec la production et les calculs.
:::

**Interpréter les résultats**

Au moins un mode InferDI obtient la médiane la plus basse ou à égalité dans 12 scénarios sur 13. `InferDI (fast)` le fait dans 11 scénarios. Les gains les plus nets concernent l’enregistrement, la première résolution, la construction transient et des graphes, la création de scope et sa première résolution. Ces opérations utilisent le registre plat, les constructeurs directs et le court chemin d’absence du cache.

La résolution scoped en cache fait exception : Typed Inject mesure 7.975 ns, InferDI default 8.250 ns et InferDI fast 8.387 ns. Cette ligne mesure une seule lecture en cache depuis un scope existant, sans création, première absence du cache ni libération, que la même requête réelle peut payer séparément.

**Pourquoi `fast` n’est pas le plus bas partout**

`fast: true` modifie les absences de cache vérifiées, la construction, l’invalidation des enregistrements et la recherche des parents dans un arbre fixe. Certains scénarios n’exécutent plus ces branches après préchauffage :

- La résolution singleton à chaud revient depuis `cache.get(key)` avant la lecture du flag `fast`. Les deux modes mesurent 6.233 ns.
- La résolution scoped à chaud utilise ce même chemin. 8.387 ns contre 8.250 ns donnent un écart de 0.137 ns sur une implémentation identique, du même ordre que les MAD rapportés.
- La libération synchrone utilise la même implémentation dans les deux modes. Son écart médian de 1.370 ns égale le MAD du résultat fast de ce test.
- Les petits gains fast en libération asynchrone et résolution différée ne viennent pas non plus directement de contrôles de résolution supprimés en régime stable. Ils demandent la même prudence.

Des processus Node indépendants peuvent produire du code JIT différent pour des chemins identiques, ou subir un autre ordonnancement et timing du GC. Le carré latin et la médiane sur huit tours réduisent ces effets sans les éliminer. Les petites inversions ne prouvent pas une régression du mode fast. Des répétitions sur une machine contrôlée sont plus probantes pour les écarts inférieurs à une nanoseconde ou de quelques pour cent.

Les écarts plus grands correspondent à des implémentations différentes : le mode par défaut prend 1.29 fois la médiane fast pour le graphe transient de dix niveaux, 1.22 fois pour la première résolution, 1.20 fois pour le graphe de quatre dépendances et 1.12 fois pour la première résolution scoped. Cela concorde avec le suivi des cycles et durées de vie supprimé et la recherche de scopes à topologie fixe.

**Choisir les scénarios adaptés à l’application**

Le rapport ne calcule pas de score global : les applications combinent différemment le travail du conteneur. Un processus durable peut enregistrer une fois puis surtout lire des singletons en cache. Un adaptateur HTTP peut créer un scope, résoudre un graphe, lire le cache et libérer le scope à chaque requête. Un worker peut construire des graphes transient sans scope.

Ne moyenne pas les facteurs relatifs entre lignes : les lots et zones chronométrées diffèrent. Choisis les scénarios correspondant au profil de résolution mesuré, puis profile l’application entière avec son framework et ses entrées-sorties.

La comparaison vaut pour les versions, adaptateurs, fixtures et machine enregistrés. Chaque bibliothèque conserve son cycle de vie public. `N/A` signifie qu’aucune opération équivalente n’a été trouvée. Le benchmark mesure le coût du conteneur, pas la latence complète d’une requête.

## `fast: true` {#fast-true}

Voir les [Options du conteneur](../reference/api#container-options) pour la référence du constructeur. Cette section en explique les conséquences sur les performances.

`new Container({ fast: true })` supprime le suivi des cycles, la pile des singletons et le `try`/`finally` de la résolution vérifiée. Les scopes fixes lisent directement le propriétaire du registre puis recopient les singletons délégués en cache. Les scopes par défaut parcourent la chaîne exacte à chaque absence locale et voient ainsi les mutations. Les conteneurs fast ignorent l’invalidation défensive à l’enregistrement. La déduplication par identité reste active à la libération.

`new Container()` et `{fast: false}` conservent les contrôles de sûreté à l’exécution et un graphe mutable.

N’utilise `fast: true` qu’après avoir testé le graphe avec `fast: false`. TypeScript ne voit pas tous les cycles singleton ou transient, clés dynamiques, assertions ou fabriques capturant un conteneur externe plus large. Enregistre chaque clé une fois dans une chaîne linéaire, termine avant la première résolution ou création de scope, garde l’arbre activé immuable et libère les enfants avant leurs ancêtres.

Après ces vérifications, `{fast: true}` peut réduire les coûts d’enregistrement, d’absence du cache, de construction et de recherche de scopes fixes dans un graphe de production profilé. Les accès en cache et la libération utilisent des chemins communs : mesure les étapes dominantes avant de choisir. Garde `fast: false` pour le développement, les tests, le hot reload et les arbres modifiés après activation.

## Détails du chemin fréquent

### Construction transient

`registerClass` reste le choix par défaut pour les services transient. Ne le change que si le profilage identifie des résolutions répétées de nombreuses classes différentes ayant le même nombre de dépendances.

Pour ce cas précis sous V8, une fabrique explicite donne à chaque service son propre site de construction :

```ts
const container = new Container()
  .declareScopeInputs<{ context: RequestContext }>()
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    ['context', 'schema'],
    'transient'
  )
```

Les fabriques répètent l’assemblage des dépendances : n’utilise cette forme qu’après mesure de l’artefact de l’application. Un utilitaire générique commun supprime le site d’appel distinct et annule l’optimisation.

### Représentation des clés

Les symboles peuvent aider dans des boucles de résolution serrées, car `Map` compare leur identité. Les chaînes exigent un hachage et, en cas de collision, une comparaison des caractères. La plupart des applications ne mesureront aucune différence : base ce choix sur le profilage.

## Reproduire localement

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run bench:quick   # local source check
pnpm run bench:public  # production artifact, fresh process per subject
```

Le workspace de benchmarks est volontairement séparé du workspace pnpm racine et possède son propre lockfile. Le [README des benchmarks](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) présente la méthode, les précautions de comparaison et les fixtures.

