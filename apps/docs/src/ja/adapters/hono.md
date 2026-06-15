---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/adapters/hono#breadcrumb"
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
          "name": "Hono アダプター"
          "item": "https://inferdi.com/ja/adapters/hono"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/adapters/hono#article"
      "headline": "InferDI Hono アダプター — @inferdi/hono"
      "name": "Hono アダプター"
      "description": "@inferdi/hono は Hono v4 のミドルウェアです。呼び出しごとに 1 つのリクエストスコープを作成し、Hono のコンテキスト変数を通じて公開し、境界の定まったルートパイプラインの完了後に破棄します。エッジの Cloudflare Workers や Bun に最適です。"
      "url": "https://inferdi.com/ja/adapters/hono"
      "mainEntityOfPage": "https://inferdi.com/ja/adapters/hono"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Hono v4, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Hono, Hono v4, ミドルウェア, コンテキスト変数, エッジ, Cloudflare Workers, Bun, 依存性注入"
      "articleSection": "アダプター"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/hono"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=16, Bun, Cloudflare Workers"
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

# Hono アダプター

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) は Hono v4 のミドルウェアです。ミドルウェアの呼び出しごとに 1 つのリクエストスコープを作成し、それを Hono のコンテキスト変数を通じて公開し、境界の定まったルートパイプラインが完了した後に破棄します。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'
```

## リクエストスコープ

```ts
const root = buildRootContainer()
type AppEnv = InferdiHonoEnv<typeof root>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  setupScope: (scope, c) => {
    const ctx = scope.get('request')
    ctx.requestId = crypto.randomUUID()
    ctx.userId = c.req.header('x-user-id')
  },
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` は `c.var.di` と同等です。

## カスタムキー

```ts
type AppEnv = InferdiHonoEnv<typeof root, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({ container: root, key: 'container' }))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

このアダプターは Hono の `ContextVariableMap` をグローバルに拡張しないため、ミドルウェアの欠落は TypeScript から引き続き見えます。

## オプション

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `container` | 必須 | ルートコンテナ。このミドルウェアによって破棄されることはありません。 |
| `key` | `'di'` | コンテキスト変数のキー。 |
| `createScope` | `root.createScope()` | カスタムのリクエストスコープ作成。 |
| `setupScope` | なし | ルートハンドラーの前にスコープをハイドレートします。 |
| `disposeScope` | `scope.dispose()` | カスタムの破棄。 |
| `autoDispose` | `true` | `false` または `false` を返す述語は所有権を移譲します。 |
| `onDisposeError` | `console.error` | クリーンアップ失敗のシンク。 |

## ストリーミング

Hono のストリーミングヘルパーは、ストリームコールバックが終わる前に `Response` を返すことがあります。`skipInferdiDispose(c)` を呼び出し、ストリームのライフサイクルからスコープを破棄してください。

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

`skipInferdiDispose` は成功したレスポンスでのみクリーンアップを抑制します。エラーパスでは、それでも破棄します。
