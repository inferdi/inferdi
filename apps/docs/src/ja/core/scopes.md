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
      "dateModified": "2026-08-09"
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

Scope input は、スコープを開くときに存在する外部値を表します。対象には request、認証コンテキスト、tenant、job データなどがあります。`declareScopeInputs()` はキーを型グラフへ追加し、ランタイム登録は作りません。

```ts
const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass('accountService', AccountService, ['request', 'auth'], 'scoped')
```

Declaration map が受け付けるのは、必須かつ有限な string キーと symbol キーです。optional キー、numeric キー、`__proto__`、広い string/symbol index signature、バリアントごとにキー集合が異なる union はコンパイルエラーになります。Root と既存 child のどちらでも input を宣言できますが、宣言だけでは値を提供しません。

`createScope(inputs)` は未提供 input の部分集合を受け取ります。InferDI は class 登録、lazy companion、依存 tuple を明示した factory へ要件を伝播します。

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth は未提供
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')

root.registerFactory(
  'userId',
  ['auth'],
  (c) => c.get('auth').userId,
  'scoped'
)
```

Factory の tuple は型検査にのみ使われます。Callback は、列挙したキーを受け付ける `.get()` と probe 用の `.has()` を持つ resolver を受け取ります。ランタイムでは `factory(container)` を呼び出します。

名前付きプロファイルには通常の関数を使います。

```ts
const publicScope = (request: RequestContext) =>
  root.createScope({request})

const authenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})
```

Child は enumerable な own string/symbol プロパティの shallow snapshot を取ります。Nested child は input value を継承しますが、scoped instance は別に生成します。Input value の所有者はアプリケーションです。新しい child で scope を絞り込む場合は、絞り込んだ child を parent より先に破棄してください。

ランタイムは input schema を保持しません。JavaScript、`any`、cast を使うと未知のキーを追加でき、child cache 内で登録を隠すこともできます。Object spread は getter と Proxy trap を実行するため、副作用のない data record を渡してください。これらの hook から行う再入的な変更は契約外です。Strict Mode では partial child に追加した登録が refined child から見えます。Fast Mode でも input を絞り込めますが、最初の `.get()` または `.createScope()` より前に登録を完了する必要があります。

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
