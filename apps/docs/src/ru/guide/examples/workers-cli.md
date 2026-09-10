# Боты, очереди и CLI

Обработка входящего события бота, задания из очереди или CLI-команды имеет определённое начало и конец. Примеры создают отдельный скоуп на каждую такую операцию и используют `await using`, когда функция отвечает за всю работу от начала до завершения.

Они используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Сравнивайте единицу работы, которую библиотека передаёт коду приложения.

| Пример | Что показывает |
| --- | --- |
| [`telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts) | скоуп на обновление в Telegraf |
| [`grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts) | скоуп на обновление в Grammy |
| [`bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts) | скоуп на задание в BullMQ |
| [`commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts) | скоуп на команду в Commander |
| [`yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts) | скоуп на команду в Yargs |

## Telegraf

<<< ../../../../../../examples/workers-cli/telegraf.ts

Файл в репозитории: [`examples/workers-cli/telegraf.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/telegraf.ts)

## Grammy

<<< ../../../../../../examples/workers-cli/grammy.ts

Файл в репозитории: [`examples/workers-cli/grammy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/grammy.ts)

## BullMQ

<<< ../../../../../../examples/workers-cli/bullmq.ts

Файл в репозитории: [`examples/workers-cli/bullmq.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/bullmq.ts)

## Commander

<<< ../../../../../../examples/workers-cli/commander.ts

Файл в репозитории: [`examples/workers-cli/commander.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/commander.ts)

## Yargs

<<< ../../../../../../examples/workers-cli/yargs.ts

Файл в репозитории: [`examples/workers-cli/yargs.ts`](https://github.com/inferdi/inferdi/blob/main/examples/workers-cli/yargs.ts)
