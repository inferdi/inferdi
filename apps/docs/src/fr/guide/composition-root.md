# Point de composition

Le point de composition, ou composition root, est la limite de l’application où les implémentations concrètes sont choisies et reliées. Le domaine exprime ses besoins ; l’infrastructure fournit les implémentations ; InferDI n’apparaît que dans le code d’assemblage.

## Contrat du domaine

L’interface appartient au domaine, car le cas d’usage en dépend. Ce fichier n’importe ni conteneur ni framework.

::: code-group

<<< ../../../snippets/composition/domain.ts [domain.ts]

:::

## Implémentation d’infrastructure

L’infrastructure implémente le contrat du domaine. Un véritable adaptateur utiliserait un client de base de données ; cet exemple reste court pour rendre l’appel facile à suivre.

::: code-group

<<< ../../../snippets/composition/infrastructure.ts [infrastructure.ts]

:::

## Assemblage de l’application

Seul ce fichier importe InferDI. Il choisit `PostgresUserStore`, lui fournit son DSN et le relie à `GetGreeting`.

::: code-group

<<< ../../../snippets/composition/container.ts [container.ts]

:::

Le tuple d’enregistrement est vérifié contre chaque constructeur. Modifier `GetGreeting` ou `PostgresUserStore` révèle à cette limite les connexions devenues incorrectes.

## Utiliser le service à la limite de l’application

Une route HTTP, une commande CLI ou un consommateur de file résout le service de premier niveau. L’opération métier reste un appel de méthode ordinaire.

::: code-group

<<< ../../../snippets/composition/entry.ts [entry.ts]

:::

Ouvre ici un scope enfant si l’opération nécessite des données de requête ou de job. Libère-le à cette même limite, ou laisse un adaptateur le rattacher au cycle de vie du framework.

## Tester directement le domaine

Le test unitaire ne construit pas de conteneur. Il passe un faux `UserStore` à la classe `GetGreeting` utilisée en production.

::: code-group

<<< ../../../snippets/composition/domain.test.ts [domain.test.ts]

:::

Utilise `.override()` pour les tests d’intégration qui doivent exercer le véritable graphe avec une implémentation remplacée. Pour un seul service métier, l’instanciation directe est généralement plus claire. Voir [Tests et substitutions](../core/testing).

