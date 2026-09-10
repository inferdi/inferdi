# Bots, Queues und CLI

Bot-Updates, Queue-Jobs und CLI-Befehle sind begrenzte asynchrone Operationen. Die Beispiele erstellen einen Scope je Update, Job oder Befehl und nutzen `await using`, wenn die Funktion die gesamte Operation verantwortet.

Sie verwenden den gemeinsamen Graphen. Vergleiche die Arbeitseinheit, die jede Bibliothek dem Anwendungscode übergibt. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Beispiel | Inhalt |
|---|---|
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | Scope je Telegraf-Update |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | Scope je Grammy-Update |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | Scope je BullMQ-Job |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | Scope je Commander-Befehl |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | Scope je Yargs-Befehl |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

Datei im Repository: [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

Datei im Repository: [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

Datei im Repository: [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

Datei im Repository: [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

Datei im Repository: [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)

