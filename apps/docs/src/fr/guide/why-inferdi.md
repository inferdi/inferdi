# Pourquoi InferDI ?

L’injection manuelle par constructeur est un bon point de départ : les dépendances restent visibles et TypeScript vérifie chaque appel. InferDI devient utile quand le graphe dépasse quelques instanciations et qu’il faut aussi gérer les durées de vie, les scopes, l’initialisation asynchrone, les contrats des modules et la libération des ressources.

## Vérifier l’assemblage comme un seul graphe

Chaque enregistrement renvoie un nouveau type de conteneur. Ce type conserve les clés connues, les types des services, leurs durées de vie, leur état asynchrone et les entrées de scope manquantes. Les enregistrements suivants ne peuvent donc pas introduire discrètement une clé inconnue, un argument de constructeur incompatible, une clé en double ou un singleton qui conserve un état à durée de vie plus courte.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Database {
  find(id: string) {
    return { id }
  }
}

class UserService {
  constructor(readonly database: Database) {}
}

const app = new Container()
  .registerClass('database', Database, [])
  .registerClass('users', UserService, ['database'])

const users = app.get('users')
//    ^?
```

Cet état accumulé explique l’idée selon laquelle le graphe est le type. Les modules conservent les mêmes exigences lorsque l’assemblage est réparti entre plusieurs fichiers.

## Ce que cela apporte à l’assemblage manuel

TypeScript vérifie déjà `new UserService(database)`. L’assemblage manuel ne suit toutefois pas, à lui seul, les enregistrements propres à un scope, la propagation des dépendances asynchrones, la compatibilité des exigences d’un module réutilisable ou les ressources en cache appartenant à un scope. InferDI ajoute ces contrats à l’échelle du graphe et la gestion du cycle de vie correspondante.

Tu écris toujours le code d’assemblage. C’est volontaire : une revue de code permet de voir l’implémentation choisie et l’ordre dans lequel elle reçoit ses dépendances.

## Un runtime compact, avec des tâches précises

Le cœur n’a aucune dépendance à l’exécution, n’exige ni décorateurs ni réflexion sur les métadonnées et résout les services sans proxy. Son bundle de production doit rester sous 3 KiB avec gzip. Un accès au cache commence par un seul `Map.get()` ; un marqueur interne représente les valeurs `undefined` explicites.

Les types disparaissent à la compilation, mais le conteneur continue d’enregistrer les fournisseurs, de créer les objets, de gérer les caches, de signaler les erreurs et de libérer ses ressources. Le mode par défaut conserve les diagnostics de cycles et de durées de vie. L’option `{ fast: true }` suppose un graphe fixe et supprime certaines vérifications.

## La logique métier reste du TypeScript ordinaire

Les services métier reçoivent de simples arguments de constructeur ou de fonction. Ils n’ont pas besoin d’importer InferDI ni d’accepter un résolveur. Le conteneur appartient au point de composition et aux limites du cycle de vie, là où l’application choisit ses implémentations et ouvre ses scopes.

Un test unitaire peut alors instancier directement le service avec une dépendance factice. Remplacer InferDI demanderait de réécrire les enregistrements et l’intégration aux frameworks ; les règles métier peuvent rester intactes si cette séparation a été respectée. La page [Point de composition](./composition-root) montre cette organisation complète.

## Scopes explicites et responsabilité des ressources

Un scope peut représenter une requête HTTP, un job, une opération pour un locataire ou toute unité de travail délimitée. Le conteneur libère les résultats de classes et de fabriques mis en cache dont il est propriétaire. Les valeurs, substitutions, entrées de scope et résultats transitoires restent sous la responsabilité de l’appelant. Les conteneurs parents et enfants ne se libèrent jamais automatiquement entre eux.

Les adaptateurs relient ces règles à React, Fastify, Hono, Koa, Express et Elysia sans introduire de comportement propre aux frameworks dans le cœur.

## Où s’arrêtent les garanties

TypeScript reste structurel : deux types de même forme sont interchangeables sans marque nominale. `any` et les assertions de type peuvent contourner les contrôles. Les clés larges calculées à l’exécution réduisent la précision du graphe. Les accès dynamiques aux dépendances après un `await` échappent au suivi synchrone des cycles.

InferDI ne conçoit pas l’architecture, ne répare pas les cycles et ne garantit ni l’absence de fuites ni une application plus rapide. Il vérifie les relations déclarées avec un mécanisme d’exécution compact. Poursuis avec le [Démarrage rapide](./quick-start) ou les diagnostics de [Sûreté des types](../core/type-safety).

