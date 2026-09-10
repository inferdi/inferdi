# Erreurs

InferDI signale explicitement les mauvais usages du graphe et du cycle de vie. Garde ces messages visibles dans les tests pour détecter tôt les erreurs d’enregistrement.

| Déclencheur | Forme du message |
|---|---|
| `.get(k)` avec une clé absente | `Key "k" not found` |
| Résolution sur un conteneur libéré | `Container is disposed (key: "k")` |
| Résolution via un ancêtre libéré | `Ancestor container is disposed (key: "k")` |
| `createScope()` après libération | `Cannot create scope from a disposed container` |
| Enregistrement après libération | `Cannot register on a disposed container (key: "k")` |
| Résolution scoped depuis la racine avec `fast: false` | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| Violation de durée de vie d’un singleton | `Singleton "x" cannot depend on scoped "y"...` |
| Cycle synchrone | `Circular dependency detected: a -> b -> a...` |
| Libération synchrone d’une ressource asynchrone | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Libération synchrone d’une initialisation asynchrone en cache | `Sync [Symbol.dispose] called on a container that cached a Promise from an async factory...` |
| Substitution trop tardive | `Cannot override "k" because it has already been resolved...` |
| Substitution sur un conteneur libéré | `Cannot override on a disposed container (key: "k")` |

Avant de signaler un usage incorrect, la libération synchrone observe le rejet d’une promesse native en cache. Un rejet ultérieur ne devient pas un `unhandledRejection`, mais la libération synchrone ne peut toujours ni attendre ni fermer la ressource. Elle n’appelle pas `.then()` sur une valeur personnalisée de type promesse.

Pendant la libération asynchrone, une dépendance échouée et ses consommateurs peuvent rejeter avec le même objet `Error`. InferDI ne le signale qu’une fois. Des objets distincts restent des causes distinctes dans `AggregateError`, même avec le même message.

## Cycles de fabriques asynchrones

Les relations déclarées dans `registerAsyncFactory(..., deps, ...)` sont résolues lors d’une vérification synchrone préalable. Le contrôle de cycles existant les refuse avant le démarrage du corps des fabriques.

Les cycles créés après une frontière de promesse ne sont pas détectés. Cela comprend les appels depuis des callbacks `registerFactory` de valeur promesse et les conteneurs capturés utilisés après `await`. Si les deux côtés s’attendent, la promesse reste indéfiniment en attente.

Corrige ces cycles dans l’architecture :

- isoler l’initialisation partagée
- déplacer un côté vers un service initialisé plus tôt
- réserver `Lazy<singleton>` aux relations singleton synchrones
- ajouter en développement un délai de surveillance autour des `await` de premier niveau suspects

## Erreurs de libération des adaptateurs

Les erreurs de libération survenant après production de la réponse ne sont jamais exposées au client. Elles vont à `onDisposeError` ou au destinataire par défaut de l’adaptateur.

Les échecs de setup sont différents : l’erreur d’origine est exposée, tandis qu’une erreur supplémentaire de libération est signalée séparément, sans être agrégée à l’erreur exposée.

