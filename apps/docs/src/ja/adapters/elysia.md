---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/adapters/elysia#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "アダプター"
          "item": "https://inferdi.com/ja/adapters/"
        - "@type": "ListItem"
          "position": 3
          "name": "Elysia アダプター"
          "item": "https://inferdi.com/ja/adapters/elysia"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/adapters/elysia#article"
      "headline": "InferDI Elysia アダプター — @inferdi/elysia"
      "name": "Elysia アダプター"
      "description": "@inferdi/elysia は Elysia v1 のプラグインです。スコープモードでは 1 つのリクエストスコープを作成し、Elysia のコンテキスト上に公開し、エラーハンドラーからも利用できるようにして、onAfterResponse で破棄します。Bun アプリ向けの root-only モードも備えています。"
      "url": "https://inferdi.com/ja/adapters/elysia"
      "mainEntityOfPage": "https://inferdi.com/ja/adapters/elysia"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Elysia v1, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Elysia, Elysia v1, プラグイン, Bun, scoped derive, onAfterResponse, root-only, 依存性注入"
      "articleSection": "アダプター"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/elysia"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=20, Bun"
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

# Elysia アダプター

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) は Elysia v1 のプラグインです。スコープドモードでは、1 つのリクエストスコープを作成し、それを Elysia コンテキスト上で公開し、ユーザーのエラーハンドラーが利用できるように保持し、`onAfterResponse` から破棄します。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
```

## リクエストスコープ

```ts
const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    setupScope: (scope, { request }) => {
      const ctx = scope.get('request')
      ctx.requestId = crypto.randomUUID()
      ctx.userId = request.headers.get('x-user-id') ?? undefined
    },
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

カスタムのコンテキストキーの場合:

```ts
const app = new Elysia()
  .use(inferdiElysia({ container: root, key: 'container' }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

ルートは、型付けされた Elysia チェーン内で `.use(inferdiElysia(...))` の後に登録する必要があります。

## オプション

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `container` | 必須 | ルートコンテナ。 |
| `key` | `'di'` | Elysia のコンテキストキー。 |
| `scopePerRequest` | `true` | ルート専用モードにするには `false` を設定します。 |
| `createScope` | `root.createScope()` | カスタムのリクエストスコープ作成。 |
| `setupScope` | なし | バリデーションとルートハンドラーの前にハイドレートします。 |
| `setupValidatedScope` | なし | Elysia のバリデーションの後にハイドレートします。 |
| `disposeScope` | `scope.dispose()` | カスタムの破棄。 |
| `autoDispose` | `true` | `false` または `false` を返す述語は所有権を移譲します。 |
| `onDisposeError` | `console.error` | クリーンアップ失敗のシンク。 |

## ルート専用モード

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

ルート専用モードはルートコンテナを公開し、リクエストスコープのライフサイクルフックをインストールしません。スコープド専用のオプションは静的に拒否されます。

## ライフサイクルに関する注意

クリーンアップはライフサイクル上 `onAfterResponse` にバインドされています。Elysia がそのフックに到達しなかった場合、アダプターはリクエストスコープが保持するリソースを解放できません。リクエストごとの記録は弱参照で保持されますが、リソースの破棄にはライフサイクルフックの実行が必要です。

バリデーション前に必要な値には `setupScope` を使用してください。バリデーション済みのボディ、クエリ、パラメータ、ヘッダー、または Cookie から導出される値には `setupValidatedScope` を使用してください。

## ストリーミング

Elysia は、ストリームがドレインする前にストリーミングの `Response` を生成することがあります。スコープドサービスがルートの戻りの後に使用される場合は、`skipInferdiDispose(context)` を呼び出し、スコープを自分で破棄してください。

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` は成功したクリーンアップのみを抑制します。エラーパスでは、それでも破棄します。
