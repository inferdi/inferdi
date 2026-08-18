# ライフタイム

InferDI には 3 つのライフタイムがあります:

| 種類          | 生成タイミング       | キャッシュ先   | コンテナによる破棄 |
|-------------|---------------|----------|-----------|
| `singleton` | 所有コンテナごとに 1 回 | 所有コンテナ   | あり        |
| `scoped`    | 子スコープごとに 1 回  | 子スコープ    | あり        |
| `transient` | 解決のたびに        | キャッシュしない | なし        |

デフォルトの `{fast: false}` では、ルートコンテナから `scoped` キーを解決すると `Scoped "key" cannot be resolved from the root container. Use createScope().` がスローされます。scoped サービスは `createScope()` が返した子コンテナから解決してください。

## ライフタイムのルール

シングルトンは `scoped` または `transient` なサービスに直接依存することはできません。シングルトンは 1 回だけ生成され、すべてのリクエストで共有されます。そのため、スコープドな値 — 現在のリクエストのコンテキスト、ユーザー、トランザクション — をキャプチャしてしまうと、その 1 つのリクエストの状態が他のすべてのリクエストへ静かに漏れ出します。InferDI は、このようなケースをコードレビューに委ねるのではなく、型システム上で表現不可能にします。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

この登録は TypeScript によって拒否されます。`fast: false` では、キャストが型システムを回避した場合でも、同じ形がランタイムで拒否されます。

宣言したスコープ入力は scoped 依存として扱われます。request、認証コンテキスト、tenant、job payload を読む利用者は `scoped` または `transient` で登録してください。singleton 利用者はコンパイル時に拒否されます。詳しくは[スコープ入力](./scope-inputs)を参照してください。

## 既定の実行時チェック

`fast` のデフォルトは `false` です。グラフを可変に保ち、次のものを捕捉します:

- ルートコンテナからの scoped キーの直接解決
- キャストによって持ち込まれた singleton から scoped、または singleton から transient への違反
- キャプチャされた外側のコンテナによるファクトリーのリーク
- 同期的なシングルトンの循環
- 同期的なトランジェントの循環
- 静的チェックを回避する動的キーの誤用

```ts
const root = new Container()
const explicitRoot = new Container({ fast: false })
```

## `fast: true`

`fast: true` は、テストによってグラフの形が証明された後にのみ使用してください:

```ts
const root = new Container({ fast: true })
```

このオプションは型レベルの契約を維持したまま、実行時の循環とライフタイムの記録を取り除きます。起動後のコンテナーツリーは固定とみなされ、ルートの scoped ガードも省略されます。

開発とテストでは `fast: false` を使ってください。検証済みで不変のプロダクショングラフだけを `fast: true` に切り替えます。実行時のトレードオフと起動規則は[パフォーマンス](../guide/performance#fast-true)を参照してください。
