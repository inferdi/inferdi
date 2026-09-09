---
layout: home
description: "実行時依存とデコレーターを使わず、依存グラフ、ライフタイム、スコープ境界をコンパイル時に検証する DI コンテナーです。"

hero:
  name: InferDI
  text: モダンな TypeScript のための強力な型付き DI
  tagline: サービスを明示的に登録し、TypeScript で依存グラフを検証し、小さな実行時解決パスを維持します。
  image:
    src: /logo.png
    alt: InferDI
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide/quick-start
    - theme: alt
      text: GitHub で見る
      link: https://github.com/inferdi/inferdi

features:
  - icon:
      src: /react.png
      alt: React
    title: React
    details: >-
      React 19 アダプターは、コンテキストと Suspense 対応のサービスフックを通じて、正確なコンテナー型を公開します。管理対象の子スコープはコミット後に作成され、自動的に破棄されます。
    link: /ja/adapters/react
    linkText: React アダプター
  - icon:
      src: /fastify.png
      alt: Fastify
    title: Fastify
    details: >-
      Fastify は速度のために作られており、DI 層はその邪魔をすべきではありません。Fastify v5 アダプターはプラグインとフックに組み込まれ、onRequest で型付きのリクエストスコープを作成し、onResponse でそれをクリーンアップします。
    link: /ja/adapters/fastify
    linkText: Fastify アダプター
  - icon:
      src: /hono.png
      alt: Hono
    title: Hono
    details: >-
      エッジアプリには薄いグルーと素早い起動が必要です。Hono v4 アダプターはリクエストスコープをコンテキスト変数に保存し、Workers や Bun のデプロイに適合し、ネットワーク境界で厳格な型を維持します。
    link: /ja/adapters/hono
    linkText: Hono アダプター
  - icon:
      src: /koa.png
      alt: Koa
    title: Koa
    details: >-
      Koa はミドルウェアチェーンが小さく明示的なときに最も力を発揮します。Koa v3 アダプターは非同期の制御フローを隠すことなく、型付きスコープを通じてリクエストコンテキストをサービスに結び付けます。
    link: /ja/adapters/koa
    linkText: Koa アダプター
  - icon:
      src: /express.png
      alt: Express
    title: Express
    details: >-
      Express 5 は今でも多くの Node アプリにとって馴染みのあるデフォルトです。このアダプターはそうしたミドルウェアチェーンに型付きのリクエストスコープを与え、サービスがグローバル変数や手作りのファクトリー、散らばったインポートを通じて漏れ出すのを防ぎます。
    link: /ja/adapters/express
    linkText: Express アダプター
  - icon:
      src: /elysia.png
      alt: Elysia
    title: Elysia
    details: >-
      Elysia v1 は Bun アプリに鋭いルート型をすでに提供しています。アダプターはその型チェーンをサービスへと運び、各リクエストを DI スコープに結び付けるので、オートコンプリートがハンドラーからビジネスロジックまでの経路を追従します。
    link: /ja/adapters/elysia
    linkText: Elysia アダプター
---
