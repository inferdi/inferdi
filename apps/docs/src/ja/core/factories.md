# ファクトリー

生成処理が `new Ctor(...deps)` だけなら `registerClass` を使います。設定の参照、サードパーティ API、インターフェースのバインドなど、明示的な生成ロジックが必要な場合は `registerFactory` を使います。

```ts
const container = new Container()
  .registerValue('config', {
    dsn: 'postgres://localhost/app',
    poolSize: 10
  })
  .registerFactory('pool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepository, ['pool'])
```

戻り値の型が登録サービスの型になります。

## コンテナーを受け取るファクトリー

基本のコールバックは、ライフタイムで絞り込まれたコンテナーを受け取ります。singleton ファクトリーから解決できるのは singleton に安全な依存だけで、scoped と transient のキーは TypeScript が拒否します。

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

条件付きまたは複数段階の解決が必要な場合に使います。コールバック内の `.get()` は同期的でなければなりません。初期化の非同期状態をグラフへ伝播させる場合は `registerAsyncFactory` を使います。

## ファクトリー依存関係の宣言

`deps` を取るオーバーロードは要件をグラフへ記録し、コールバックのリゾルバーを指定キーに制限します。

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('logger', Logger, [])
  .registerFactory(
    'requestLog',
    (deps) => new RequestLog(
      deps.get('request'),
      deps.get('logger')
    ),
    ['request', 'logger'],
    'scoped'
  )
```

宣言した依存関係は、スコープ入力とライフタイムの要件をモジュールや後続の登録へ伝えます。`registerAsyncFactory` と異なり、コールバックは位置引数ではなくリゾルバーを受け取ります。

## ファクトリーのライフタイム

ファクトリーはクラスと同じライフタイムを使います。

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

singleton と scoped の結果はキャッシュされ、コンテナーが所有します。transient の結果はキャッシュも破棄もされません。

第 4 引数に `lazyKey` を渡すと、対象のライフタイムを保持する companion を作成できます。

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

companion を作成する場合は `'singleton'` も含めてライフタイムを明示します。詳しくは[遅延注入](./lazy-injection)を参照してください。

## インターフェースをバインドする

インターフェースには実行時のコンストラクターがありません。利用側を抽象型に依存させる場合は、サービス型を明示します。

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>(
    'mailer',
    () => new SendGridMailer()
  )
```

`mailer` の利用側には `SendGridMailer` ではなく `Mailer` が見えます。

## Promise 契約を選ぶ

`registerFactory` が返した Promise はサービス値そのものです。`.get()` は `Promise<T>` を返し、依存するファクトリーも同じ Promise を受け取ります。同期グラフに Promise オブジェクト自体が必要な場合だけ使います。

サービスが `T` で Promise が初期化境界なら、`registerAsyncFactory` を使います。非同期状態がグラフへ伝播し、サービスは `.getAsync()` で解決されます。[非同期依存関係](./async-dependencies)では両方の契約、キャッシュ、遅延 companion、失敗時の動作、リソース破棄を説明します。
