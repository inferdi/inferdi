---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/type-safety#breadcrumb"
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
          "name": "型安全性"
          "item": "https://inferdi.com/ja/core/type-safety"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/type-safety#article"
      "headline": "InferDI の型安全性：グラフがそのまま型になる"
      "name": "型安全性"
      "description": "InferDI は依存関係グラフを型システムの中に保持します。引数の順序の誤り、未登録のキー、スコープ付き状態に手を伸ばすシングルトンは、負荷時に見つかるランタイムのスタックトレースではなく、エディタ上のコンパイルエラーになります。"
      "url": "https://inferdi.com/ja/core/type-safety"
      "mainEntityOfPage": "https://inferdi.com/ja/core/type-safety"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, 型安全性, TypeScript, 型推論, コンストラクターシグネチャ, コンパイル時, 依存性注入"
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

# 型安全性

InferDI の中心的なルール: 依存関係グラフは型システムの中に存在します。不正なグラフ — 引数の順序の誤り、登録されていないキー、スコープドな状態に手を伸ばすシングルトン — は、負荷がかかってはじめて発見されるスタックトレースではなく、エディター上で確認できる型エラーです。コンパイラが静的に証明できるものはすべて静的に検証されます。ランタイムガードは、`as` キャストや動的キーがすり抜けてしまうものを捕捉するためにのみ存在します。

## コンストラクターのシグネチャ

`registerClass` は、依存関係のタプルをコンストラクターのパラメーターリストと照合します。

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

コンストラクターが変われば、登録もそれに伴って変わります。`['db', 'logger']` への入れ替えは、最初のコンストラクターパラメーターが `Logger` を期待しているため拒否されます。

## キーの一意性

すべての登録は、拡張されたコンテナ型を返します。フルーエント API を通じて同じキーを再登録することは拒否されます:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

置き換えが意図的である場合、テストでは `.override()` を使用します。

## 型に含まれるライフタイム

各エントリーは、値の型とそのライフタイムの種類の両方を保持します。型システムは依存関係をフィルタリングし、シングルトンがスコープドまたはトランジェントなサービスに直接依存できないようにします。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

ランタイムの strict モードは、`as` キャスト、動的キー、キャプチャされた外側のコンテナ、依存関係の循環に対する多層防御として残ります。
