# フルスタックフレームワーク

フルスタックの例では、ローダー、アクション、ルートハンドラー、サーバーアクションにスコープを使用します。開発ビルドでは、HMR 中のクライアント重複を避けるためにルートを `globalThis` にキャッシュします。

どちらの例も [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) を共有しています。各フレームワークが await する操作の境界を比較してください。

| 例 | 内容 |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Next.js App Router のリクエストおよび Server Action のスコープ境界 |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Remix のローダーおよびアクションのスコープ境界 |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

リポジトリのファイル: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

リポジトリのファイル: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
