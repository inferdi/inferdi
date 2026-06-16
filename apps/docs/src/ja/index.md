---
layout: home

hero:
  name: InferDI
  text: モダンな TypeScript のための唯一の超高速 DI
  tagline: 超高速なアーキテクチャ、クリーンなドメインロジック、そして一級のテスタビリティを備えた次世代 DI で、あらゆるモダンランタイム向けのアプリを構築しましょう。
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
  - icon:
      src: /puzzle.png
      alt: Framework-agnostic core
    title: フレームワーク非依存のコア
    details: "InferDI は依存ゼロで、どこでも動作します — Node、Bun、Deno、ブラウザ、ワーカー。アダプターはオプションのリクエストスコープ用グルーであり、決して必須ではありません。"
    link: /ja/adapters/
    linkText: アダプターの仕組み
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "WebSite"
      "@id": "https://inferdi.com/#website"
      "url": "https://inferdi.com/ja/"
      "name": "InferDI"
      "description": "モダンな TypeScript のための、超高速・デコレーター不要・強い型付けの依存性注入。"
      "inLanguage": "ja-JP"
      "publisher":
        "@id": "https://inferdi.com/#organization"
      "potentialAction":
        "@type": "SearchAction"
        "target":
          "@type": "EntryPoint"
          "urlTemplate": "https://inferdi.com/?q={search_term_string}"
        "query-input": "required name=search_term_string"
    - "@type": "Organization"
      "@id": "https://inferdi.com/#organization"
      "name": "InferDI"
      "url": "https://inferdi.com/"
      "logo":
        "@type": "ImageObject"
        "url": "https://inferdi.com/logo.png"
      "sameAs":
        - "https://github.com/inferdi/inferdi"
        - "https://twitter.com/inferdi_ts"
    - "@type": "SoftwareApplication"
      "@id": "https://inferdi.com/#software"
      "name": "InferDI"
      "applicationCategory": "DeveloperApplication"
      "operatingSystem": "Node.js, Bun, Deno, Browser, Edge runtimes"
      "softwareVersion": "5.0.2"
      "programmingLanguage": "TypeScript"
      "url": "https://inferdi.com/"
      "downloadUrl": "https://www.npmjs.com/package/@inferdi/inferdi"
      "description": "TypeScript 向けの依存ゼロ・デコレーター不要・強い型付けの DI コンテナ。依存グラフがそのまま型になります。引数の順序の誤り、欠落したキー、ライフタイムの漏れは、ランタイム例外ではなくコンパイルエラーになります。"
      "license": "https://github.com/inferdi/inferdi/blob/main/LICENSE"
      "author":
        "@id": "https://inferdi.com/#organization"
---
