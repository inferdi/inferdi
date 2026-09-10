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

## 動的インポート

オプションのモジュールやルート固有のモジュールを別の JavaScript チャンクとして読み込む場合は、`import()` を使えます。

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

ランタイムは `.use()` の呼び出し前に `reports.module` を読み込んで評価します。その後、`.use()` がモジュールを同期的に実行し、登録を追加して、型が推論されたコンテナを返します。動的インポートによってサービスが非同期になるわけではありません。サービスの初期化自体が非同期なら `registerAsyncFactory` を使ってください。

ブラウザーでは、ルートまたは機能の境界でこのパターンを使います。バンドラーが別チャンクを生成し、同じモジュールが他の場所から静的にインポートされていないことを確認してください。チャンクの読み込み後に、その機能用のコンテナを構築します。通常のバックエンド起動では静的インポートを優先してください。動的インポートは、デプロイ設定で選ぶオプション機能や、未使用のコードと依存関係を読み込まずに済ませたい cold start 重視の serverless パスに適しています。どちらのランタイムでも、最初の解決または `createScope()` の前にコンテナを組み立て、リクエストごとにアプリケーションコンテナを変更しないでください。

実行時に選択したキーは、解決前に [`.has()` 型ガード](./type-safety#動的キー)で絞り込みます。

## コンパイラーによる検証

宣言した要件がグラフに存在するまで、名前付きモジュールは追加できません。

```ts twoslash
// @errors: 2345
import { Container, type Module, type SpecMap } from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ feature: string }>

const addFeature: Module<Requirements, Provides> = (container) =>
  container.registerFactory('feature', (c) => c.get('config').env, ['config'])

new Container().use(addFeature) // [!code error]

const app = new Container()
  .registerValue('config', { env: 'test' })
  .use(addFeature)

const feature = app.get('feature')
//    ^?
```
