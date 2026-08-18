# Fastify アダプター

[`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) は Fastify v5 のプラグインです。スコープドモードでは、ルートを `app.di` として公開し、`onRequest` で 1 つのリクエストスコープを作成し、それを `request.di` として公開し、`onResponse` で破棄します。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
```

```ts
import Fastify, { type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'
```

## リクエストスコープ

モジュール拡張（module augmentation）で具体的なコンテナ型を公開します。

```ts
const root = buildRootContainer()
const app = Fastify()

type RootContainer = typeof root
const openRequestScope = (request: FastifyRequest) => root.createScope({
  request: {
    requestId: request.id,
    ip: request.ip
  }
})
type RequestContainer = ReturnType<typeof openRequestScope>

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

await app.register(inferdiFastify, {
  container: root,
  createScope: (_root, request) => openRequestScope(request),
  disposeRootOnClose: true
})

app.get('/users/:id', async (request) => {
  const { id } = request.params as { id: string }
  return request.di.get('users').profile(id)
})
```

Fastify の `app.register` は、インラインフックに対してプラグインのジェネリクスを十分に深く推論できないため、具体的なスコープ型が必要な場合はフックのパラメータに型注釈を付けてください。

## オプション

| オプション | デフォルト | 説明 |
| --- | --- | --- |
| `container` | 必須 | `app.di` として公開されるルートコンテナ。 |
| `scopePerRequest` | `true` | ルート専用モードにするには `false` を設定します。 |
| `createScope` | `root.createScope()` | カスタムのリクエストスコープ作成。非同期でもかまいません。 |
| `setupScope` | なし | スコープ作成後に追加の初期化を行います。 |
| `disposeScope` | `scope.dispose()` | カスタムの破棄。同期でも非同期でもかまいません。 |
| `autoDispose` | `true` | `false` または `false` を返す述語は、所有権をアプリケーションコードに移譲します。 |
| `disposeRootOnClose` | `false` | `fastify.close()` 中にルートを破棄します。 |
| `onDisposeError` | `request.log.error` | リクエストスコープの破棄失敗のシンク。 |

## ルート専用モード

ハンドラーがシングルトンサービスのみを必要とする場合は、ルート専用モードを使用します。

```ts
await app.register(inferdiFastify, {
  container: root,
  scopePerRequest: false,
})

app.get('/health', async function () {
  return this.di.get('health').check()
})
```

ルート専用モードは、リクエストデコレーションもリクエストライフサイクルフックもインストールしません。

## ライフサイクルに関する注意

- `request.di` は、セットアップが成功した後にのみ公開されます。
- セットアップの失敗は、構築途中のスコープを破棄し、元のセットアップエラーのみを表面化します。
- クリーンアップフックは、実行中に `request.di` を参照します。
- 失敗したリクエストは `skipInferdiDispose` を無視し、`autoDispose` に従いつつ、それでもスコープを破棄します。
- クライアント中断のクリーンアップは、スコープが公開された後に `onRequestAbort` で実行されます。
- ルートの破棄エラーは、`disposeRootOnClose` が有効な場合にのみ `fastify.close()` を通じて伝播します。
