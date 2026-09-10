# 型安全性

InferDI は宣言された依存グラフをコンテナーの型に保持します。登録するたびに、キー、サービス型、ライフタイム、同期・非同期状態、スコープ入力の要件が追加されます。以降の呼び出しは、蓄積されたグラフの型状態に対して検査されます。

## コンストラクターのシグネチャ

`registerClass` は、依存キーとコンストラクター引数を位置と構造的代入可能性の両方で照合します。

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

2 つの依存は公開構造が異なるため、順序を入れ替えると実際にエラーになります。

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript は構造的型付けを採用しています。空のクラス同士や公開メンバーが同じクラス同士は代入可能なので、意味上の順序までは判別できません。契約ごとに異なる構造を持たせてください。同じ構造の値を区別する必要がある場合は、[Symbol キー](./symbol-keys#same-value-shape)で説明するブランド型を使います。

## キーの一意性

チェーン上の各登録は、グラフ型が広がったコンテナーを返します。登録済みキーを再登録するとエラーになります。

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

テストで意図的にサービスを差し替える場合は `.override()` を使います。登録のたびに返されたコンテナーを使ってください。古い参照には後続ノードのグラフ状態がありません。[バッドプラクティス](./bad-practices#stale-builder-references)に具体例があります。

一意性チェックはキー型が表すすべての候補を調べます。`'dsn'` の登録後、`'dsn' | 'replica'` 型の候補は実行時に `'dsn'` を上書きし得るため拒否されます。既知のグラフと重ならない広い `string` や `symbol` も使えますが、キーを広げるほどグラフ型の精度は下がります。

## 動的キー

リテラルキーは `.get()` が直接検査します。実行時に得たキーは `.has()` で絞り込みます。

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` が証明するのは登録だけです。不足しているスコープ入力の準備状態や、非同期キーを同期 `.get()` に渡せることまでは証明しません。

## 型に含まれるライフタイム

各エントリーはライフタイムを記録します。シングルトンはスコープドまたはトランジェントな依存を保持できません。

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

デフォルトの実行時契約も循環とライフタイムを検査し、キャスト、動的キー、外側のコンテナー参照を捕捉します。`{ fast: true }` は実行時検査を減らした固定グラフ向けの別契約です。

## 準備状態と async 状態

スコープ入力と宣言的な非同期依存は、キーの準備状態と `.get()` / `.getAsync()` の選択にも反映されます。

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

ルートには `request` がありません。スコープ内の `handler` は準備済みでも、`database` に依存するため非同期のままです。続けて[スコープ入力](./scope-inputs)と[非同期依存関係](./async-dependencies)を読んでください。
