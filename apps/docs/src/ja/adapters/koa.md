# Koa アダプター

[`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) は Koa v3 のミドルウェアです。1 つのリクエストスコープを作成し、それを `ctx.state.di` として公開し、Node レスポンスが finish または close した後に破棄します。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
```

```ts
import Koa from 'koa'
import { inferdiKoa, type InferdiKoaState } from '@inferdi/koa'
```

## リクエストスコープ

```ts
const root = buildRootContainer()
const openRequestScope = (request: RequestContext) =>
  root.createScope({ request })
type RequestScope = ReturnType<typeof openRequestScope>

declare module 'koa' {
  interface DefaultState {
    di: RequestScope
  }
}

const app = new Koa()

app.use(inferdiKoa({
  container: root,
  createScope: (_root, ctx) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: ctx.get('x-user-id') || undefined,
    ip: ctx.ip
  })
}))

app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
```

## カスタム state キー

```ts
import type { DefaultState, ParameterizedContext } from 'koa'
import { type InferdiKoaState } from '@inferdi/koa'

type AppState =
  & DefaultState
  & InferdiKoaState<RequestScope, 'container'>

type AppContext = ParameterizedContext<AppState>

app.use(inferdiKoa({
  container: root,
  key: 'container',
  createScope: (_root, ctx) => openRequestScope({
    requestId: crypto.randomUUID(),
    userId: ctx.get('x-user-id') || undefined,
    ip: ctx.ip
  })
}))

app.use(async (ctx: AppContext) => {
  ctx.body = await ctx.state.container.get('users').profile('42')
})
```

## オプション

| オプション            | デフォルト                   | 説明                                   |
|------------------|-------------------------|--------------------------------------|
| `container`      | 必須                      | ルートコンテナ。このミドルウェアによって破棄されることはありません。   |
| `key`            | `'di'`                  | Koa の state キー。                      |
| `createScope`    | `root.createScope()`    | カスタムのリクエストスコープ作成。                    |
| `setupScope`     | なし                      | スコープ作成後に追加の初期化を行います。                 |
| `disposeScope`   | `scope.dispose()`       | カスタムの破棄。                             |
| `autoDispose`    | `true`                  | `false` または `false` を返す述語は所有権を移譲します。 |
| `onDisposeError` | `ctx.app.emit('error')` | クリーンアップ失敗のシンク。                       |

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
