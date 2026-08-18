# クイックスタート

この手順では、依存グラフ全体を構築し、ルートサービスを解決したあと、リクエストスコープを開きます。デコレーターやメタデータの設定は不要です。

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

```ts
import { Container } from '@inferdi/inferdi'

type RequestContext = {
  requestId: string
}

class Logger {
  info(message: string) {
    console.info(message)
  }
}

class Database {
  constructor(readonly dsn: string) {}
}

class UserService {
  constructor(
    private readonly request: RequestContext,
    private readonly database: Database,
    private readonly logger: Logger
  ) {}

  find(id: string) {
    this.logger.info(`request=${this.request.requestId} user=${id}`)
    return { id, database: this.database.dsn }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, ['dsn'])
  .registerClass(
    'users',
    UserService,
    ['request', 'database', 'logger'],
    'scoped'
  )
```

各依存タプルはコンストラクターと照合されます。`database` と `logger` の順序を入れ替える、`request` を省く、未登録キーを指定すると、TypeScript エラーになります。

このグラフには 1 つの外部入力と 4 つの登録があります。

```text
dsn ───────────────▶ database (singleton) ─┐
logger (singleton) ────────────────────────┼─▶ users (scoped)
request (scope input) ─────────────────────┘
```

## サービスを解決する

ルートの singleton は `.get()` で同期的に解決できます。

```ts
const database = root.get('database')
```

`users` には `request` 入力が必要なので、先にスコープを開きます。

```ts
const request = { requestId: crypto.randomUUID() }

await using scope = root.createScope({ request })
const users = scope.get('users')

users.find('42')
```

返されたスコープの型には、`request` が準備済みであることが記録されます。ルートにはリクエスト入力がないため、`root.get('users')` は型エラーになります。

## ライフタイムを選ぶ

登録の既定値は `singleton` です。値がスコープまたは呼び出し側に属する場合は、ライフタイムを明示します。

| ライフタイム      | 作成           | キャッシュ     | 破棄する側   |
|-------------|--------------|-----------|---------|
| `singleton` | 1 回          | 作成したコンテナー | そのコンテナー |
| `scoped`    | 子スコープごとに 1 回 | 子スコープ     | そのスコープ  |
| `transient` | 解決するたび       | なし        | 呼び出し側   |

singleton は scoped または transient サービスへ直接依存できません。InferDI はこの規則を型で検証し、既定では実行時にも確認します。

## 次に読むページ

| 目的 | ページ |
| --- | --- |
| コンパイル時のグラフ検証を理解する | [型安全性](../core/type-safety) |
| リクエスト、テナント、ジョブデータをモデル化する | [スコープ入力](../core/scope-inputs) |
| 依存関係を非同期に初期化する | [非同期依存関係](../core/async-dependencies) |
| データベースなどのリソースを安全に閉じる | [スコープとリソース破棄](../core/scopes) |
| スコープを Web フレームワークへ接続する | [フレームワークアダプター](../adapters/) |
| フレームワークとランタイムの完全な例を見る | [例](./examples) |
