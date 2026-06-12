# インストール

InferDI は、一致するパッケージ名と一致するバージョンで npm および JSR に公開されています。Node と Bun には npm 互換のインストールを、Deno や TypeScript ソースを好むランタイムには JSR を使用してください。

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

直接インポートすることもできます。

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## 要件

| ランタイム | 要件 |
| --- | --- |
| Node.js | コアパッケージには 16 以降 |
| Bun | 1.0 以降 |
| Deno | 1.40 以降 |
| TypeScript | `using` / `await using` 構文には 5.2 以降を推奨 |

ネイティブの `Symbol.dispose` および `Symbol.asyncDispose` より前の Node バージョンでは、InferDI はインポート時にシンボルのポリフィルをインストールするため、Explicit Resource Management の相互運用が引き続き機能します。

## アダプターのインストール

コアパッケージ、アダプターパッケージ、そしてフレームワークの peer をインストールします。

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

各アダプターには、そのライフサイクルのルールと型のセットアップを解説した専用ページがあります。
