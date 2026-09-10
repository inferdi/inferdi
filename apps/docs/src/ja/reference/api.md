# API サマリー

このページでは、公開されているコア API をまとめています。正確なジェネリック定義については、パッケージの README と TypeScript の型宣言を参照してください。

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## コンテナオプション

コンストラクターは 1 つの省略可能な設定を受け取ります。

| オプション | 型 | デフォルト | 用途 |
| --- | --- | --- | --- |
| `fast` | `boolean` | `false` | チェック付きの可変契約と、ランタイムチェックを省く固定グラフ契約を選択する |

```ts
const checked = new Container()
const explicitChecked = new Container({ fast: false })
const fast = new Container({ fast: true })
```

デフォルト形式と明示的な `false` は、ランタイムの循環・ライフタイムチェックを
維持し、ルートからの scoped サービスの解決を拒否し、正確で可変な親チェーンを
使用します。開発、テスト、ホットリロード、および起動後に変更される可能性がある
グラフではこの契約を使用してください。

リテラルの `{fast: true}` はすべての TypeScript チェックを維持しますが、ルートの
scoped ガードを含むランタイムの循環・ライフタイム追跡を無効にします。コンテナ
ツリーを固定として扱い、scope から registry owner を直接参照し、委譲された
singleton をローカル scope のキャッシュへ反映します。子 scope は root の設定を
継承します。

fast ツリーでは、最初の解決または `createScope()` より前にすべての `register*`、
`.use()`、`.override()` を完了し、起動後のツリーを不変に保ち、祖先より先に子を
破棄してください。この契約を有効にするのはリテラル値 `true` だけです。それ以外の
ランタイム値ではチェック付き契約へフォールバックします。この選択が影響する処理と
トレードオフが有効な場合については[パフォーマンス](../guide/performance#fast-true)を
参照してください。

## 登録メソッド

| メソッド                                       | callback の入力                  | グラフ内の型                           | 解決方法                 |
|--------------------------------------------|-------------------------------|----------------------------------|----------------------|
| `registerClass`                            | `deps` に対応するコンストラクター引数        | `Spec` または伝播した `AsyncSpec`       | `get` または `getAsync` |
| `registerFactory(key, factory, ...)`       | ライフタイムで絞ったコンテナ                | `Spec<ReturnType>`               | `get`                |
| `registerFactory(key, factory, deps, ...)` | `deps` だけを持つ resolver         | 入力要件付き `Spec`                    | `get`                |
| `registerAsyncFactory`                     | 位置引数。宣言的 async 依存関係は await 済み | `AsyncSpec<Awaited<ReturnType>>` | `getAsync`           |
| `registerValue`                            | なし                            | 外部所有の singleton `Spec`           | `get`                |

`registerClass`、`registerFactory`、`registerAsyncFactory` は `singleton`、`scoped`、`transient` のライフタイムを受け付けます。`registerFactory` でコンパニオンを作る場合は、`'singleton'` を含めライフタイムを明示します。`registerValue` は常にシングルトンで、外部が所有します。

`registerClass` または `registerFactory` に `lazyKey` を渡すと、管理対象の `LazySpec` が追加されます。依存関係から async 状態が伝播したクラスでは、代わりに `AsyncLazySpec` が追加されます。Promise を返す `registerFactory` は同期の `Spec<Promise<T>>` のままで、コンパニオンも `Lazy<Promise<T>>` のままです。グラフに最終サービス型を保持させる場合は `registerAsyncFactory` を使います。

`registerAsyncFactory` は同じライフタイムと省略可能な第 5 引数 `lazyKey` を受け付けます。主登録は最終型を `AsyncSpec` に保持し、コンパニオン型は `AsyncLazySpec<Awaited<ReturnType>, L>` です。依存するクラスはターゲットキーの async 状態を継承しますが、ラッパーの利用側は同期のままです。ターゲットは `getAsync()`、ラッパーは `get()` で解決します。

`registerAsyncFactory` と、依存関係タプルが非同期キーを選ぶ可能性のある `registerClass` では readonly タプルが必要です。InferDI は登録時に非同期位置を一度だけ分類し、タプルへの参照を保持します。インラインリテラルは readonly として推論され、同期専用の `registerClass` は変更可能なタプルも受け付けます。

依存キー付き `registerFactory` と `registerAsyncFactory` は引数順が同じですが、callback 契約は異なります。前者は `deps` に制限された resolver を受け取り、後者は依存値を位置引数として受け取ります。

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` は scope input ではない既存登録を置き換え、`use` は module builder を適用します。`override` のタイミングガードが確認するのは現在のコンテナのキャッシュだけです。ローカルにキャッシュされた singleton/scoped 値、`registerValue`、2 回目のオーバーライドは検出しますが、transient の解決は記録しません。checked モードでは、子コンテナ経由で解決された祖先所有の singleton も記録しません。一方、fast の子は委譲された singleton をローカルキャッシュへミラーリングするため、ガードが検出します。依存関係グラフを解決する前にオーバーライドを適用してください。

## スコープ入力と解決

`declareScopeInputs<Inputs>()` は型にだけ存在する scoped エントリーを追加します。`createScope(inputs)` は不足している値の一部を提供し、必須プロパティに応じた準備済みキー集合を持つコンテナを返します。入力値はアプリケーションが所有します。

| API | 受け付けるキー |
| --- | --- |
| `get()` | `AsyncSpec` ではない準備済みキー |
| `getAsync()` | 準備済みの同期キーと宣言的 async キー |
| `has()` | 任意の string または symbol。登録の存在だけを証明 |

`has()` はキーの準備状態や同期性を証明しません。宣言された scope input は型にしか存在せず登録ではないため、`createScope(inputs)` で値を渡した後も `has()` はそれらに `false` を返します。型状態の絞り込みは[スコープ入力](../core/scope-inputs)、Promise の動作は[非同期依存関係](../core/async-dependencies)を参照してください。

## 名前空間の型

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| 型 | 用途 |
| --- | --- |
| `Container.ReadyKeys<C>` | 必要なスコープ入力が提供済みのキーを抽出します。汎用リゾルバーはそのキーを `getAsync` に渡せます。 |
| `Container.SyncReadyKeys<C>` | 汎用リゾルバーが `get` に渡せる、準備済みの非同期ではないキーを抽出します。 |
| `Container.Resolve<C>` | 構築済みのコンテナからフラットな `{ key: Value }` マップを抽出します。 |
| `Container.ResolveUnwrapped<C>` | `Resolve` と同様ですが、管理対象の `LazySpec` と `AsyncLazySpec` を distributive に展開します。通常のラッパーサービスは変更しません。 |
| `Container.UnwrappedValue<C, K>` | アンラップされた 1 つのサービス型を参照します。 |
| `Container.Providers<C>` | テスト用にプロバイダーのサンクのマップを作成します。宣言された scope input は除外されます。 |

v6 のジェネリック resolver は受け付けるキー集合を保持する必要があります。`get()` には `Container.SyncReadyKeys<C>`、`getAsync()` には `Container.ReadyKeys<C>` を使い、制約なしの `keyof T` は使いません。

## 公開型

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` と `AsyncLazySpec` は private な type-only discriminant を持ちます。
明示的な `Container` / `Module` shape では、この named interface を使ってください。
discriminant に runtime field はなく、export もされません。

`Spec`、`AsyncSpec`、`LazySpec`、`AsyncLazySpec` は型レベルのグラフエントリーを表します。これらのフィールドが解決済みサービス値に追加されることはありません。

`ScopeInputMap<M>` は必須かつ有限な string/symbol プロパティを scoped input エントリーへ変換します。optional キー、数値キー、`__proto__`、広い index signature、キー集合が異なる union は拒否します。`WithRequirements<S, K>` はグラフエントリーに必要な input keys を付加し、名前付きモジュールの出力で利用できます。正確な conditional type 定義は公開 TypeScript declarations を参照してください。

## アダプター API の形

### HTTP アダプター

Fastify、Hono、Koa、Express、Elysia は以下をエクスポートします。

- `inferdiFastify` のような統合関数
- `skipInferdiDispose`
- `MaybePromise`
- 構造的な `InferdiScope`、`InferdiRoot`、`InferdiScopeOf` ヘルパー
- フレームワーク固有のオプションおよびコンテキストのヘルパー型

### React アダプター

React は `inferdiReact` と、binding、外部 `Provider`、管理対象 `ScopeProvider`、service hooks、グラフ抽出、安定した sync/async キー、スコープのライフサイクルオプション用の型をエクスポートします。コンポーネントスコープは HTTP リクエストではなく React の commit と effect cleanup に従うため、`skipInferdiDispose` はありません。

正確な名前とライフサイクルの詳細は、各アダプターのページを参照してください。
