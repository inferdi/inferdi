# API-слои

В интеграциях с RPC и GraphQL создавайте один скоуп InferDI на весь HTTP-запрос. Отдельные процедуры и резолверы используют этот же скоуп.

Эти примеры используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Сравните, где интеграция создаёт скоуп и какой код отвечает за его освобождение.

| Пример | Что показывает |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` со скоупом на время всего HTTP-запроса |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | скоуп в контексте Apollo Server для выполнения без стриминга |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | скоуп в контексте GraphQL Yoga для выполнения без стриминга |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Файл в репозитории: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Файл в репозитории: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Файл в репозитории: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
