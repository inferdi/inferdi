# ランタイムとエッジプラットフォーム

ランタイムの例では、モジュールレベルのルートを使用し、リクエストごとに 1 つのスコープを作成します。境界が明確なハンドラーでは `await using` を使用できます。ストリーミングやバックグラウンドの処理では、その処理が完了した後に破棄すべきです。

ほとんどの例は [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。Cloudflare Workers と Supabase Edge Functions は、プラットフォーム binding を使うローカルなコンテナーグラフを構築します。

| 例 | 内容 |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | レスポンスのクリーンアップを伴う低レベルな Node HTTP ライフサイクル |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Bun `serve` のリクエストスコープ |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Deno HTTP のリクエストスコープ |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Wrangler が生成した binding 型、D1、Queues、エラー処理付き `ctx.waitUntil` |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Vercel Edge のリクエストスコープとバックグラウンドのクリーンアップ |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | `Deno.ServeHandlerInfo.completed` による Deno Deploy のクリーンアップ |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | カスタムファクトリーの差し替えを用いた Supabase Edge Functions |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

リポジトリのファイル: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

リポジトリのファイル: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

リポジトリのファイル: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

`wrangler.jsonc` で `DB` と `AUDIT_QUEUE` binding を設定し、`pnpm wrangler types` を実行してください。この例は生成された `Env` interface を使い、バックグラウンド処理からリクエストスコープを切り離します。

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

リポジトリのファイル: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

リポジトリのファイル: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

リポジトリのファイル: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

リポジトリのファイル: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
