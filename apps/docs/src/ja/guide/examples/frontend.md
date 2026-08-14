# フロントエンドフレームワーク

フロントエンドの例では、ページ、ルート、画面、または機能の境界でスコープを作成します。サーバーサイドの共有モジュールをインポートする代わりに、それぞれが小さな独自のビルダーを保持します。

各フレームワークがどこでスコープを作成し、どのようにスコープを子に提供し、アンマウント時にどのようにクリーンアップを実行するかを比較してください。

| 例 | 内容 |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | 遅延 `useState` とクリーンアップを伴う React の機能スコープ |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | React Native の画面スコープ |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Vue 3 の provide/inject によるスコープ境界 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Svelte の context によるスコープ境界 |

## React

<<< ../../../../../../examples/frontend/react.tsx

リポジトリのファイル: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

リポジトリのファイル: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

リポジトリのファイル: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

リポジトリのファイル: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
