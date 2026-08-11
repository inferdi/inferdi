---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/lazy-injection#breadcrumb"
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
          "name": "遅延注入"
          "item": "https://inferdi.com/ja/core/lazy-injection"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/lazy-injection#article"
      "headline": "InferDI の遅延注入 — Lazy<T>"
      "name": "遅延注入"
      "description": "Lazy<T> は解決を遅延させるラッパーで、構築の順序を遅らせたり、2 つのシングルトンがコンストラクター内で両方を解決することなく互いを参照したりするために使用します — ライフタイムガードを壊すこともありません。"
      "url": "https://inferdi.com/ja/core/lazy-injection"
      "mainEntityOfPage": "https://inferdi.com/ja/core/lazy-injection"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, 遅延注入, Lazy, 遅延解決, 循環依存, シングルトン, 依存性注入"
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

# 遅延注入

`Lazy<T>` は、解決を遅延させる小さなラッパーです。構築の順序を遅らせる必要がある場合や、2 つのシングルトンサービスが互いを参照する必要があるが両方をコンストラクター内で解決したくない場合に役立ちます。

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

`registerClass` または `registerFactory` に `lazyKey` を渡すと、値が `{ get: () => target }` であるコンパニオン登録が生成されます。

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

## ライフタイムは保持される

Lazy はライフタイムの抜け穴ではありません。シングルトンは、シングルトンを対象とする `Lazy` コンパニオンのみを注入できます。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

スコープドおよびトランジェントな利用者は、グローバルにキャッシュされないため、任意のライフタイムに対する lazy コンパニオンを使用できます。

## 循環依存

InferDI は、プリフライト中の宣言的な非同期依存を含む同期循環を検出しますが、自動では解消しません。`Lazy<singleton>` は同期の singleton エッジを断てますが、宣言的な非同期登録には lazy コンパニオンがありません。Promise 境界後に作られる動的な循環は、共有初期化を分割する、一方を引き上げる、循環を除く、といったアーキテクチャ上の修正が必要です。
