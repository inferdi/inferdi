---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/symbol-keys#breadcrumb"
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
          "name": "Symbol キー"
          "item": "https://inferdi.com/ja/core/symbol-keys"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/symbol-keys#article"
      "headline": "InferDI の Symbol キー"
      "name": "Symbol キー"
      "description": "すべての登録キーは string または symbol にできます。文字列はアプリ全体で公開するサービスに適し、symbol は衝突しない同一性を与え、ローカルな Symbol() キーはコンテナとともにガベージコレクション可能なまま保たれます。"
      "url": "https://inferdi.com/ja/core/symbol-keys"
      "mainEntityOfPage": "https://inferdi.com/ja/core/symbol-keys"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, symbol キー, Symbol, 文字列キー, 同一性, ガベージコレクション, 依存性注入"
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

# Symbol キー

すべての登録キーは `string` または `symbol` にできます。文字列は、アプリ全体で公開されるサービスに便利です。Symbol は、同一性が重要な場合に役立ちます。

```ts
const DB = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB, PgPool, ['config'])
  .registerClass(CACHE, RedisPool, [])
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)
c.get(CACHE)
c.get('repo')
```

## Symbol を使うべきとき

| パターン | トークン |
| --- | --- |
| モジュールローカルなプライベートサービス | `Symbol('name')` |
| インポートなしで共有される同一性 | `Symbol.for('name')` |
| 公称的な型レベルの区別 | `unique symbol` 定数 |

回収可能なプライベートサービスには、ローカルな symbol を使用してください。`Symbol.for(name)` はグローバルな symbol レジストリに格納され、決してガベージコレクションされません。

## Lazy コンパニオン

lazy コンパニオンのキーも symbol にできます:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

主キーとコンパニオンキーは、同じ種類である必要はありません。
