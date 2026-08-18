# モジュール

`.use()` を使用すると、大きなコンテナビルダーを小さな部品に分割しつつ、フルーエントチェーン全体で型推論を維持できます。

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

インラインのラムダがもっとも扱いやすい形です。ラムダのコンテナ型は、チェーンの前段で登録されたキーを含めて、呼び出し箇所から推論されます。

## 名前付きモジュール

再利用可能な名前付きモジュールは `Module<TRequirements, TProvides>` で必要項目と追加項目だけを宣言します。実際のグラフに追加登録があっても結果に保持されます。

```ts
import {
  Container,
  type Module,
  type SpecMap
} from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Requirements, Provides> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

const app = new Container()
  .registerValue('config', { env: 'test' })
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

コールバックから見えるのは `Container<TRequirements>` だけです。要件はサービス型、正確なライフタイム、同期/非同期、managed-lazy、scope input の準備状態で検査されます。出力は実際のグラフのどのキーとも衝突できず、不足・非互換・衝突には名前付き診断が出ます。

実行時に選択したキーは、解決前に [`.has()` 型ガード](./type-safety#動的キー)で絞り込みます。
