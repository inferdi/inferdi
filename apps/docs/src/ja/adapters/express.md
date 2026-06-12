# Express アダプター

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) は Express 5 のミドルウェアです。1 つのリクエストスコープを作成し、それを `req.di` として公開し、Node レスポンスが finish または close した後に破棄します。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
```

## リクエストスコープ

```ts
const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  setupScope: (scope, req) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = req.get('x-user-id') || undefined
    request.ip = req.ip
  },
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

このアダプターは、`Express.Request` を `any`、`unknown`、またはベースコンテナでグローバルに拡張することはありません。アプリケーションが自身の具体的なリクエスト型を所有します。

## オプション

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `container` | 必須 | ルートコンテナ。このミドルウェアによって破棄されることはありません。 |
| `createScope` | `root.createScope()` | カスタムのリクエストスコープ作成。 |
| `setupScope` | なし | ルートハンドラーの前にスコープをハイドレートします。 |
| `disposeScope` | `scope.dispose()` | カスタムの破棄。 |
| `autoDispose` | `true` | `false` または `false` を返す述語は所有権を移譲します。 |
| `onDisposeError` | `console.error` | クリーンアップ失敗のシンク。 |

## ストリーミングとバックグラウンド作業

通常の Express ストリームレスポンスにはスキップは不要です。アダプターが `finish` または `close` を待つためです。

作業が意図的に HTTP レスポンスより長く生き残る場合は、`skipInferdiDispose(req)` を使用してください。

```ts
import { skipInferdiDispose } from '@inferdi/express'

app.get('/background', (req, res) => {
  skipInferdiDispose(req)
  const scope = req.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  res.status(202).json({ status: 'queued' })
})
```

## 失敗したリクエストに関する注意点

他のアダプターとは異なり、Express は処理済みのルートエラーに対して、スキップされたスコープを確実に強制破棄することができません。Express のミドルウェアはコールバックスタイルです。`next()` が戻った後、アダプターは後でエラーハンドラーによって処理されたダウンストリームの例外を観測できません。ルートが `skipInferdiDispose(req)` を呼び出してから失敗した場合、スコープはアプリケーション所有のままになります。自身のエラーパスからそれを破棄するか、スキップとスローし得るルートを組み合わせるのを避けてください。
