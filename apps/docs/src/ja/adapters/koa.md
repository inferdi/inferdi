---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/adapters/koa#breadcrumb"
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
          "name": "Koa アダプター"
          "item": "https://inferdi.com/ja/adapters/koa"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/adapters/koa#article"
      "headline": "InferDI Koa アダプター — @inferdi/koa"
      "name": "Koa アダプター"
      "description": "@inferdi/koa は Koa v3 のミドルウェアです。1 つのリクエストスコープを作成し、ctx.state.di として公開し、Node のレスポンスが finish または close した後に破棄します。型付きの state キーとクリーンアップフックを備えています。"
      "url": "https://inferdi.com/ja/adapters/koa"
      "mainEntityOfPage": "https://inferdi.com/ja/adapters/koa"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Koa v3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Koa, Koa v3, ミドルウェア, ctx.state.di, レスポンスライフサイクル, 依存性注入"
      "articleSection": "アダプター"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "@inferdi/koa"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js >=18"
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

# Koa アダプター

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) は Koa v3 のミドルウェアです。1 つのリクエストスコープを作成し、それを `ctx.state.di` として公開し、Node レスポンスが finish または close した後に破棄します。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiScopeOf } from '@inferdi/koa'
```

## リクエストスコープ

```ts
const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    di: InferdiScopeOf<typeof root>
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  setupScope: (scope, ctx) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = ctx.get('x-user-id') || undefined
    request.ip = ctx.ip
  },
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## カスタム state キー

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState, type InferdiScopeOf } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<InferdiScopeOf<typeof root>, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({ container: root, key: 'container' }))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## オプション

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `container` | 必須 | ルートコンテナ。このミドルウェアによって破棄されることはありません。 |
| `key` | `'di'` | Koa の state キー。 |
| `createScope` | `root.createScope()` | カスタムのリクエストスコープ作成。 |
| `setupScope` | なし | ダウンストリームのミドルウェアの前にスコープをハイドレートします。 |
| `disposeScope` | `scope.dispose()` | カスタムの破棄。 |
| `autoDispose` | `true` | `false` または `false` を返す述語は所有権を移譲します。 |
| `onDisposeError` | `ctx.app.emit('error')` | クリーンアップ失敗のシンク。 |

## ストリーミング

通常の Koa ストリームボディにはスキップは不要です。アダプターは `finish` または `close` を待ちます。

`skipInferdiDispose(ctx)` は、バックグラウンド作業など、アプリケーションコードが意図的にスコープを HTTP レスポンスの境界を超えて保持する場合にのみ使用してください。

```ts
import { skipInferdiDispose } from '@inferdi/koa'

app.use(async (ctx) => {
  skipInferdiDispose(ctx)
  const scope = ctx.state.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  ctx.body = { status: 'queued' }
})
```

ダウンストリームのエラーは常にスコープを破棄します。成功したスキップ済みリクエストはアプリケーション所有になります。
