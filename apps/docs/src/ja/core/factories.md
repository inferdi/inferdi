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
      "description": "new Ctor(...deps) 以上の処理が構築に必要なとき — 複数の値を読み取る、サードパーティのクライアントを適応させる、設定オブジェクトを組み立てる、または InferDI がそのままキャッシュするプロミスを返す — には registerFactory を使用します。"
      "url": "https://inferdi.com/ja/core/factories"
      "mainEntityOfPage": "https://inferdi.com/ja/core/factories"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, ファクトリー, registerFactory, 非同期ファクトリー, 設定, サードパーティクライアント, 依存性注入"
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

## ファクトリーのライフタイム

ファクトリーは、クラスと同じライフタイムモデルを使用します:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

シングルトンのファクトリー内では、`c` パラメーターはシングルトンセーフな依存関係に絞り込まれます。スコープドおよびトランジェントなキーはオートコンプリートされず、TypeScript によって拒否されます。

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

## 非同期ファクトリー

ファクトリーはプロミスを返すことができます。プロミス自体がキャッシュされるため、並行する呼び出し元は初期化を共有します:

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

const [a, b] = await Promise.all([c.get('db'), c.get('db')])
await c.dispose()
```

`.get()` は同期的なままです。登録が非同期である場合、呼び出し元は返された値を await します。
