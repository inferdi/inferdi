# Bots, files et CLI

Les mises à jour de bots, jobs de file et commandes CLI sont des opérations asynchrones délimitées. Les exemples créent un scope par mise à jour, job ou commande et utilisent `await using` lorsque la fonction gère l’opération complète.

Ils utilisent le graphe partagé. Compare l’unité de travail confiée au code de l’application par chaque bibliothèque. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Exemple | Contenu |
|---|---|
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | Scope de mise à jour Telegraf |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | Scope de mise à jour Grammy |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | Scope de job BullMQ |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | Scope de commande Commander |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | Scope de commande Yargs |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

Fichier du dépôt : [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

Fichier du dépôt : [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

Fichier du dépôt : [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

Fichier du dépôt : [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

Fichier du dépôt : [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)

