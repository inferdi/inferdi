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
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
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

オーバーライドは、キーが解決される前に行わなければなりません:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

この 2 行目はスローします。遅れたオーバーライドはグラフを分裂させます。既存の利用者は古いインスタンスを保持し続ける一方で、後続の解決はモックを返すことになるためです。

## 所有権

オーバーライドの値は外部によって所有されます。`registerValue` と同様に、オーバーライドはコンテナの破棄キューに追加されません。クリーンアップはテストフィクスチャが所有します。

## スコープの局所性

オーバーライドは、呼び出されたコンテナのみを変更します:

```ts
const scope = root.createScope().override('db', mockDb)
```

ルートおよび兄弟スコープは変更されません。親レベルのオーバーライドは、通常の親ルックアップを通じて参照できます。
