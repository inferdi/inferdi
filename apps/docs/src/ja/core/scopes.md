# スコープとクリーンアップ

スコープは、リクエストローカルなサービスのライフタイムを 1 つの作業単位に限定します。子スコープはすべての親の登録を継承しますが、自身のスコープドなインスタンスをキャッシュし、そのクリーンアップを所有します。そのため、あるリクエストのために生成されたスコープが、別のリクエストと状態を共有したり、それより長く存続したりすることはありません。

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` はルートのシングルトンです。`request` はスコープごとに 1 回生成され、スコープが破棄されるときに破棄されます。

## 所有権

各コンテナは、自身が生成したインスタンスのみを破棄します。

| インスタンス | 所有者 |
| --- | --- |
| ルートのシングルトン | ルートコンテナ |
| スコープドなサービス | リクエストスコープ |
| 子で最初に解決されたシングルトン | その子コンテナ |
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
