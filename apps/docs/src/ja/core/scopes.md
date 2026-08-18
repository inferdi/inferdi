# スコープとリソース破棄

スコープは、リクエストローカルなサービスのライフタイムを 1 つの作業単位に限定します。子スコープはすべての親の登録を継承しますが、自身のスコープドなインスタンスをキャッシュし、そのクリーンアップを所有します。そのため、あるリクエストのために生成されたスコープが、別のリクエストと状態を共有したり、それより長く存続したりすることはありません。

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` はルートの singleton です。request は外部のスコープ入力としてアプリケーションが所有し、`handler` はリクエストスコープが生成して破棄します。

`scoped` 登録は子スコープに属します。既定の `fast: false` でルートから解決すると、`Scoped "key" cannot be resolved from the root container. Use createScope().` がスローされます。`createScope()` が返したコンテナーからキーを解決してください。`fast: true` はこの実行時ガードを省略します。

## スコープ入力

Scope input は、スコープを開くときに存在する外部値を表します。対象には request、認証コンテキスト、tenant、job データなどがあります。先に宣言し、必要な部分を `createScope(inputs)` で渡します。

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

コンテナー型は提供済み input を記録し、準備が整うまで依存サービスを隠します。名前付きプロファイル、nested refinement、依存キー付き factory、再利用型、入力検証の規則は[スコープ入力](./scope-inputs)を参照してください。

## 所有権

各コンテナは、自身が生成したインスタンスのみを破棄します。

| インスタンス | 所有者 |
| --- | --- |
| ルートに登録されたシングルトン（子から解決した場合も含む） | ルートコンテナ |
| 子コンテナに登録されたシングルトン | その子コンテナ |
| スコープドなサービス | リクエストスコープ |
| トランジェント | 呼び出し元 |

`root.dispose()` は、すでに生成された子スコープへカスケードしません。スコープはそれぞれのライフサイクルの境界で破棄してください。

## ネイティブのリソース管理

Container は両方の破棄シンボルを実装しています:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

所有するリソースのいずれかが非同期になりうる場合は、`await using` または `await container.dispose()` を使用してください。

## 破棄のプロトコル

所有するインスタンスは、生成と逆の順序で破棄されます。コンテナは次の順で調べます:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

複数の破棄処理が失敗した場合、InferDI はそれらを `AggregateError` にまとめます。これにより、1 つの不正なクリーンアップが、後続のリソースのクローズを妨げることはありません。
