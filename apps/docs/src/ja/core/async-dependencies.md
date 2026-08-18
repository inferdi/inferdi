# 非同期依存関係

`registerAsyncFactory` は明示的な async エッジを記録します。グラフは最終的なサービス型を保持し、宣言された async 依存を待機して、依存するクラスへ async 状態を伝播します。

## Promise モデルを選ぶ

Promise はサービス自体を表す場合と、サービスの初期化境界を表す場合があります。InferDI はそれぞれに別の契約を用意しています。

| API                                             | グラフの値                     | 注入される値                       | 解決方法         |
|-------------------------------------------------|---------------------------|------------------------------|--------------|
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>`       | 同じ identity の Promise オブジェクト | `get()`      |
| `registerAsyncFactory('db', connect, [])`       | `AsyncSpec` 内の `Database` | fulfilled `Database`         | `getAsync()` |

下流サービスが初期化済みの値を必要とする場合は `registerAsyncFactory` を使います。同期グラフに Promise 自体を置く場合だけ Promise-valued `registerFactory` を使ってください。

この違いはコンパニオン型にも適用されます。Promise-valued
`registerFactory` は `Lazy<Promise<T>>`、第 5 引数に `lazyKey` を渡した
宣言的 `registerAsyncFactory` は `AsyncLazy<T>` を生成します。ラッパー取得は同期処理なので、利用者へ async 状態を伝播しません。

## 非同期ファクトリーを登録する

次のグラフは root 用に database を 1 つ初期化し、認証済みスコープごとに session を 1 つ初期化します。宣言した依存に async 項目があれば、そのクラスも async になります。

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard belongs to the async graph
scope.get('dashboard')
```

root には `auth` 入力がないため、コンパイラは `root.getAsync('dashboard')` も拒否します。プロファイルの作成方法は[スコープ入力](./scope-inputs)を参照してください。

## 解決と非同期状態の伝播

`getAsync()` は準備済みの sync キーと async キーを受け取り、Promise を返します。同期 lookup、cycle、lifetime、disposal のエラーは rejected Promise になります。

InferDI は宣言した依存をタプル順に開始します。宣言的 async マーカーを持つ項目を待ってから、位置引数でファクトリーを呼び出します。互いに依存しない async 項目は同時に初期化できます。

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

callback はコンテナではなく値を受け取ります。そのため、TypeScript とランタイム preflight の両方が async エッジを認識できます。

`deps` が空でない場合は callback の各パラメーター型を注釈するか、既存のシグネチャを持つ関数を渡します。タプルはパラメーターの型と順序を検査しますが、contextual inference は提供しません。

## スケジューリングとキャッシュ

| ライフタイム      | 初期化                            | 所有権      |
|-------------|--------------------------------|----------|
| `singleton` | 所有コンテナ内の native Promise 1 つ    | 所有コンテナ   |
| `scoped`    | 解決するスコープごとに native Promise 1 つ | 解決するスコープ |
| `transient` | 呼び出しごとに新しい初期化                  | 呼び出し元    |

並行する呼び出しは singleton と scoped の初期化を共有します。キャッシュされた rejected Promise は失敗状態のままで、InferDI は retry しません。再試行が必要なら、アプリケーションのライフサイクルに合わせて新しいスコープを開くか root を再構築します。

`has()` は初期化を開始せずに登録だけを確認します。キーが同期であることは証明せず、不足しているスコープ入力も提供しません。

## AsyncLazy companion

第 5 引数に `lazyKey` を渡すと、宣言的な非同期対象を遅延できます。

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

ラッパーの作成は同期的なので、`AsyncLazy<T>` を注入したクラスはこの依存だけでは非同期になりません。ラッパーは解決元のコンテナーをキャプチャします。scoped 対象はそのスコープに残り、transient 対象は呼び出すたびに開始され、呼び出し側が所有します。

## リソース破棄と失敗

Singleton と scoped 登録は、fulfill 後も Promise をキャッシュに保持します。コンテナを非同期で破棄し、InferDI が初期化を待って解決済みリソースを検査できるようにします。

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

コンテナ所有の async リソースでは `await using`、`dispose()`、`Symbol.asyncDispose` を使えます。同期 `using` はキャッシュ済み Promise を展開できないため、誤用として報告します。

同期破棄はこのエラーをスローする前に、キャッシュ済みネイティブ Promise へ rejection observer を追加します。後から reject しても `unhandledRejection` にはなりません。Promise の完了は待たず、カスタム thenable も assimilate しません。

singleton または scoped の初期化が失敗すると、rejected Promise はキャッシュに残り、InferDI は自動で再試行しません。後続の依存が preflight 中に失敗しても、開始済みの初期化はキャッシュと所有権の状態を維持します。

依存の失敗は、複数のキャッシュ済み初期化 Promise へ伝播する場合があります。非同期破棄は同じ `Error` オブジェクトを一度だけ報告します。異なるオブジェクトは、同じメッセージでも別々の `AggregateError` cause として保持されます。

## 従来の Promise 値

`registerFactory` が返した Promise は同期サービス値のままです。その登録には `AsyncSpec` マーカーがないため、宣言的 async ファクトリーは同じ identity の Promise を受け取ります。

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

トップレベルの `getAsync('dbPromise')` は JavaScript の await セマンティクスに従い、`Database` へ解決されます。

## 動的な境界

- `registerAsyncFactory` には readonly の依存タプルを渡します。async キーを選ぶ可能性がある `registerClass` でも readonly が必要です。InferDI は async 位置を一度だけ分類し、タプル参照を保持します。inline literal は readonly として推論されます。
- 宣言的 cycle と cold lifetime 違反は同期 preflight 中に失敗します。Promise 境界の後で capture したコンテナを呼ぶと動的エッジになり、この分析の対象外です。
- `AsyncLazy<T>` は解決を遅延しますが、retry、cancellation、rollback は追加しません。
- 後の依存が preflight 中に失敗しても、先に始まった初期化はキャッシュと所有権の状態を維持します。開始済み async transient は teardown handle なしで動き続ける場合があります。
- `lazyKey` を持つ async クラスは `AsyncLazy<Class>`、sync/async mixed クラスは `Lazy<Class> | AsyncLazy<Class>` を生成します。
- Promise 境界後の `AsyncLazy.get()` による動的循環は、自身の cached pending Promise を待ち続ける可能性があります。

同期構築は[ファクトリー](./factories)、所有権モデルは[スコープとリソース破棄](./scopes)を参照してください。
