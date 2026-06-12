# 型安全性

InferDI の中心的なルール: 依存関係グラフは型システムの中に存在します。不正なグラフ — 引数の順序の誤り、登録されていないキー、スコープドな状態に手を伸ばすシングルトン — は、負荷がかかってはじめて発見されるスタックトレースではなく、エディター上で確認できる型エラーです。コンパイラが静的に証明できるものはすべて静的に検証されます。ランタイムガードは、`as` キャストや動的キーがすり抜けてしまうものを捕捉するためにのみ存在します。

## コンストラクターのシグネチャ

`registerClass` は、依存関係のタプルをコンストラクターのパラメーターリストと照合します。

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

コンストラクターが変われば、登録もそれに伴って変わります。`['db', 'logger']` への入れ替えは、最初のコンストラクターパラメーターが `Logger` を期待しているため拒否されます。

## キーの一意性

すべての登録は、拡張されたコンテナ型を返します。フルーエント API を通じて同じキーを再登録することは拒否されます:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

置き換えが意図的である場合、テストでは `.override()` を使用します。

## 型に含まれるライフタイム

各エントリーは、値の型とそのライフタイムの種類の両方を保持します。型システムは依存関係をフィルタリングし、シングルトンがスコープドまたはトランジェントなサービスに直接依存できないようにします。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

ランタイムの strict モードは、`as` キャスト、動的キー、キャプチャされた外側のコンテナ、依存関係の循環に対する多層防御として残ります。
