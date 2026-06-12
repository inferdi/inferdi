# API-слои

RPC- и GraphQL-интеграции должны создавать один InferDI scope на HTTP-запрос, а не отдельный scope на procedure или resolver.

Эти примеры используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Сравнивайте, где интеграция создаёт scope и какая граница отвечает за dispose.

| Пример | Что показывает |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` со scope вокруг всего HTTP-запроса |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | scope в контексте Apollo Server для выполнения без стриминга |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | scope в контексте GraphQL Yoga для выполнения без стриминга |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Файл в репозитории: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Файл в репозитории: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Файл в репозитории: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
