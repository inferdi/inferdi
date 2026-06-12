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
