# API Layers

RPC and GraphQL integrations should create one InferDI scope per HTTP request, not per procedure or per resolver.

These examples share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compare where each integration creates the scope and which boundary owns disposal.

| Example | Shows |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` scoped around a whole HTTP request |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | Apollo Server context scope for non-streaming execution |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | GraphQL Yoga context scope for non-streaming execution |

## tRPC

<<< ../../../../../examples/api-layers/trpc.ts

Repository file: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../examples/api-layers/apollo-server.ts

Repository file: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../examples/api-layers/graphql-yoga.ts

Repository file: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
