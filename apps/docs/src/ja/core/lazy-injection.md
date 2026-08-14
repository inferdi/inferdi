# 遅延注入

`Lazy<T>` と `AsyncLazy<T>` は `.get()` まで解決を遅延します。同期ターゲットは `T`、宣言的 async ターゲットは `Promise<T>` を返します。依存キーが両方のモードを選び得るクラスは `Lazy<T> | AsyncLazy<T>` を受け取ります。

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

`registerClass`、`registerFactory`、または `registerAsyncFactory` に `lazyKey` を渡すと、値が `{ get: () => target }` であるコンパニオン登録が生成されます。

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` では第 5 引数にコンパニオンキーを渡します。

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

ラッパーの取得や注入ではファクトリーを開始しません。Singleton と scoped
の `.get()` は rejection を含むキャッシュ済み native Promise を返します。
Transient は呼び出しごとに開始され、caller が所有します。Promise-valued
`registerFactory` は `Lazy<Promise<T>>` を生成します。

## ライフタイムは保持される

Lazy コンパニオンはターゲットのライフタイムを保持します。シングルトンは singleton ターゲットの `Lazy` または `AsyncLazy` だけを注入できます。TypeScript は short-lived の可能性がある target-lifetime union と managed/unmanaged wrapper union も拒否します。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

スコープドおよびトランジェントな利用者は、グローバルにキャッシュされないため、任意のライフタイムに対する lazy コンパニオンを使用できます。

## キャプチャしたスコープとリソース破棄

ラッパーは、それを解決したコンテナーをキャプチャします。最初の child scope
で取得したラッパーは、2 番目の scope を作成した後も最初の scope を使います。
キャプチャした scope の破棄後、`AsyncLazy.get()` は rejected Promise を返します。
所有コンテナーは解決済み singleton/scoped ターゲットを破棄し、開始済み初期化を待ちます。

## 循環依存

InferDI は、プリフライト中の宣言的な非同期依存を含む同期循環を検出します。Promise 境界後の `AsyncLazy.get()` による動的循環は同期 detector の対象外です。初期化が自身の pending Promise を再取得すると、双方が待ち続けます。共有初期化を分割するか循環を除いてください。async 境界は[非同期依存関係](./async-dependencies)を参照してください。
