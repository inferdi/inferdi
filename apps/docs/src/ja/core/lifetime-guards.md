# ライフタイム

InferDI には 3 つのライフタイムがあります:

| 種類          | 生成タイミング       | キャッシュ先   | コンテナによる破棄 |
|-------------|---------------|----------|-----------|
| `singleton` | 所有コンテナごとに 1 回 | 所有コンテナ   | あり        |
| `scoped`    | 子スコープごとに 1 回  | 子スコープ    | あり        |
| `transient` | 解決のたびに        | キャッシュしない | なし        |

`scoped` キーは `createScope()` が返した子コンテナから解決してください。デフォルトのチェック付き契約は、ルートコンテナからの解決を拒否します。

## ライフタイムのルール

シングルトンは `scoped` または `transient` なサービスに直接依存することはできません。シングルトンは 1 回だけ生成され、すべてのリクエストで共有されます。そのため、スコープドな値 — 現在のリクエストのコンテキスト、ユーザー、トランザクション — をキャプチャしてしまうと、その 1 つのリクエストの状態が他のすべてのリクエストへ静かに漏れ出します。InferDI は、このようなケースをコードレビューに委ねるのではなく、型システム上で表現不可能にします。

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

どのランタイム契約でも、この登録は TypeScript によって拒否されます。デフォルトのチェック付き契約では、キャストが型システムを回避した場合でも、同じ形がランタイムで拒否されます。

宣言したスコープ入力は scoped 依存として扱われます。request、認証コンテキスト、tenant、job payload を読む利用者は `scoped` または `transient` で登録してください。singleton 利用者はコンパイル時に拒否されます。詳しくは[スコープ入力](./scope-inputs)を参照してください。

<!-- Preserve deep links from before the container-option sections moved -->
<h6 id="既定の実行時チェック" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>
<h6 id="fast-true" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>

これらのランタイムチェックを行うかどうかはコンテナ契約で決まります。デフォルト契約と
fast 契約の正確な動作は[コンテナオプション](../reference/api#コンテナオプション)を
参照してください。
