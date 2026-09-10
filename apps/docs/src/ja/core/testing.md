# テストとオーバーライド

## サービスを直接テストする

ビジネスサービスは普通の値を受け取るため、単体テストにコンテナーは不要です。

```ts
type Logger = { info(message: string): void }
type Database = { findUser(id: string): { id: string } | undefined }

class UserRepo {
  constructor(readonly logger: Logger, readonly db: Database) {}

  find(id: string) {
    this.logger.info(`find ${id}`)
    return this.db.findUser(id)
  }
}

const messages: string[] = []
const repo = new UserRepo(
  { info: (message) => messages.push(message) },
  { findUser: (id) => ({ id }) }
)

expect(repo.find('42')).toEqual({ id: '42' })
expect(messages).toEqual(['find 42'])
```

アプリケーションの依存グラフ自体を検証するときは、統合テストでコンテナーを使います。

## 組み立てたグラフをテストする

テストで既存の登録をモックに置き換える必要がある場合は、`.override()` を使用します。

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

オーバーライドの値は、元々登録された型に代入可能でなければなりません。存在しないキーや互換性のないモックは TypeScript エラーになります。

## 型付き Provider

`Container.Providers<C>` は構築済みコンテナーの型を Provider 関数の集合へ変換します。テストヘルパーは本番グラフを解決せずにモックを作成できます。

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

管理対象の遅延 companion を含め、登録済みサービスの具体的な型が保持されます。`declareScopeInputs()` だけで宣言したキーは `createScope(inputs)` から渡すため、この map には含まれません。これらの Provider は自動登録されず、所有権もテスト側に残ります。

## オーバーライドのタイミング

依存関係グラフを解決する前にオーバーライドを適用してください:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

2 行目は、singleton 値がこのコンテナのローカルキャッシュにすでに存在するため例外をスローします。このガードは意図的にキャッシュだけを確認し、現在のスコープにキャッシュされた scoped 値、`registerValue`、および 2 回目のオーバーライドも検出します。変更可能な strict モードでは、transient の解決や、子コンテナ経由で解決された祖先所有の値はローカルにキャッシュされないため追跡されません。固定 scope は委譲された singleton をローカルキャッシュへ反映でき、起動後の変更をサポートしません。すでに返された transient は呼び出し側に残り、以後の解決はモックを返します。これは遅いオーバーライドを推奨するものではありません。グラフの分裂を避けるため、すべてのオーバーライドをグラフの解決前に適用してください。

## 所有権

オーバーライドの値は外部によって所有されます。`registerValue` と同様に、オーバーライドはコンテナの破棄キューに追加されません。クリーンアップはテストフィクスチャが所有します。

## スコープの局所性

オーバーライドは、呼び出されたコンテナのみを変更します:

```ts
const scope = root.createScope().override('db', mockDb)
```

ルートおよび兄弟スコープは変更されません。親レベルのオーバーライドは、通常の親ルックアップを通じて参照できます。
