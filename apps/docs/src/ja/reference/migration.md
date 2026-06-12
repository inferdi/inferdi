# マイグレーション

InferDI は破壊的変更をメジャーバージョンごとに記録しています。信頼できる情報源は引き続き [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md) ですが、現在のマイグレーションパスをここに要約します。

## 5.0 へのマイグレーション

v5 はアダプターのリリースです。コアパッケージは変更されていません。バージョンの引き上げは、すべての公開パッケージをロックステップに保ち、フレームワークアダプターを 1 つのクリーンアップ契約の周りに揃えるためのものです。

アダプターの契約は、現在これらのルールを共有しています。

- `createScope`、`setupScope`、`disposeScope`、`autoDispose`、`onDisposeError` は同じ語彙を使います。
- `MaybePromise`、`InferdiScope`、`InferdiRoot`、`InferdiScopeOf` はすべてのアダプターでエクスポートされます。
- `setupScope` が失敗した場合、アダプターは元のセットアップエラーのみを表面化します。
- セットアップのクリーンアップ中のクリーンアップ失敗は、`onDisposeError` またはアダプターのシンクへ送られます。
- 失敗したリクエストは、`skipInferdiDispose` の後であってもそのスコープを破棄します。ただし、文書化された Express の制限を除きます。
- クリーンアップフックは、実行中に公開スコープスロットを参照します。

### アダプターに関する注意

| パッケージ                                                                             | マイグレーションの注意点                                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | `logDisposeError` を `onDisposeError` にリネームします。`InferdiScope.dispose()` は `void` または `Promise<void>` を返す場合があります。`disposeScope`、`autoDispose`、`skipInferdiDispose`、`InferdiScopeOf` が追加されました。 |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)    | `next()` の後のクリーンアップ失敗はログに記録されるか `onDisposeError` に送られます。これらはもはや成功したレスポンスを置き換えません。セットアップのクリーンアップはもはや `AggregateError` をスローしません。                            |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` は、セットアップのクリーンアップとレスポンス完了に対するエラーごとのシンクになりました。Express は、処理済みのルートエラーでスキップされたスコープを強制破棄できません。                                        |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)     | セットアップのクリーンアップはセットアップエラーのみを表面化します。下流のエラーは `skipInferdiDispose(ctx)` の後でも破棄を行います。                                                                                    |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)  | セットアップのクリーンアップはセットアップエラーのみを表面化します。クリーンアップの失敗は `onDisposeError` または `console.error` に送られます。                                                                                         |

## 4.0 へのマイグレーション

v4 は `Lazy<T>` のライフタイムセマンティクスを厳格化します。管理された遅延コンパニオンは、ターゲットのライフタイムを保持するようになりました。シングルトンは `Lazy<singleton>` のみを注入できます。

主な変更点:

- `AllowedDeps<T, 'singleton'>` は、任意の `Lazy<V>` をもはや受け付けません。
- `LazySpec<V, TargetKind>` は、明示的なコンテナおよびモジュールの形のための公開型になりました。
- ランタイムの遅延の除外は、ターゲットの種類が `singleton` の場合にのみ適用されます。
- `Lazy<scoped>` または `Lazy<transient>` を注入していたシングルトンは、ターゲットのライフタイムか消費者のライフタイムのいずれかを変更しなければなりません。

よくある修正:

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## 3.0 へのマイグレーション

v3 はライフタイムの安全性を型システムへと移します。ランタイムの動作は互換性を保ち、厳格なランタイムガードは引き続き多層防御として残ります。

主な変更点:

- `DependenciesMap` のエントリーは、素のサービス型ではなく `Spec<V, Kind>` になりました。
- `RegistrationKind`、`Spec<V, K>`、`SpecMap<M, K>` が公開エクスポートになりました。
- `registerFactory` は、シングルトンファクトリーに対して `c` パラメーターを絞り込みます。
- `registerClass` は、シングルトン登録に対して `deps` をフィルターします。
- `override(key, value)` は、元のライフタイムの種類を保持します。
- `new Container({ strict: false })` は、依存グラフの監査後にランタイムの循環ガードとライフタイムガードを無効化できます。

よくある修正:

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## 2.0 へのマイグレーション

v2 には 2 つの機械的な破壊的変更があります。

### `container.cradle` が削除されました

`.get(key)` を使ってください。

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` が `lazyKey` になりました

コンパニオンキーを渡してください。

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

v2 では、すべての登録メソッドに文字列またはシンボルのキーが追加され、破棄された祖先の診断も改善されました。

## バージョンのロックステップ

公開されているすべての InferDI パッケージは、同じバージョンを共有します。

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)

アダプターをアップグレードする際は、アダプターパッケージと [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) を一致するメジャーバージョンに保ってください。

## アップグレードのチェックリスト

1. 通過するすべてのメジャーバージョンのマイグレーションノートを読みます。
2. [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) とインストール済みのすべてのアダプターを一緒にアップグレードします。
3. 依存グラフの形の変化を捕捉するため、型テストまたは `tsc --noEmit` を実行します。
4. strict モードでランタイムテストを実行します。
5. `skipInferdiDispose`、`autoDispose: false`、またはカスタムの `disposeScope` を使っている場合は、リクエストスコープの所有権を見直します。

## 安定した境界

コアパッケージは引き続きデコレーターフリーで、ゼロ依存です。フレームワークのライフサイクルの動作は、[`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) ではなく、アダプターパッケージに存在します。
