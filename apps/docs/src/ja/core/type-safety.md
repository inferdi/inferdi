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

一意性ガードは、キー型が表す候補値の集合全体を検査します。`'dsn'` の登録後に候補キーが `'dsn' | 'replica'` 型なら、ランタイム値が `'dsn'` を上書きする可能性があるため TypeScript は呼び出しを拒否します。広い `string` / `symbol` 型にも同じ規則が適用されます。`lazyKey` は主キーおよび既存キーのどちらとも重複できません。

候補値がグラフと重複しない broad キーや union キーは使用できます。広い `string` 型は、空のコンテナか symbol キーだけを含むコンテナに登録できます。ランタイムキーを新しい候補へ絞り込んでから登録し、置き換える場合は `.override()` を使用してください。

## 動的キー

静的キーは `.get()` で直接検証されます。実行時に得たキーは、先に `.has()` で型を絞り込みます。

```ts
const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

上の具体的なグラフには不足しているスコープ入力がなく、`.getAsync()` は同期・非同期モードにかかわらず、どちらの登録済みキーも受け付けます。`.has()` が証明するのは登録だけです。破棄済みのコンテナーでは `false` を返しますが、スコープ入力の準備状態やキーを `.get()` に渡せるかどうかは保証しません。

## 型に含まれるライフタイム

各エントリーは、値の型とそのライフタイムの種類の両方を保持します。型システムは依存関係をフィルタリングし、シングルトンがスコープドまたはトランジェントなサービスに直接依存できないようにします。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

ランタイムの strict モードは、`as` キャスト、動的キー、キャプチャされた外側のコンテナ、依存関係の循環に対する多層防御として残ります。

## 準備状態と async 状態

グラフ型はスコープ入力の要件と宣言的 async 登録も記録します。入力が提供されるまでキーは `.get()` から除外され、`AsyncSpec` キーとそれに依存するクラスは `.getAsync()` で解決します。

```ts
const root = new Container()
  .declareScopeInputs<{request: Request}>()
  .registerAsyncFactory('db', openDatabase, [])
  .registerClass('handler', Handler, ['request', 'db'], 'scoped')

const scope = root.createScope({request})

// @ts-expect-error: handler is async
scope.get('handler')

await scope.getAsync('handler')
```

準備状態は[スコープ入力](./scope-inputs)、Promise 契約の選択は[非同期依存関係](./async-dependencies)を参照してください。
