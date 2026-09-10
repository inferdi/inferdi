# Démarrage rapide

Commence par deux classes ordinaires et une chaîne d’assemblage explicite. Les scopes de requête viendront ensuite, une fois le graphe de base compris.

## Installation

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## Construire le graphe

<<< ../../../snippets/quick-start-sync.ts

`UserService` n’importe pas InferDI. Le code d’assemblage choisit `Logger`, nomme les deux enregistrements et précise l’ordre des arguments du constructeur. Le type de `root` contient désormais les deux services.

Si tu modifies le constructeur sans mettre à jour le graphe, l’erreur apparaît à l’endroit où l’application est assemblée :

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class UserService {
  constructor(readonly logger: Logger, readonly region: string) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger']) // [!code error]
```

C’est l’intérêt concret de représenter l’état du graphe dans les types : chaque enregistrement affine le type du conteneur, et les opérations suivantes doivent respecter le graphe déjà déclaré.

## Résoudre les services

`root.get('users')` renvoie un `UserService` de façon synchrone. La durée de vie par défaut est singleton : les appels suivants retrouvent donc l’instance en cache.

Les données d’une requête nécessitent une limite plus courte. Déclare-les comme entrée de scope, puis fournis-les à l’ouverture d’un scope enfant :

<<< ../../../snippets/quick-start-scope.ts

Le bloc `finally` ferme le scope enfant même si le traitement échoue. `scope.dispose()` libère le `RequestLog` propre au scope ; la valeur `request` fournie reste sous la responsabilité de l’application. Tu peux utiliser `await using` si ta chaîne TypeScript prend en charge Explicit Resource Management.

## Choisir les durées de vie

| Durée de vie | Politique d’instance | Propriétaire du cache | Responsable de la libération |
|---|---|---|---|
| `singleton` | une par propriétaire de l’enregistrement | racine ou propriétaire de l’enregistrement | ce conteneur |
| `scoped` | une par scope de résolution | scope enfant | ce scope |
| `transient` | une par résolution | aucun | appelant |

Les valeurs passées à `registerValue`, `.override()` ou comme entrées de scope restent elles aussi sous la responsabilité de l’application. Un singleton ne peut pas dépendre directement d’un service scoped ou transient : InferDI refuse cette relation dans les types et la vérifie aussi à l’exécution en mode par défaut.

## Pour continuer

[Pourquoi InferDI ?](./why-inferdi) présente les choix de conception, puis [Sûreté des types](../core/type-safety) détaille les vérifications du graphe. [Scopes et libération](../core/scopes) explique la responsabilité des ressources, et les [Adaptateurs](../adapters/) relient les scopes aux cycles de vie des frameworks.

