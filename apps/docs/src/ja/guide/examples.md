# 例

リポジトリは例を GitHub 限定の参照スニペットとして保持しています。ルートパッケージはそれらのフレームワーク依存をインストールせず、`examples/` ディレクトリの型チェックも行わず、npm にも公開しません。

該当するパターンをアプリケーションにコピーし、そこでフレームワークの依存をインストールしてください。

以下の各グループは [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples) 内の 1 つのディレクトリに対応しています。グループのページを開くと、そのグループ内の例を 1 ページで比較できます。

## ここから始める

まず [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を読んでください。ほとんどのサーバーサイドの例はこのビルダーをインポートしており、各ファイルはフレームワークの配線に集中できます。

| グループ | 比較する内容 |
| --- | --- |
| [JavaScript での使用](/ja/guide/examples/javascript) | Node ESM、Node CommonJS、そしてブラウザのバンドラーでの使用 |
| [バックエンドフレームワーク](/ja/guide/examples/backend) | Fastify、Hono、Koa、Express、そして Elysia のリクエストスコープアダプター |
| [API レイヤー](/ja/guide/examples/api-layers) | tRPC、Apollo Server、そして GraphQL Yoga のリクエストスコープ境界 |
| [フルスタックフレームワーク](/ja/guide/examples/fullstack) | Next.js App Router と Remix の loader/action スコープ |
| [ランタイムとエッジプラットフォーム](/ja/guide/examples/runtimes-edge) | Node HTTP、Bun、Deno、Cloudflare Workers、Vercel Edge、Deno Deploy、そして Supabase Edge |
| [フロントエンドフレームワーク](/ja/guide/examples/frontend) | React、React Native、Vue、そして Svelte の機能スコープ |
| [ボット、キュー、そして CLI](/ja/guide/examples/workers-cli) | Telegraf、Grammy、BullMQ、Commander、そして Yargs の操作スコープ |

## グループの読み方

サーバーサイドの例では、アプリケーションのグラフとして `examples/_shared/container.ts` を使用します。グループのページはライフサイクルの所有に焦点を当てています。すなわち、スコープがどこで作成され、どこで公開され、どこで破棄されるかです。

サーバーサイドとワーカーの例では、フレームワーク／プラットフォームのライフサイクルフックを比較してください。フロントエンドの例では、マウントとアンマウントの境界を比較してください。
