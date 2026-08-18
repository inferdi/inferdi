# 例

アプリケーションが所有するライフサイクル境界を選び、そのエコシステムでスコープを作成、公開、破棄する方法を比較してください。各グループは [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples) のディレクトリに対応します。

## ここから始める

まず [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を読んでください。ほとんどのサーバーサイドの例はこのビルダーをインポートしており、各ファイルはフレームワークの配線に集中できます。

| グループ                                                  | 比較する内容                                                                          |
|-------------------------------------------------------|---------------------------------------------------------------------------------|
| [JavaScript での使用](/ja/guide/examples/javascript)      | Node ESM、Node CommonJS、そしてブラウザのバンドラーでの使用                                        |
| [バックエンドフレームワーク](/ja/guide/examples/backend)           | Fastify、Hono、Koa、Express、そして Elysia のリクエストスコープアダプター                             |
| [API レイヤー](/ja/guide/examples/api-layers)             | tRPC、Apollo Server、そして GraphQL Yoga のリクエストスコープ境界                                |
| [フルスタックフレームワーク](/ja/guide/examples/fullstack)         | Next.js App Router と Remix の loader/action スコープ                                 |
| [ランタイムとエッジプラットフォーム](/ja/guide/examples/runtimes-edge) | Node HTTP、Bun、Deno、Cloudflare Workers、Vercel Edge、Deno Deploy、そして Supabase Edge |
| [フロントエンドフレームワーク](/ja/guide/examples/frontend)         | React、React Native、Vue、そして Svelte の機能スコープ                                       |
| [ボット、キュー、そして CLI](/ja/guide/examples/workers-cli)     | Telegraf、Grammy、BullMQ、Commander、そして Yargs の操作スコープ                              |

## グループの読み方

サーバーサイドの例では、アプリケーションのグラフとして `examples/_shared/container.ts` を使用します。グループのページはライフサイクルの所有に焦点を当てています。すなわち、スコープがどこで作成され、どこで公開され、どこで破棄されるかです。

サーバーサイドとワーカーの例では、フレームワーク／プラットフォームのライフサイクルフックを比較してください。フロントエンドの例では、マウントとアンマウントの境界を比較してください。

::: info 参照スニペット
ルート workspace はすべてのフレームワーク依存をインストールせず、`examples/` の型チェックも行いません。必要なパターンをアプリケーションへコピーし、依存パッケージを追加して、共有グラフを自身の型に合わせてください。
:::
