# Adaptateurs de frameworks

Les adaptateurs InferDI relient les types exacts de conteneurs aux cycles de vie des frameworks. Les adaptateurs HTTP créent un scope de requête à l’emplacement natif du framework. L’adaptateur React fournit des contextes typés et peut gérer un scope enfant créé côté client.

Les adaptateurs gèrent le cycle de vie des scopes. Le cœur reste sans dépendances et n’ajoute ni décorateurs, ni recherche de contrôleurs, ni injection de paramètres de gestionnaires, ni découverte de routes.

## Paquets

| Paquet                                                                             | Framework  | Emplacement du scope | Racine seule |
|-------------------------------------------------------------------------------------|------------|----------------|----------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di`   | oui            |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)       | Hono v4    | `c.var.di`     | non             |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)         | Koa v3     | `ctx.state.di` | non             |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5  | `req.di`       | non             |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)   | Elysia v1  | `context.di`   | oui            |
| [`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react)     | React 19   | Contexte React  | `Provider` externe |

React utilise le cycle de vie des composants. Son `Provider` externe ne libère jamais son conteneur ; son `ScopeProvider` géré crée l’enfant après le commit et le libère toujours. Voir l’[adaptateur React](./react).

## Contrat commun de cycle de vie

En mode scoped, les requêtes HTTP suivent les mêmes étapes :

1. **Créer :** ouvrir un scope depuis la racine au début de la requête (`createScope`, par défaut `root.createScope()`).
2. **Exposer :** Hono, Koa, Express et Elysia exposent le scope avant le setup. Fastify expose `request.di` après sa réussite et seulement temporairement pendant la libération d’un setup échoué. Les hooks de libération y voient le scope ; les gestionnaires d’erreurs n’y reçoivent pas de scope partiellement construit.
3. **Initialiser :** exécuter éventuellement `setupScope`, qui peut être asynchrone, avant les gestionnaires.
4. **Traiter :** les routes et gestionnaires d’erreurs résolvent leurs services depuis le scope exposé.
5. **Libérer :** appeler `disposeScope`, par défaut `scope.dispose()`, au point de fin sûr du framework, sauf transfert de responsabilité.

### Options communes

| Option | Valeur par défaut | Rôle |
|---|---|---|
| `container` | obligatoire | Racine ; jamais libérée automatiquement, sauf via l’option `disposeRootOnClose` de Fastify. |
| `createScope` | `root.createScope()` | Crée le scope et fournit les entrées déclarées de requête ; peut être asynchrone. |
| `setupScope` | aucun | Initialisation supplémentaire avant les gestionnaires ; peut être asynchrone. |
| `disposeScope` | `scope.dispose()` | Libération personnalisée synchrone ou asynchrone. |
| `autoDispose` | `true` | `false`, ou un prédicat renvoyant `false`, confie la libération à ton code. |
| `onDisposeError` | selon l’adaptateur | Fastify : `request.log.error` ; Koa : `ctx.app.emit('error')` ; autres : `console.error`. |
| `skipInferdiDispose(...)` | — | Transfère la responsabilité d’une requête pour le streaming ou le travail en arrière-plan. |

### Erreurs et responsabilité des ressources

- **Un échec de setup expose seulement l’erreur d’origine.** Le scope partiellement construit est libéré. Un échec supplémentaire de libération va à `onDisposeError` ou au destinataire par défaut, sans être agrégé à l’erreur du setup.
- **Une requête échouée libère toujours son scope.** `skipInferdiDispose` ne supprime la libération que sur succès. Express fait exception : son middleware à callbacks ne voit pas les erreurs de route traitées en aval ; le scope ignoré reste sous la responsabilité de l’application.
- **`autoDispose: false` et `skipInferdiDispose` transfèrent la responsabilité.** Ton code doit libérer le scope à la bonne limite du framework. Les chemins d’erreur respectent également `autoDispose: false`.
- **Les erreurs de libération après production de la réponse sont signalées puis absorbées.** Une erreur tardive ne peut pas altérer une réponse déjà envoyée.

## Différences à connaître

| Adaptateur | Différence |
|---|---|
| Fastify | Libération dans `onResponse`, ou `onRequestAbort` en cas d’abandon ; libération facultative de la racine via `disposeRootOnClose`. |
| Hono | Libération après `await next()` ; les utilitaires de streaming peuvent revenir plus tôt, d’où le besoin fréquent de `skipInferdiDispose`. |
| Koa | Attend `finish` ou `close` de la réponse Node ; les corps de flux ordinaires n’ont pas besoin de désactivation. |
| Express | Ne détecte pas les erreurs de route traitées en aval ; une requête échouée ignorée reste sous la responsabilité de l’application. |
| Elysia | Dépend de `onAfterResponse` ; sans ce hook, l’adaptateur ne peut pas libérer les ressources du scope. |
