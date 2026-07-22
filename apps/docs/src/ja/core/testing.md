---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/testing#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "コアコンセプト"
          "item": "https://inferdi.com/ja/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "テストとオーバーライド"
          "item": "https://inferdi.com/ja/core/testing"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/testing#article"
      "headline": "InferDI のテストとオーバーライド — .override()"
      "name": "テストとオーバーライド"
      "description": "テストで既存の登録をモックに置き換えるには .override() を使用します。プロダクションの配線や型付けされたグラフの残りに手を加えることなく、実装を差し替えられます。"
      "url": "https://inferdi.com/ja/core/testing"
      "mainEntityOfPage": "https://inferdi.com/ja/core/testing"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, テスト, override, モック, テストダブル, 実装の差し替え, 依存性注入"
      "articleSection": "コアコンセプト"
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

# テストとオーバーライド

テストで既存の登録をモックに置き換える必要がある場合は、`.override()` を使用します。

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

オーバーライドの値は、元々登録された型に代入可能でなければなりません。存在しないキーや互換性のないモックは TypeScript エラーになります。

## オーバーライドのタイミング

依存関係グラフを解決する前にオーバーライドを適用してください:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

2 行目は、singleton 値がこのコンテナのローカルキャッシュにすでに存在するため例外をスローします。このガードは意図的にキャッシュだけを確認し、現在のスコープにキャッシュされた scoped 値、`registerValue`、および 2 回目のオーバーライドも検出します。Transient の解決や、子コンテナ経由で解決された祖先所有の値はローカルにキャッシュされないため追跡されません。すでに返された transient は呼び出し側に残り、以後の解決はモックを返します。これは遅いオーバーライドを推奨するものではありません。グラフの分裂を避けるため、すべてのオーバーライドをグラフの解決前に適用してください。

## 所有権

オーバーライドの値は外部によって所有されます。`registerValue` と同様に、オーバーライドはコンテナの破棄キューに追加されません。クリーンアップはテストフィクスチャが所有します。

## スコープの局所性

オーバーライドは、呼び出されたコンテナのみを変更します:

```ts
const scope = root.createScope().override('db', mockDb)
```

ルートおよび兄弟スコープは変更されません。親レベルのオーバーライドは、通常の親ルックアップを通じて参照できます。
