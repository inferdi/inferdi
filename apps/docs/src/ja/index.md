---
layout: home
description: "実行時依存とデコレーターを使わず、依存グラフ、ライフタイム、スコープ境界をコンパイル時に検証する DI コンテナーです。"
---

<script setup>
import HomeShowcase from '../../.vitepress/theme/HomeShowcase.vue'
</script>

<HomeShowcase locale="ja" />

## TypeScript がグラフ全体を把握

登録するたびに新しいコンテナー型が返され、キー、値、ライフタイム、非同期エッジ、スコープ要件が記録されます。

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(readonly logger: Logger, readonly database: Database) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

<div class="value-grid">
  <a href="/ja/core/type-safety"><strong>コンストラクターの形</strong><span>キーは引数の型と順序に一致する必要があります。</span></a>
  <a href="/ja/core/lifetime-guards"><strong>ライフタイム</strong><span>singleton は scoped や transient の値を取り込めません。</span></a>
  <a href="/ja/core/scope-inputs"><strong>スコープの準備状態</strong><span>依存サービスを解決する前にリクエスト値が必要です。</span></a>
  <a href="/ja/core/async-dependencies"><strong>非同期エッジ</strong><span>非同期状態は依存グラフ型を通じて伝播します。</span></a>
</div>

## フレームワークアダプター

<div class="adapter-grid">
  <a href="/ja/adapters/react"><img src="/react.png" alt=""><strong>React 19</strong><span>型付きコンテキスト、Suspense フック、管理対象スコープ。</span></a>
  <a href="/ja/adapters/fastify"><img src="/fastify.png" alt=""><strong>Fastify 5</strong><span>リクエストごとの型付きスコープとライフサイクルでの破棄。</span></a>
  <a href="/ja/adapters/hono"><img src="/hono.png" alt=""><strong>Hono 4</strong><span>Workers、Bun、Node 向けの型付きコンテキスト変数。</span></a>
  <a href="/ja/adapters/koa"><img src="/koa.png" alt=""><strong>Koa 3</strong><span>ミドルウェアのライフサイクルに沿うリクエストスコープ。</span></a>
  <a href="/ja/adapters/express"><img src="/express.png" alt=""><strong>Express 5</strong><span>ミドルウェアとルート向けの型付きリクエストスコープ。</span></a>
  <a href="/ja/adapters/elysia"><img src="/elysia.png" alt=""><strong>Elysia 1</strong><span>ルート型をリクエストサービスまで運びます。</span></a>
</div>

<section class="home-next" aria-labelledby="home-next-title">
  <p class="home-next-kicker">次のステップ</p>
  <h2 id="home-next-title">構成ルートから始める</h2>
  <p>依存グラフを一か所にまとめると、選択した内容を確認し、変更しやすくなります。</p>
  <div class="home-next-links">
    <a class="primary" href="/ja/guide/quick-start">最初のグラフを作る <span aria-hidden="true">↗</span></a>
    <a href="/ja/guide/composition-root">構成ルート <span aria-hidden="true">→</span></a>
  </div>
</section>
