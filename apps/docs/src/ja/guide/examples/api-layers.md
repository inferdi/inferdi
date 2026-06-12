# API レイヤー

RPC や GraphQL の統合では、プロシージャごとやリゾルバーごとではなく、HTTP リクエストごとに 1 つの InferDI スコープを作成すべきです。

これらの例は [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。各統合がどこでスコープを作成し、どの境界が破棄を所有するかを比較してください。

| 例 | 内容 |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | HTTP リクエスト全体にスコープを設定した tRPC の `fetchRequestHandler` |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | 非ストリーミング実行のための Apollo Server コンテキストスコープ |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | 非ストリーミング実行のための GraphQL Yoga コンテキストスコープ |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

リポジトリのファイル: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

リポジトリのファイル: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

リポジトリのファイル: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
