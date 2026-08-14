# API 层

RPC 和 GraphQL 集成应该为每个 HTTP 请求创建一个 InferDI 作用域，而不是为每个过程（procedure）或每个解析器（resolver）创建。

这些示例共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。请对比每种集成在何处创建作用域，以及由哪个边界负责释放。

| 示例 | 展示内容 |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` 围绕整个 HTTP 请求设置作用域 |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | 针对非流式执行的 Apollo Server context 作用域 |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | 针对非流式执行的 GraphQL Yoga context 作用域 |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

仓库文件：[`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

仓库文件：[`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

仓库文件：[`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
