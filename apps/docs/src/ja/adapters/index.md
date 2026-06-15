---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/adapters/#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "アダプター"
          "item": "https://inferdi.com/ja/adapters/"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/adapters/#article"
      "headline": "InferDI フレームワークアダプター — 概要"
      "name": "フレームワークアダプター"
      "description": "各 InferDI アダプターはリクエストごとに 1 つのリクエストスコープを作成し、それをフレームワークネイティブの場所で公開し、フレームワークの安全な完了ポイントで破棄します — その間、アプリケーションが所有する具体的で完全に型付けされたコンテナを保持します。薄いライフサイクルのグルーであって、IoC フレームワークではありません。"
      "url": "https://inferdi.com/ja/adapters/"
      "mainEntityOfPage": "https://inferdi.com/ja/adapters/"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, @inferdi/inferdi, Fastify, Hono, Koa, Express, Elysia"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, アダプター, リクエストスコープ, Fastify, Hono, Koa, Express, Elysia, ミドルウェア, 依存性注入"
      "articleSection": "アダプター"
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

# フレームワークアダプター

各アダプターはリクエストごとに正確に 1 つのリクエストスコープを作成し、それをフレームワークネイティブの場所で公開し、フレームワークの安全な完了ポイントで破棄します。その間、アプリケーションが所有する具体的なコンテナ型を保持するため、`request.di` は `any` やベースコンテナではなく、完全に型付けされます。

これがアダプターの仕事のすべてです。アダプターは薄いライフサイクルのグルーです。[`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) をゼロ依存に保つのと同じ設計が、デコレーター、コントローラースキャン、ハンドラーパラメータ注入、ルート探索をコアから排除し続けています。あなたが選ぶのはフレームワークのリクエストライフサイクルであって、フレームワーク独自の依存性注入の考え方ではありません。

## パッケージ

| パッケージ | フレームワーク | スコープの場所 | ルート専用モード |
| --- | --- | --- | --- |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di` | あり |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Hono v4 | `c.var.di` | なし |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | Koa v3 | `ctx.state.di` | なし |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5 | `req.di` | なし |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | Elysia v1 | `context.di` | あり |

## 共通のライフサイクル契約

スコープドモードでは、すべてのアダプターが各リクエストに対して同じステップを実行します。

1. リクエストが開始されると、ルートコンテナからスコープを **作成** します（`createScope`、デフォルトは `root.createScope()`）。
2. セットアップが実行される *前* に、フレームワークネイティブの場所（`request.di`、`ctx.state.di`、`c.var.di`、または Elysia コンテキストキー）でそれを **公開** します。これにより、セットアップの失敗とクリーンアップフックがすべて同じスロットを参照します。
3. `setupScope` でスコープを **セットアップ** し、リクエスト由来の状態（リクエスト ID、認証済みユーザー、クライアント IP）をハイドレートします。これは非同期でもかまいません。
4. リクエストを **処理** します。ルートハンドラーとフレームワークのエラーハンドラーが、公開されたスコープからサービスを解決します。
5. 所有権が移譲されていない限り、フレームワークの安全な完了ポイントでスコープを **破棄** します（`disposeScope`、デフォルトは `scope.dispose()`）。

### 共通オプション

| オプション | デフォルト | 目的 |
| --- | --- | --- |
| `container` | 必須 | アプリに公開されるルートコンテナ。アダプターはこれを破棄しません（Fastify のオプトインの `disposeRootOnClose` を除く）。 |
| `createScope` | `root.createScope()` | リクエストごとのスコープを構築します。非同期でもかまいません。 |
| `setupScope` | なし | ハンドラーが実行される前にスコープをハイドレートします。非同期でもかまいません。 |
| `disposeScope` | `scope.dispose()` | カスタムのクリーンアップ。同期でも非同期でもかまいません。 |
| `autoDispose` | `true` | `false`、または `false` を返す述語を指定すると、破棄をあなたのコードに委ねます。 |
| `onDisposeError` | アダプターごとのシンク | リクエストスコープの破棄失敗を受け取ります。Fastify は `request.log.error`、Koa は `ctx.app.emit('error')`、その他は `console.error`。 |
| `skipInferdiDispose(...)` | — | ストリーミングやバックグラウンド作業のために、1 つのリクエストをアプリケーション所有としてマークします。 |

### エラーと所有権のルール

- **セットアップの失敗は元のエラーのみを表面化します。** `setupScope` がスローした場合、アダプターは構築途中のスコープを破棄し、そのエラーを再送出します。このクリーンアップ中のクリーンアップ失敗は `onDisposeError`（またはシンク）に送られ、表面化されるエラーに集約されることはありません。
- **失敗したリクエストもスコープを破棄します。** `skipInferdiDispose` は *成功した* レスポンスでのみクリーンアップを抑制します。エラーパスでは、それに関係なくスコープを破棄します。Express は例外です。コールバックミドルウェアは処理済みのルートエラーを観測できないため、スキップされた失敗した Express リクエストはアプリケーション所有のままになります。
- **`autoDispose: false` と `skipInferdiDispose` は所有権を移譲します。** その後は、あなたのコードが正しいフレームワークの境界でスコープを破棄する責任を負います。
- **レスポンスが生成された後のクリーンアップエラーはシンクにルーティングされ、握りつぶされます。** レスポンスはすでに送信されているため、遅れたクリーンアップ失敗がそれを破損させることは決してありません。

## 重要な違い

| アダプター | 違い |
| --- | --- |
| Fastify | `onResponse` で破棄します。中断時のクリーンアップは `onRequestAbort` を使用します。ルートの破棄は `disposeRootOnClose` でオプトインできます。 |
| Hono | `await next()` の後に破棄します。ストリーミングヘルパーはストリーム作業が終わる前に戻ることがあるため、ストリーミングルートではしばしば `skipInferdiDispose` が必要です。 |
| Koa | Node レスポンスの `finish` または `close` を待つため、通常のストリームボディにはスキップは不要です。 |
| Express | コールバックミドルウェアから処理済みのダウンストリームのルートエラーを検出できません。スキップされた失敗したリクエストはアプリケーション所有のままになります。 |
| Elysia | クリーンアップは `onAfterResponse` にバインドされています。そのフックに到達しなかった場合、スコープが保持するリソースはアダプターによって解放できません。 |
