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
      "description": "@inferdi/inferdi コアの公開 API のまとめです。Container クラス、register、registerFactory、registerValue、get、has、スコープ、override、dispose、そして Lazy・DependenciesMap・Module の各型を解説します。"
      "url": "https://inferdi.com/ja/reference/api"
      "mainEntityOfPage": "https://inferdi.com/ja/reference/api"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "明示的な登録、フルエントビルダー"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, register, registerFactory, get, scope, override, dispose, Lazy, Module"
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
  type Module,
  type RegistrationKind,
  type Spec,
  type SpecMap,
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
  has(key)

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## 登録メソッド

| メソッド | 用途 |
| --- | --- |
| `registerClass` | コンストラクターと依存関係のタプルを登録します。 |
| `registerFactory` | カスタムの構築ロジックを登録します。 |
| `registerValue` | 外部が所有するシングルトン値を登録します。 |
| `override` | 最初の解決より前に既存の登録を置き換えます。 |
| `use` | モジュールビルダーを適用します。 |

`registerClass` と `registerFactory` は `singleton`、`scoped`、`transient` のライフタイムを受け付けます。`registerValue` は常にシングルトンで、外部が所有します。

## 名前空間の型

```ts
namespace Container {
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| 型 | 用途 |
| --- | --- |
| `Container.Resolve<C>` | 構築済みのコンテナからフラットな `{ key: Value }` マップを抽出します。 |
| `Container.ResolveUnwrapped<C>` | `Resolve` と同様ですが、`Lazy<T>` のエントリーを `T` にアンラップします。 |
| `Container.UnwrappedValue<C, K>` | アンラップされた 1 つのサービス型を参照します。 |
| `Container.Providers<C>` | テスト用にプロバイダーのサンクのマップを作成します。 |

## 公開型

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

## アダプター API の形

すべてのアダプターは以下をエクスポートします。

- `inferdiFastify` のような統合関数
- `skipInferdiDispose`
- `MaybePromise`
- 構造的な `InferdiScope`、`InferdiRoot`、`InferdiScopeOf` ヘルパー
- フレームワーク固有のオプションおよびコンテキストのヘルパー型

フレームワーク固有のジェネリック名やライフサイクルの詳細については、アダプターのページを参照してください。
