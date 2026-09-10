# 構成ルート

構成ルートは、具体的な実装を選んで接続するアプリケーション境界です。ドメインコードは必要な契約を示し、インフラストラクチャが実装を提供します。InferDI は組み立てコードだけに現れます。

## ドメインの契約

ユースケースが依存するインターフェースはドメイン側に置きます。このファイルはコンテナーもフレームワークも import しません。

::: code-group

<<< ../../../snippets/composition/domain.ts [domain.ts]

:::

## インフラストラクチャ実装

インフラストラクチャがドメイン契約を実装します。実際のアダプターならデータベースクライアントを使いますが、この例では呼び出しを小さく保っています。

::: code-group

<<< ../../../snippets/composition/infrastructure.ts [infrastructure.ts]

:::

## アプリケーションの構成

InferDI を import するのはこのファイルだけです。`PostgresUserStore` を選び、DSN を渡し、`GetGreeting` へ接続します。

::: code-group

<<< ../../../snippets/composition/container.ts [container.ts]

:::

登録タプルは各コンストラクターと照合されます。`GetGreeting` や `PostgresUserStore` を変更すると、古くなった配線がこの境界でエラーになります。

## 境界でサービスを使う

HTTP ルート、CLI コマンド、キューコンシューマーがトップレベルのサービスを解決します。業務処理は通常のメソッドを呼ぶだけです。

::: code-group

<<< ../../../snippets/composition/entry.ts [entry.ts]

:::

処理にリクエストやジョブの入力が必要なら、ここで子スコープを開きます。同じ境界で破棄するか、フレームワークアダプターにライフサイクルとの接続を任せてください。

## ドメインを直接テストする

単体テストはコンテナーを作りません。偽の `UserStore` を、本番と同じ `GetGreeting` クラスへ渡します。

::: code-group

<<< ../../../snippets/composition/domain.test.ts [domain.test.ts]

:::

実際の構成グラフを動かしつつ 1 実装だけ差し替える統合テストでは `.override()` を使えます。単一のドメインサービスなら直接構築する方が明快です。続きは[テストとオーバーライド](../core/testing)を参照してください。
