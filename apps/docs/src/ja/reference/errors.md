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
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
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
| シングルトンのライフタイム違反 | `Singleton "x" cannot depend on scoped "y"...` |
| 同期的な循環 | `Circular dependency detected: a -> b -> a...` |
| 非同期リソースに対する同期破棄 | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| 遅延したオーバーライド | `Cannot override "k" because it has already been resolved...` |
| 破棄されたコンテナでのオーバーライド | `Cannot override on a disposed container (key: "k")` |

## 非同期ファクトリーの循環

非同期ファクトリー間の循環は検出されません。別の非同期ファクトリーを await するファクトリーは、同期的な循環スタックがクリアされた後に再開される可能性があります。両側が最終的に互いを await すると、呼び出し側は決して解決されない保留中の promise を観測します。

非同期の循環はアーキテクチャ上で修正してください。

- 共有の初期化処理を分割する
- 一方をより早いサービスへと引き上げる
- 両側がシングルトンの場合に限り `Lazy<singleton>` を使う
- 疑わしいトップレベルの await の周りに開発用のウォッチドッグタイムアウトを追加する

## アダプターのクリーンアップエラー

レスポンスが生成された後のアダプターのクリーンアップエラーが、クライアントに表面化することは決してありません。これらは `onDisposeError` またはアダプターのフォールバックのシンクにルーティングされます。

セットアップの失敗は異なります。元のセットアップエラーが表面化し、セットアップのクリーンアップ中に発生したクリーンアップの失敗は、表面化されるエラーに集約されることなくシンクにルーティングされます。
