# バッドプラクティス

`register*` を呼び出した後は、そのメソッドが返したコンテナ参照を使い続けてください。古い参照は同じランタイムコンテナを指していても、古いグラフ型を保持しています。

## 古い参照を再利用する

各 `register*` メソッドはコンテナを変更し、拡張されたジェネリック型を持つ同じオブジェクトを返します。TypeScript は戻り値の型を拡張しますが、呼び出し前に作られた参照の型は変更しません。

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// base の型は Container<{}> のままなのでコンパイルできます。
base.registerAsyncFactory('dependency', async () => 2, [])

// TypeScript は number と判断しますが、新しい登録は Promise<number> を渡します。
syncGraph.get('consumer').dependency
```

`base` と `syncGraph` は同じオブジェクトを指します。最後の呼び出しは `dependency` のランタイム登録を上書きしますが、`syncGraph` の型は元の同期グラフを表したままです。上書き前に登録されたクラスも以前の依存関係分類を保持します。

## コンパイラが許可する理由

重複キーの検査は、現在の参照が持つグラフ型のキーを使います。`syncGraph` の型には `dependency` が含まれるため、`syncGraph` から同じキーを登録すると型エラーになります。`base` の型は `Container<{}>` のままで、`keyof T` は `never` です。

TypeScript は、可変オブジェクトを指すすべての別名についてジェネリック引数を更新しません。また、登録後の `base` を使用済みとして扱える linear type や affine type もありません。InferDI は古い参照を追跡するための registry 検索を各登録に追加しません。この検査は、正しく構築されたグラフにもコストを加えるためです。

## 最新の戻り値を使う

1 本の呼び出しチェーンでグラフを構築し、その結果を使います。

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

`register*` の戻り値を無視して、古い参照から登録を続けないでください。モジュールも最後の登録が返したコンテナを返す必要があります。[モジュール](./modules)も参照してください。

## `register*` を置き換え API として使わない

本番用グラフを構築するときは、各キーの実装を一度だけ選びます。設定に応じて実装を選ぶ場合は、通常の条件分岐か `.use()` を使ってください。

テストでは、置き換え後も元のライフタイム、遅延モード、非同期モードを保てる場合に限り、解決前に `.override()` を使用できます。`.override()` で同期登録を宣言的な非同期登録へ変換することはできません。[テストとオーバーライド](./testing)も参照してください。

## ビジネスロジックでの Service Locator

ドメインサービスへコンテナーを渡すと本当の依存関係が隠れ、キー不足の失敗が呼び出し箇所まで遅れます。サービス自体を渡してください。

```ts
class UserController {
  constructor(
    private readonly container: AppContainer // [!code --]
    private readonly users: UserRepo // [!code ++]
  ) {}

  show(id: string) {
    return this.container.get('users').find(id) // [!code --]
    return this.users.find(id) // [!code ++]
  }
}
```

組み立てコードで必要な resolver-aware factory は構成ルートに置きます。

## グローバルなリクエストスコープ

変更可能なグローバルスコープは、並行する別のリクエストへ値を漏らす可能性があります。リクエスト境界の中で作成して閉じてください。

```ts
let currentScope = root.createScope({ request }) // [!code warning]

async function handle(request: Request) {
  const scope = root.createScope({ request }) // [!code focus]
  try {
    return await scope.getAsync('handler')
  } finally {
    await scope.dispose()
  }
}
```

フレームワークアダプターは同じ所有権規則を保ったまま、この境界を自動化します。

## 具体的なコンテナー型を失う

`Container` という注釈は蓄積したグラフ状態を消します。builder の戻り値を推論させ、そこから alias を作ります。

```ts
const buildContainer = (): Container => new Container() // [!code --]
const buildContainer = () => new Container() // [!code ++]
  .registerClass('users', UserRepo, [])

type AppContainer = ReturnType<typeof buildContainer>
```

アプリケーションが所有するコンテナーとスコープの alias には `ReturnType` を使い、generic arguments を手作業で再現しないでください。

## 所有権を失う

対応する cleanup なしでスコープを作ると、所有する scoped インスタンスが解放されません。作成と同じライフサイクル境界で cleanup します。

```ts
const scope = root.createScope({ request }) // [!code warning]
return scope.get('handler').run()

await using ownedScope = root.createScope({ request }) // [!code focus]
return ownedScope.get('handler').run()
```

toolchain が `await using` を使えない場合は、`try/finally` と `await scope.dispose()` を使います。values、overrides、scope inputs、transient の結果は呼び出し元が所有し、それぞれの cleanup 方針が必要です。
