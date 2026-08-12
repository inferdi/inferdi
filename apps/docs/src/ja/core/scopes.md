---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/scopes#breadcrumb"
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
          "name": "スコープとクリーンアップ"
          "item": "https://inferdi.com/ja/core/scopes"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/scopes#article"
      "headline": "InferDI のスコープとクリーンアップ"
      "name": "スコープとクリーンアップ"
      "description": "スコープはリクエストローカルなサービスを 1 つの作業単位に区切ります。子スコープはすべての親の登録を継承しますが、独自のインスタンスをキャッシュしてそのクリーンアップを所有し、LIFO による破棄と using および await using をサポートします。"
      "url": "https://inferdi.com/ja/core/scopes"
      "mainEntityOfPage": "https://inferdi.com/ja/core/scopes"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, スコープ, クリーンアップ, 破棄, 子スコープ, using, await using, LIFO, 依存性注入"
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

# スコープとクリーンアップ

スコープは、リクエストローカルなサービスのライフタイムを 1 つの作業単位に限定します。子スコープはすべての親の登録を継承しますが、自身のスコープドなインスタンスをキャッシュし、そのクリーンアップを所有します。そのため、あるリクエストのために生成されたスコープが、別のリクエストと状態を共有したり、それより長く存続したりすることはありません。

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` はルートのシングルトンです。`request` はスコープごとに 1 回生成され、スコープが破棄されるときに破棄されます。

`scoped` 登録は子スコープに属します。デフォルトの `strict: true` では、`root.get('request')` が `Scoped "request" cannot be resolved from the root container. Use createScope().` をスローします。`createScope()` が返したコンテナからキーを解決してください。`strict: false` はこのランタイムガードを省略します。

## Scope input とプロファイル

Scope input は、スコープを開くときに存在する外部値を表します。対象には request、認証コンテキスト、tenant、job データなどがあります。先に宣言し、必要な部分を `createScope(inputs)` で渡します。

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

コンテナ型は提供済み input を記録し、準備が整うまで依存サービスを隠します。名前付きプロファイル、nested refinement、依存キー付き factory、再利用型、入力検証の規則は[スコープ入力とプロファイル](./scope-inputs)を参照してください。

## 所有権

各コンテナは、自身が生成したインスタンスのみを破棄します。

| インスタンス | 所有者 |
| --- | --- |
| ルートのシングルトン | ルートコンテナ |
| スコープドなサービス | リクエストスコープ |
| 子で最初に解決されたシングルトン | その子コンテナ |
| トランジェント | 呼び出し元 |

`root.dispose()` は、すでに生成された子スコープへカスケードしません。スコープはそれぞれのライフサイクルの境界で破棄してください。

## ネイティブのリソース管理

Container は両方の破棄シンボルを実装しています:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

所有するリソースのいずれかが非同期になりうる場合は、`await using` または `await container.dispose()` を使用してください。

## 破棄のプロトコル

所有するインスタンスは、生成と逆の順序で破棄されます。コンテナは次の順で調べます:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

複数の破棄処理が失敗した場合、InferDI はそれらを `AggregateError` にまとめます。これにより、1 つの不正なクリーンアップが、後続のリソースのクローズを妨げることはありません。
