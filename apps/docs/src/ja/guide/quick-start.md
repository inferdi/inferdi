# クイックスタート

依存グラフは流れるような API を通じて構築し、TypeScript はその過程で検証を行います。すべての依存タプルはターゲットのコンストラクター位置と照合されるため、引数の入れ替えや欠落はランタイムでの予期せぬ問題ではなく、コンパイルエラーになります。`@Injectable()` デコレーターも `reflect-metadata` もありません — 配線はコンパイラが読み取れる素のコードです。

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string,
  ) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

`registerClass('userRepo', UserRepo, ['logger', 'dsn'])` の呼び出しは位置ベースで検証されます。タプルを `['dsn', 'logger']` に入れ替えると、TypeScript はアプリが実行される前に不一致を報告します。

## 値を解決する

解決には `.get(key)` を使用します。

```ts
const repo = container.get('userRepo')
```

キーはコンテナの型に登録されている必要があります。未知の静的キーはコンパイルエラーになります。動的キーは `.get(key)` の前に `.has(key)` で調べるべきです。

## ライフタイムを選ぶ

登録はデフォルトで `singleton` になります。クラスでは 4 番目の引数として、ファクトリーでは 3 番目の引数としてライフタイムを渡します。

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| 種類 | 作成タイミング | キャッシュ | コンテナによる破棄 |
| --- | --- | --- | --- |
| `singleton` | 所有コンテナごとに一度 | あり | あり |
| `scoped` | スコープごとに一度 | あり | あり |
| `transient` | 解決のたびに | なし | なし |

シングルトンは `scoped` または `transient` のサービスに直接依存することはできません。このルールは型によって、そして strict モードではランタイムガードによって強制されます。
