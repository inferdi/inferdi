---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/performance#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "ガイド"
          "item": "https://inferdi.com/ja/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "パフォーマンス"
          "item": "https://inferdi.com/ja/guide/performance"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/performance#article"
      "headline": "InferDI パフォーマンス：ウォームな解決は 1 回の Map.get() を使う"
      "name": "パフォーマンス"
      "description": "InferDI が依存解決をほぼゼロオーバーヘッドに保つ仕組み — 明示的な登録、キャッシュされたシングルトンとスコープ付きサービス、0〜7 個の依存に対する直接のコンストラクター呼び出し、そして Promise キャッシュされた非同期ファクトリー。リフレクション、メタデータテーブル、プロキシは介在しません。"
      "url": "https://inferdi.com/ja/guide/performance"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/performance"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, パフォーマンス, ベンチマーク, ゼロオーバーヘッド, ホットパス, 依存性注入, V8, Map.get"
      "articleSection": "ガイド"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
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

# パフォーマンス

ウォームな解決は、1 回の `Map.get(key)` に続く直接的な `new Ctor(...)` です — リフレクションも、メタデータテーブルも、間に挟まるプロキシもありません。以下のベンチマーク数値は、オプトインで有効にする特別な高速モードからではなく、いくつかの具体的なランタイム上の選択から導かれたものです。

| ランタイム上の選択 | 効果 |
| --- | --- |
| 明示的な登録 | コンテナのビルドはサービスごとのフラットな `Map.set` です。準備すべきデコレーターの副作用も、コンストラクター名のパーサーも、メタデータテーブルもありません。 |
| シングルトンおよびスコープドサービスのキャッシュ | ウォームな解決は、サイクルとライフタイムの管理処理が実行される前に `cache.get(key)` から読み取ります。`cache.has(key)` のフォールバックは明示的な `undefined` 値のためだけに存在します。 |
| 直接的なコンストラクター呼び出し | 依存が 0〜7 個のクラスは直接的な `new Ctor(...)` の経路を使用します。より大きなコンストラクターは `Reflect.construct` にフォールバックします。 |
| 非同期ファクトリー | ファクトリーの `Promise` はそのままキャッシュされるため、`.get()` が同期のままで、並行する呼び出し元は進行中の初期化を 1 つ共有します。 |
| strict モードの境界 | `strict: true` はサイクルとライフタイムのリークを検出し、正確な親チェーンを走査するため、ツリーの変更が直ちに反映されます。`strict: false` は、監査済みで不変のプロダクショングラフを信頼します。 |

![ベンチマーク結果](/benchmarking_results.png)

## ベンチマークスイート

リポジトリのベンチマークスイートは、InferDI を InversifyJS v8、PROXY および CLASSIC モードの Awilix v13、TSyringe v4、TypeDI v0.10、そして Typed Inject v5 と比較します。

すべての数値は Node 22 における 1 秒あたりの操作回数です。高いほど良好です。

| シナリオ | InferDI | InversifyJS | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. ホットなシングルトンの解決**（ウォームキャッシュ） | **14.3 M** | 10.7 M | 7.0 M | 7.3 M | 6.7 M | 5.8 M | 6.45 M |
| **2. トランジェントの解決**（呼び出しごとに新しいインスタンス） | **9.75 M** | 6.1 M | 4.1 M | 3.45 M | 3.0 M | 2.5 M | 1.6 M |
| **3. 深いグラフ**（10 階層、すべてトランジェント） | **2.3 M** | 1.5 M | 1.3 M | 716 k | 736 k | 643 k | 222 k |
| **4a. 広いグラフ**（4 依存、ルートがトランジェント） | **8.25 M** | 4.9 M | 3.4 M | 2.2 M | 2.3 M | 1.65 M | 1.1 M |
| **4b. 広いグラフ**（10 依存、ルートがトランジェント） | **3.5 M** | 1.9 M | 2.6 M | 1.2 M | 1.3 M | 938 k | 458 k |
| **5. コンテナのビルド + 最初の解決** | **400 k** | 13.2 k | 223 k | 10 k | 8.3 k | 206 k | 282 k |
| **6. スコープドのライフサイクル**（作成 + 解決 + クリーンアップ） | **2.85 M** | 35 k | 2.45 M | 330 k | 430 k | 1.1 M | 665 k |
| **7. 遅延解決**（遅延ラッパー） | **11.8 M** | 7.6 M | 7.15 M | 5.6 M | 4.7 M | 4.25 M | 2.85 M |

## 数値が示すもの

- キャッシュされたシングルトンの解決は、最も近いベースラインである InversifyJS より 1.34 倍高速です。
- コンテナのビルドと最初の解決はフラットな登録に有利です。InferDI はグラフをゼロから登録します。デコレーターベースのライブラリは、モジュールの評価中に登録作業の一部をすでに支払い済みです。
- 広いグラフのシナリオは、アリティのアンローリングがなぜ重要かを示しています。4 個の依存では、InferDI は最も近いベースラインより 1.68 倍高速です。10 個の依存では `Reflect.construct` にフォールバックし、Typed Inject より 1.35 倍高速です。
- スコープドのライフサイクルには、スコープの作成、解決、そしてクリーンアップが含まれます。シナリオ 6 は反復のたびに破棄処理を含むため、解決単独ではなくスコープの所有を測定します。
- InferDI は全 8 シナリオで首位です。スコープドのフローと 10 個の依存を持つ広いグラフでは Typed Inject が最も近い非 InferDI のベースラインであり、キャッシュされたシングルトン、トランジェント、深いグラフ、4 個の依存を持つ広いグラフでは InversifyJS が最も近い位置にあります。

## 高速モード

`new Container({ strict: false })` は、ランタイムのサイクル管理、シングルトンスタックの追跡、そしてガードされた解決経路を囲む `try`/`finally` を取り除きます。fast scope は不変のルートレジストリを直接参照して親チェーンの走査を避け、委譲された singleton を scope のキャッシュへ反映します。strict scope はローカルミスのたびに正確な親チェーンを走査するため、scope ごとのルックアップメタデータや無効化管理なしで変更が反映されます。fast モードでは登録時の防御的な無効化も省略されます。owned インスタンスの同一性による重複排除は、作成時にキューを走査せず、両モードとも disposal 時に一度だけ実行されます。

高速モードは、デフォルトの strict モードでテストがグラフを十分に実行した後にのみ使用してください。TypeScript はシングルトンのサイクル、トランジェントのサイクル、動的キー、`as` キャスト、あるいはより広い外側のコンテナをクロージャに取り込むファクトリーを見ることができません。単一の線形 fluent チェーンで各ランタイムキーを一度だけ登録し、最初の解決または scope 作成前に登録を完了し、起動後のツリーを不変に保ち、祖先より先に子 scope を破棄してください。

プロファイリング済みのプロダクションパスでは、その検証後の `{ strict: false }` がサポート対象で最速の構成です。開発、テスト、ホットリロード、および起動後に変更されるツリーでは strict モードを維持してください。

## ホットパスの細かな詳細

シンボルキーは、`Map` がそれらを同一性で比較するため、タイトな解決ループで役立つことがあります。文字列キーはハッシュ化が必要で、衝突時には文字単位の比較が必要です。ほとんどのアプリケーションでは差を計測できないため、シンボルキーはプロファイラー主導の変更として扱ってください。

## ローカルで再現する

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

ベンチマークのワークスペースは意図的にルートの pnpm ワークスペースから分離されており、独自のロックファイルを持っています。方法論、公平性に関する注記、そしてフィクスチャのソースについては [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) を参照してください。
