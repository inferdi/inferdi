---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/lifetime-guards#breadcrumb"
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
          "name": "ライフタイムガード"
          "item": "https://inferdi.com/ja/core/lifetime-guards"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/lifetime-guards#article"
      "headline": "InferDI のライフタイムガード — singleton、scoped、transient"
      "name": "ライフタイムガード"
      "description": "InferDI の 3 つのライフタイム（singleton、scoped、transient）と、寿命の長いサービスが寿命の短いサービスを取り込んでリクエストをまたいで状態が漏れるのを防ぐ、コンパイル時およびランタイムのガードについて説明します。"
      "url": "https://inferdi.com/ja/core/lifetime-guards"
      "mainEntityOfPage": "https://inferdi.com/ja/core/lifetime-guards"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, ライフタイム, singleton, scoped, transient, ライフタイムガード, キャプティブ依存, 依存性注入"
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

# ライフタイムガード

InferDI には 3 つのライフタイムがあります:

| 種類 | 生成タイミング | キャッシュ先 | コンテナによる破棄 |
| --- | --- | --- | --- |
| `singleton` | 所有コンテナごとに 1 回 | 所有コンテナ | あり |
| `scoped` | スコープごとに 1 回 | スコープ | あり |
| `transient` | 解決のたびに | キャッシュしない | なし |

## ライフタイムのルール

シングルトンは `scoped` または `transient` なサービスに直接依存することはできません。シングルトンは 1 回だけ生成され、すべてのリクエストで共有されます。そのため、スコープドな値 — 現在のリクエストのコンテキスト、ユーザー、トランザクション — をキャプチャしてしまうと、その 1 つのリクエストの状態が他のすべてのリクエストへ静かに漏れ出します。InferDI は、このようなケースをコードレビューに委ねるのではなく、型システム上で表現不可能にします。

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

この登録は TypeScript によって拒否されます。strict モードでは、キャストが型システムを回避した場合でも、同じ形がランタイムで拒否されます。

## strict モード

`strict: true` がデフォルトです。次のものを捕捉します:

- キャストによって持ち込まれた singleton から scoped、または singleton から transient への違反
- キャプチャされた外側のコンテナによるファクトリーのリーク
- 同期的なシングルトンの循環
- 同期的なトランジェントの循環
- 静的チェックを回避する動的キーの誤用

```ts
const root = new Container({ strict: true })
```

## fast モード

`strict: false` は、テストによってグラフの形が証明された後にのみ使用してください:

```ts
const root = new Container({ strict: false })
```

fast モードは、解決パスからランタイムの循環およびライフタイムの記録処理を取り除きます。型レベルの契約は変更しませんが、不正なキャスト、キャプチャされた外側のコンテナ、循環に対しては防御できません。

推奨されるワークフロー: strict モードで開発・テストを行い、監査の後にパフォーマンスが重要なプロダクションのグラフだけを切り替えます。
