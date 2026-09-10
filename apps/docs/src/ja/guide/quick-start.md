# クイックスタート

まずは通常のクラス 2 つと、明示的な構成チェーンで小さなグラフを作ります。リクエストスコープは基本を確認してから追加します。

## インストール

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## グラフを構築する

<<< ../../../snippets/quick-start-sync.ts

`UserService` は InferDI をインポートしません。構成コードが `Logger` を選び、登録に名前を付け、コンストラクター引数の順序を記述します。返された `root` の型には両方のサービスが含まれます。

コンストラクターを変更してグラフを更新し忘れると、アプリケーションを組み立てる場所でエラーになります。

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class UserService {
  constructor(readonly logger: Logger, readonly region: string) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger']) // [!code error]
```

これがグラフ型状態の実際の働きです。登録がコンテナー型を絞り込み、後続の操作は宣言済みグラフに適合しなければなりません。

## サービスを解決する

`root.get('users')` は `UserService` を同期的に返します。デフォルトのライフタイムは `singleton` なので、2 回目以降はキャッシュ済みインスタンスを返します。

リクエストデータには短い境界が必要です。スコープ入力として宣言し、子スコープを開くときに渡します。

<<< ../../../snippets/quick-start-scope.ts

リクエスト処理が失敗しても、`finally` が子スコープを閉じます。`scope.dispose()` はスコープ所有の `RequestLog` を破棄し、渡された `request` はアプリケーション所有のままです。TypeScript ツールチェーンが Explicit Resource Management を扱える場合は、同じ処理を `await using` でも書けます。

## ライフタイムを選ぶ

| ライフタイム | インスタンス生成 | キャッシュ所有者 | 破棄する側 |
|---|---|---|---|
| `singleton` | 登録所有者ごとに 1 回 | ルートまたは登録所有者 | そのコンテナー |
| `scoped` | 解決するスコープごとに 1 回 | 子スコープ | そのスコープ |
| `transient` | 解決のたび | なし | 呼び出し側 |

`registerValue`、`.override()`、スコープ入力で渡した値もアプリケーション所有です。シングルトンはスコープドまたはトランジェントなサービスへ直接依存できません。InferDI は型で拒否し、デフォルトの実行時契約でも再検査します。

## 次に読むページ

[InferDI を選ぶ理由](./why-inferdi)で設計上の判断を確認し、[型安全性](../core/type-safety)でグラフ検査を詳しく見てください。[スコープとリソース破棄](../core/scopes)は所有権を、[フレームワークアダプター](../adapters/)はアプリケーションのライフサイクルとの接続を説明します。
