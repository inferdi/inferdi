---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/reference/errors#breadcrumb"
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
          "name": "エラー"
          "item": "https://inferdi.com/ja/reference/errors"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/reference/errors#article"
      "headline": "InferDI エラーリファレンス"
      "name": "エラー"
      "description": "グラフやライフサイクルの誤用に対して InferDI が明示的にスローするすべてのエラー（未知のキー、循環検出、ライフタイム違反、破棄済みコンテナ）と、そのメッセージ形式を解説します。登録ミスをテストで早期に検出できます。"
      "url": "https://inferdi.com/ja/reference/errors"
      "mainEntityOfPage": "https://inferdi.com/ja/reference/errors"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-31"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, エラー, 例外, 未知のキー, 循環検出, ライフタイム違反, 破棄済みコンテナ, 依存性注入"
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

# エラー

InferDI は、依存グラフやライフサイクルの誤用に対して明示的なエラーをスローします。登録ミスを早期に失敗させるため、これらのメッセージをテストで可視のまま保ちましょう。

| トリガー | メッセージの形 |
| --- | --- |
| 存在しないキーに対する `.get(k)` | `Key "k" not found` |
| 破棄されたコンテナでの解決 | `Container is disposed (key: "k")` |
| 破棄された祖先コンテナでの解決 | `Ancestor container is disposed (key: "k")` |
| 破棄後の `createScope()` | `Cannot create scope from a disposed container` |
| 破棄後の登録 | `Cannot register on a disposed container (key: "k")` |
| strict モードでルートから scoped キーを解決 | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| シングルトンのライフタイム違反 | `Singleton "x" cannot depend on scoped "y"...` |
| 同期的な循環 | `Circular dependency detected: a -> b -> a...` |
| 非同期リソースに対する同期破棄 | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| 遅延したオーバーライド | `Cannot override "k" because it has already been resolved...` |
| 破棄されたコンテナでのオーバーライド | `Cannot override on a disposed container (key: "k")` |

## 非同期ファクトリーの循環

`registerAsyncFactory(..., deps, ...)` に宣言された依存は同期プリフライトで解決されるため、既存の循環ガードがファクトリー本体の実行前に循環を拒否します。

Promise 境界の後に作られる循環は検出されません。Promise を返す `registerFactory` コールバックや、`await` 後に使われるキャプチャ済みコンテナが該当します。両側が互いを待つと、呼び出し側は決して解決されない Promise を受け取ります。

非同期の循環はアーキテクチャ上で修正してください。

- 共有の初期化処理を分割する
- 一方をより早いサービスへと引き上げる
- 同期 singleton 依存に限り `Lazy<singleton>` を使う
- 疑わしいトップレベルの await の周りに開発用のウォッチドッグタイムアウトを追加する

## アダプターのクリーンアップエラー

レスポンスが生成された後のアダプターのクリーンアップエラーが、クライアントに表面化することは決してありません。これらは `onDisposeError` またはアダプターのフォールバックのシンクにルーティングされます。

セットアップの失敗は異なります。元のセットアップエラーが表面化し、セットアップのクリーンアップ中に発生したクリーンアップの失敗は、表面化されるエラーに集約されることなくシンクにルーティングされます。
