# 遅延注入

`Lazy<T>` は、解決を遅延させる小さなラッパーです。構築の順序を遅らせる必要がある場合や、2 つのシングルトンサービスが互いを参照する必要があるが両方をコンストラクター内で解決したくない場合に役立ちます。

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

`lazyKey` を渡すと、値が `{ get: () => target }` であるコンパニオン登録が生成されます。

## ライフタイムは保持される

Lazy はライフタイムの抜け穴ではありません。シングルトンは、シングルトンを対象とする `Lazy` コンパニオンのみを注入できます。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

スコープドおよびトランジェントな利用者は、グローバルにキャッシュされないため、任意のライフタイムに対する lazy コンパニオンを使用できます。

## 循環依存

InferDI は循環を検出しますが、自動で解消することはありません。2 つのシングルトンサービスの場合は、一方に `Lazy<singleton>` を配置し、もう一方は直接のままにします。非同期ファクトリーの循環の場合、推奨される修正はアーキテクチャ上のものです。すなわち、共有の初期化を分割する、一方を引き上げる、あるいは循環自体を避けることです。
