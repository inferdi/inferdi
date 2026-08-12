---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/reference/api#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "リファレンス"
          "item": "https://inferdi.com/ja/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "API サマリー"
          "item": "https://inferdi.com/ja/reference/api"
    - "@type": "APIReference"
      "@id": "https://inferdi.com/ja/reference/api#article"
      "headline": "InferDI コア API サマリー"
      "name": "API サマリー"
      "description": "スコープ入力、registerAsyncFactory、準備状態を考慮した解決、オーバーライド、破棄を含む @inferdi/inferdi v6 コア API のまとめです。"
      "url": "https://inferdi.com/ja/reference/api"
      "mainEntityOfPage": "https://inferdi.com/ja/reference/api"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "明示的な登録、フルエントビルダー"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, declareScopeInputs, ScopeInputMap, registerAsyncFactory, getAsync, AsyncSpec, ReadyKeys, dispose"
      "articleSection": "リファレンス"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

# API サマリー

このページでは、公開されているコア API をまとめています。正確なジェネリック定義については、パッケージの README と TypeScript の型宣言を参照してください。

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type LazySpec,
  type AsyncSpec,
  type Module,
  type RegistrationKind,
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
  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?, lazyKey?)
  registerFactory(key, deps, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?)
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

## 登録メソッド

| メソッド | callback の入力 | グラフ内の型 | 解決方法 |
| --- | --- | --- | --- |
| `registerClass` | `deps` に対応するコンストラクター引数 | `Spec` または伝播した `AsyncSpec` | `get` または `getAsync` |
| `registerFactory(key, factory, ...)` | ライフタイムで絞ったコンテナ | `Spec<ReturnType>` | `get` |
| `registerFactory(key, deps, factory, ...)` | `deps` だけを持つ resolver | 入力要件付き `Spec` | `get` |
| `registerAsyncFactory` | 解決済みの位置引数 | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | なし | 外部所有の singleton `Spec` | `get` |

`registerClass` と `registerFactory` は `singleton`、`scoped`、`transient` のライフタイムと、省略可能な `lazyKey` コンパニオンを受け付けます。`registerValue` は常にシングルトンで、外部が所有します。

`registerAsyncFactory` は同じライフタイムを受け付けますが、`lazyKey` はありません。最終サービス型を `AsyncSpec` として記録し、依存するクラスは非同期状態を引き継ぎます。これらのキーは `getAsync()` で解決してください。`get()` は、`registerFactory` が作る Promise 値サービスを含む同期キーに使用します。

`registerAsyncFactory` と、依存関係タプルが非同期キーを選ぶ可能性のある `registerClass` では readonly タプルが必要です。InferDI は登録時に非同期位置を一度だけ分類し、タプルへの参照を保持します。インラインリテラルは readonly として推論され、同期専用の `registerClass` は変更可能なタプルも受け付けます。

`registerAsyncFactory` と依存キー付き `registerFactory` は、引数順と callback 契約が異なります。

```ts
registerFactory(key, deps, resolverFactory, kind, lazyKey)
registerAsyncFactory(key, valueFactory, deps, kind)
```

`override` は既存登録を置き換え、`use` は module builder を適用します。`override` のタイミングガードが確認するのは現在のコンテナのキャッシュだけです。ローカルにキャッシュされた singleton/scoped 値、`registerValue`、2 回目のオーバーライドは検出しますが、transient の解決や、子コンテナ経由で解決された祖先所有の値は記録しません。依存関係グラフを解決する前にオーバーライドを適用してください。

## スコープ入力と解決

`declareScopeInputs<Inputs>()` は型にだけ存在する scoped エントリーを追加します。`createScope(inputs)` は不足している値の一部を提供し、必須プロパティに応じた準備済みキー集合を持つコンテナを返します。入力値はアプリケーションが所有します。

| API | 受け付けるキー |
| --- | --- |
| `get()` | `AsyncSpec` ではない準備済みキー |
| `getAsync()` | 準備済みの同期キーと宣言的 async キー |
| `has()` | 任意の string または symbol。登録の存在だけを証明 |

`has()` はキーの準備状態や同期性を証明しません。型状態の絞り込みは[スコープ入力とプロファイル](../core/scope-inputs)、Promise の動作は[非同期依存グラフ](../core/async-dependency-graph)を参照してください。

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
| `Container.ResolveUnwrapped<C>` | `Resolve` と同様ですが、管理対象の `LazySpec` コンパニオンだけを `T` に展開します。通常の `.get()` メソッドを持つサービスは変更しません。 |
| `Container.UnwrappedValue<C, K>` | アンラップされた 1 つのサービス型を参照します。 |
| `Container.Providers<C>` | テスト用にプロバイダーのサンクのマップを作成します。 |

v6 のジェネリック resolver は受け付けるキー集合を保持する必要があります。`get()` には `Container.SyncReadyKeys<C>`、`getAsync()` には `Container.ReadyKeys<C>` を使い、制約なしの `keyof T` は使いません。

## 公開型

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, RegistrationKind>
>

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

interface AsyncSpec<V, K extends RegistrationKind = 'singleton'>
  extends Spec<V, K> {
  readonly async: true
}

interface LazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

`ScopeInputMap<M>` は必須かつ有限な string/symbol プロパティを scoped input エントリーへ変換します。optional キー、数値キー、`__proto__`、広い index signature、キー集合が異なる union は拒否します。`WithRequirements<S, K>` は名前付きモジュールの出力に必要な input keys を保持します。正確な conditional type 定義は公開 TypeScript declarations を参照してください。

## アダプター API の形

すべてのアダプターは以下をエクスポートします。

- `inferdiFastify` のような統合関数
- `skipInferdiDispose`
- `MaybePromise`
- 構造的な `InferdiScope`、`InferdiRoot`、`InferdiScopeOf` ヘルパー
- フレームワーク固有のオプションおよびコンテキストのヘルパー型

フレームワーク固有のジェネリック名やライフサイクルの詳細については、アダプターのページを参照してください。
