# Durées de vie

InferDI propose trois durées de vie :

| Durée de vie | Création | Cache | Libération par le conteneur |
|---|---|---|---|
| `singleton` | une fois par conteneur propriétaire | conteneur propriétaire | oui |
| `scoped` | une fois par scope enfant | scope enfant | oui |
| `transient` | à chaque résolution | aucun | non |

Résous les clés `scoped` depuis un enfant créé par `createScope()`. Le mode par défaut refuse leur résolution depuis le conteneur racine.

## La règle de durée de vie

Un singleton ne peut pas dépendre directement d’un service `scoped` ou `transient`. Il est créé une fois puis partagé entre toutes les requêtes. S’il conserve le contexte, l’utilisateur ou la transaction d’une requête, cet état se retrouve silencieusement dans les autres. InferDI empêche cette relation dans le système de types.

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

TypeScript refuse cet enregistrement dans tous les modes d’exécution. Si une assertion contourne les types, le mode par défaut refuse également cette relation à l’exécution.

Les entrées de scope déclarées comptent comme des dépendances scoped. Enregistre les consommateurs de requêtes, contextes d’authentification, locataires ou données de jobs en `scoped` ou `transient` ; le compilateur refuse un consommateur singleton. Voir [Entrées de scope](./scope-inputs).

Les vérifications à l’exécution dépendent du contrat du conteneur. Voir les [Options du conteneur](../reference/api#container-options) pour les modes par défaut et `fast`.

