---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/factories#breadcrumb"
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
          "name": "ファクトリー"
          "item": "https://inferdi.com/ja/core/factories"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/factories#article"
      "headline": "InferDI のファクトリー — registerFactory"
      "name": "ファクトリー"
      "description": "同期構築には registerFactory、宣言的な非同期依存グラフには registerAsyncFactory を使用します。"
      "url": "https://inferdi.com/ja/core/factories"
      "mainEntityOfPage": "https://inferdi.com/ja/core/factories"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, ファクトリー, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, 依存性注入"
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

# ファクトリー

`new Ctor(...deps)` 以上のことが構築に必要な場合 — 複数の値を読み取る、サードパーティのクライアントを適応させる、設定オブジェクトを生成する、プロミスを返す — には `registerFactory` を使用します。

```ts
const container = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepo, ['pgPool'])
```

ファクトリーの戻り値が、そのキーの解決後の型になります。

## ホットな transient グラフ

transient サービスには `registerClass` を標準として使います。プロファイリングでコンストラクター呼び出しがホットパスの有意な割合を占めた場合だけ変更してください。

V8 では、同じ依存数を持つ異なる transient クラスを一つのグラフが繰り返し解決する場合に遅くなることがあります。プロファイリングとアプリケーションのビルド成果物でこの hotspot を確認したら、そのサービスだけをファクトリーで登録します。

```ts
const container = new Container()
  .registerClass('context', RequestContext, [], 'scoped')
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    'transient',
  )
```

各ファクトリーには独自の `new Service(...)` 呼び出しを置いてください。この最適化が必要なら、複数のサービスを共通の構築ヘルパーへ渡してはいけません。ファクトリーは依存関係の記述を繰り返すため、計測済みの hotspot に限定します。

## ファクトリーのライフタイム

ファクトリーは、クラスと同じライフタイムモデルを使用します:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

シングルトンのファクトリー内では、`c` パラメーターはシングルトンセーフな依存関係に絞り込まれます。スコープドおよびトランジェントなキーはオートコンプリートされず、TypeScript によって拒否されます。

省略可能な第4引数 `lazyKey` を渡すと、`registerClass` と同じくライフタイムを保持する `Lazy<V>` コンパニオンが登録されます:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get() // Cache
```

デフォルトのシングルトンライフタイムを使う場合は、コンパニオンキーの前に `undefined` を渡します: `registerFactory('cache', factory, undefined, 'cacheLazy')`。

## インターフェースのバインド

TypeScript のインターフェースはコンパイル時に消去され、コンストラクターとして渡すランタイム上の値を持ちません。代わりに、明示的なファクトリー型を通じて、インターフェースをその実装にバインドしてください:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

`'mailer'` の利用者は、具象クラスではなく `Mailer` という抽象を見ることになります。

## Promise 値を返す同期ファクトリー

`registerFactory` は、返された Promise をサービス値として扱います。キーは同期キーのままで、`get()` は Promise を返し、別のファクトリーには同じオブジェクトが渡されます。

```ts
const c = new Container()
  .registerFactory('dbPromise', () => connectDatabase())

const promise = c.get('dbPromise') // Promise<Database>
```

この形式でも single-flight キャッシュを利用できます。キャプチャしたコンテナーを通じて `await` 後に作られた循環は、同期の循環およびライフタイム検査の対象外です。

## 宣言的な非同期依存グラフ

`registerAsyncFactory` は最終サービス型を `AsyncSpec` に保持し、位置に対応した依存値を受け取ります。非同期キーに依存する `registerClass` は、その非同期状態をクラスグラフへ伝播します。

```ts
class Repository {
  constructor(readonly db: Database) {}
}

const root = new Container()
  .registerValue('config', {url: 'postgres://localhost/app'})
  .declareScopeInputs<{request: RequestContext}>()
  .registerAsyncFactory(
    'db',
    async (config) => connectDatabase(config.url),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (request) => loadSession(request),
    ['request'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])

const scope = root.createScope({request})
const repository = await scope.getAsync('repository')

// @ts-expect-error — 非同期グラフのキーには getAsync() が必要
scope.get('repository')
```

`getAsync()` は準備済みの同期キーと非同期キーを受け取り、Promise を返します。キーまたはキーの union が `AsyncSpec` を含む可能性がある場合、TypeScript は `get()` を拒否します。`has()` が証明するのは登録の存在だけであり、同期キーであることや不足するスコープ入力の提供は証明しません。

コンテナーは依存タプルの順序で宣言済み依存を開始し、宣言的な非同期マーカーを持つ登録だけを待機します。singleton と scoped は一つのネイティブ Promise をキャッシュします。transient は呼び出しごとに開始され、呼び出し元が所有します。宣言的な循環と cold なライフタイム違反は同期 preflight 中に失敗します。

非同期コールバックはコンテナーを受け取りません。Promise 境界後にキャプチャしたコンテナーを呼び出すと、グラフ解析外の動的エッジができます。InferDI は非同期 `Lazy<T>`、再試行、キャンセル、ロールバックを提供しません。後続の sibling が preflight 中に失敗しても、開始済み初期化は既存のキャッシュと所有状態を保ちます。非同期 transient は teardown handle なしで処理を続ける場合があります。

owned な非同期 singleton と scoped は、完了後も Promise をキャッシュします。`await using`、`await container.dispose()`、または `Symbol.asyncDispose` でコンテナーを閉じてください。同期 `using` はキャッシュ済み Promise を展開できないことを報告します。

`registerAsyncFactory` と、タプルが非同期キーを選ぶ可能性のある `registerClass` には readonly の依存タプルを渡してください。InferDI はタプルへの参照を保持し、非同期位置を一度だけ分類します。インラインリテラルは自動的に readonly として推論されます。
