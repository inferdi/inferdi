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

`fast` のデフォルトは `false` です。ランタイムの安全性チェックを維持し、
scope は正確で可変な親チェーンを保持します。`{fast: true}` はチェックを
無効にしてグラフを固定として扱い、親 lookup のフラット化と継承 singleton
のミラーリングを有効にします。子 scope は root の設定を継承します。

## 登録メソッド

| メソッド | callback の入力 | グラフ内の型 | 解決方法 |
| --- | --- | --- | --- |
| `registerClass` | `deps` に対応するコンストラクター引数 | `Spec` または伝播した `AsyncSpec` | `get` または `getAsync` |
| `registerFactory(key, factory, ...)` | ライフタイムで絞ったコンテナ | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | `deps` だけを持つ resolver | 入力要件付き `Spec` | `get` |
| `registerAsyncFactory` | 解決済みの位置引数 | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | なし | 外部所有の singleton `Spec` | `get` |

`registerClass` と `registerFactory` は `singleton`、`scoped`、`transient` のライフタイムを受け付けます。`registerFactory` でコンパニオンを作る場合は、`'singleton'` を含めライフタイムを明示します。`registerValue` は常にシングルトンで、外部が所有します。

`registerAsyncFactory` は同じライフタイムと省略可能な第 5 引数 `lazyKey` を受け付けます。主登録は最終型を `AsyncSpec` に保持し、コンパニオン型は `AsyncLazySpec<Awaited<ReturnType>, L>` です。ターゲットは `getAsync()`、ラッパーは `get()` で解決します。

`registerAsyncFactory` と、依存関係タプルが非同期キーを選ぶ可能性のある `registerClass` では readonly タプルが必要です。InferDI は登録時に非同期位置を一度だけ分類し、タプルへの参照を保持します。インラインリテラルは readonly として推論され、同期専用の `registerClass` は変更可能なタプルも受け付けます。

`registerAsyncFactory` と依存キー付き `registerFactory` は、引数順と callback 契約が異なります。

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` は既存登録を置き換え、`use` は module builder を適用します。`override` のタイミングガードが確認するのは現在のコンテナのキャッシュだけです。ローカルにキャッシュされた singleton/scoped 値、`registerValue`、2 回目のオーバーライドは検出しますが、transient の解決や、子コンテナ経由で解決された祖先所有の値は記録しません。依存関係グラフを解決する前にオーバーライドを適用してください。

## スコープ入力と解決

`declareScopeInputs<Inputs>()` は型にだけ存在する scoped エントリーを追加します。`createScope(inputs)` は不足している値の一部を提供し、必須プロパティに応じた準備済みキー集合を持つコンテナを返します。入力値はアプリケーションが所有します。

| API | 受け付けるキー |
| --- | --- |
| `get()` | `AsyncSpec` ではない準備済みキー |
| `getAsync()` | 準備済みの同期キーと宣言的 async キー |
| `has()` | 任意の string または symbol。登録の存在だけを証明 |

`has()` はキーの準備状態や同期性を証明しません。型状態の絞り込みは[スコープ入力](../core/scope-inputs)、Promise の動作は[非同期依存関係](../core/async-dependencies)を参照してください。

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
| `Container.Providers<C>` | テスト用にプロバイダーのサンクのマップを作成します。 |

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

`ScopeInputMap<M>` は必須かつ有限な string/symbol プロパティを scoped input エントリーへ変換します。optional キー、数値キー、`__proto__`、広い index signature、キー集合が異なる union は拒否します。`WithRequirements<S, K>` は名前付きモジュールの出力に必要な input keys を保持します。正確な conditional type 定義は公開 TypeScript declarations を参照してください。

## アダプター API の形

すべてのアダプターは以下をエクスポートします。

- `inferdiFastify` のような統合関数
- `skipInferdiDispose`
- `MaybePromise`
- 構造的な `InferdiScope`、`InferdiRoot`、`InferdiScopeOf` ヘルパー
- フレームワーク固有のオプションおよびコンテキストのヘルパー型

フレームワーク固有のジェネリック名やライフサイクルの詳細については、アダプターのページを参照してください。
