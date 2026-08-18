# マイグレーション

InferDI は破壊的変更をメジャーバージョンごとに記録しています。信頼できる情報源は引き続き [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md) ですが、現在のマイグレーションパスをここに要約します。

## 6.0 へのマイグレーション

この要約は安定版 `5.0.7` からのアップグレードを前提としています。
インストール済みのすべての `@inferdi/*` パッケージを `6.0.0` に更新してください。
アダプターは `@inferdi/inferdi@^6.0.0` を要求します。

- `RegistrationKind` を `Lifetime` に、`Spec.kind` を `Spec.lifetime` に置き換えます。deprecated alias はありません。
- 安定版 v5 には deps-aware な `registerFactory` overload がありませんでした。V6 は `registerFactory(key, factory, deps, ...)` を追加します。引数の並べ替えが必要なのは、プレリリース形式の `registerFactory(key, deps, factory, ...)` を使用した場合だけです。同期ファクトリーのコンパニオンには `'singleton'` を含む明示的なライフタイムが必要です。
- v5 の `{strict: false}` を `{fast: true}` に、`{strict: true}` をデフォルトまたは `{fast: false}` に置き換えます。boolean の極性は反転します。プレリリースの `mode` オプションは削除されました。
- 名前付き `Module<TRequirements, TProvides>` は追加登録を含む実際のグラフを受け入れて保持し、要件を厳密に検査し、出力衝突を拒否します。`new Container(parent)` は非公開になり、子は `createScope()` で作成します。
- 登録は、既存の主キーまたは lazy キーと重複する可能性があるキー型を拒否します。broad / union キーを新しい候補へ絞り込むか、意図した置き換えには `.override()` を使用してください。
- V6 は `declareScopeInputs<Inputs>()` と `createScope(inputs)` による type-only のスコープ入力を追加します。既存の引数なしスコープは v5 の動作を維持します。
- V6 は宣言的 async 依存関係向けに `registerAsyncFactory`、`AsyncSpec`、`getAsync()` を追加します。Promise-valued な `registerFactory` は同期グラフサービスのままで、引き続き `get()` で解決します。
- 依存の失敗が複数のキャッシュ済み Promise へ伝播した場合、async teardown は共有された rejection オブジェクトを一度だけ報告します。sync teardown は async 誤用エラーをスローする前にネイティブ Promise の rejection を監視します。

### ジェネリック resolver では準備済みキーを使う

`.get()` は、必要なスコープ入力が提供済みの同期キーを受け付けます。スコープ入力を持たない具体的なコンテナでは、同期キー集合は変わりません。`K extends keyof T` を使うジェネリック helper は準備状態と async 状態を保持する必要があります。

```ts
// Before
function resolve<T extends DependenciesMap, K extends keyof T>(
  container: Container<T>,
  key: K
) {
  return container.get(key)
}

// After
function resolve<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}
```

`getAsync()` を呼ぶジェネリック helper では `Container.ReadyKeys<Container<T>>` を使います。ジェネリックな `T extends DependenciesMap` は、宣言的 async エントリーや不足するスコープ入力によってブロックされたサービスを含む場合があります。

### Lazy コンパニオンでは named spec を使う

`LazySpec` は private な type-only mode brand を持つようになり、v6 では
`AsyncLazySpec` も追加されました。明示的な `Container` / `Module` shape
では `{type, lifetime, lazyOf}` を再現せず、これらの named export を使います。
brand に runtime field はありません。

`registerAsyncFactory` の第 5 引数 `lazyKey` は `AsyncLazy<T>` を生成します。
Async クラスも同じ wrapper を使い、sync/async mixed クラスは
`Lazy<T> | AsyncLazy<T>` を公開します。Promise-valued `registerFactory` は
`Lazy<Promise<T>>` のままです。`Container.ResolveUnwrapped` は管理対象の各
mode を distributive に展開します。

新しいキー集合は [API サマリー](./api)、[スコープ入力](../core/scope-inputs)、[非同期依存関係](../core/async-dependencies)を参照してください。

## 5.0 へのマイグレーション

最初の v5 リリースはアダプターのみを対象としていました。バージョンの引き上げは、すべての公開パッケージをロックステップに保ち、フレームワークアダプターを 1 つのクリーンアップ契約の周りに揃えるためのものです。後続の v5 ビルドでは、子スコープの所有権を適用し、以下の `{fast: true}` 契約も厳格化します。

アダプターの契約は、現在これらのルールを共有しています。

- `createScope`、`setupScope`、`disposeScope`、`autoDispose`、`onDisposeError` は同じ語彙を使います。
- `MaybePromise`、`InferdiScope`、`InferdiRoot`、`InferdiScopeOf` はすべてのアダプターでエクスポートされます。
- `setupScope` が失敗した場合、アダプターは元のセットアップエラーのみを表面化します。
- セットアップのクリーンアップ中のクリーンアップ失敗は、`onDisposeError` またはアダプターのシンクへ送られます。
- 失敗したリクエストは、`skipInferdiDispose` の後であってもそのスコープを破棄します。ただし、文書化された Express の制限を除きます。
- クリーンアップフックは、実行中に公開スコープスロットを参照します。

### Scoped の解決には子スコープが必要

デフォルトの `{fast: false}` では、ルートコンテナから scoped キーを解決すると `Scoped "key" cannot be resolved from the root container. Use createScope().` がスローされます。`const scope = root.createScope()` で子コンテナを作成し、`scope.get(scopedKey)` を呼び出して、対応するライフサイクル境界で子コンテナを破棄してください。`{fast: true}` はこのランタイムガードを省略しますが、scoped サービスは子スコープから解決する必要があります。

### `fast: true` の固定グラフ契約

`new Container({fast: true})` は、scope から不変のルートレジストリを
直接参照して親チェーンの走査を避け、委譲された singleton を scope の
キャッシュへ反映します。strict scope はルックアップのスナップショットを
保持せず、ローカルミスのたびに正確な親チェーンを走査するため、scope
ごとのメタデータや無効化管理なしで変更が反映されます。owned
インスタンスの同一性による重複排除は両モードとも disposal 時に実行
されます。単一の線形 fluent チェーンで各ランタイムキーを一度だけ登録し、
最初の解決または scope 作成前に登録を完了し、起動後のツリーを不変に
保ち、祖先より先に子 scope を破棄してください。ホットリロードや起動後に
変更されるツリーでは `{fast: false}` を使用します。

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

v3 はライフタイムの安全性を型システムへと移します。ランタイムの動作は互換性を保ち、デフォルトのランタイムガードは引き続き多層防御として残ります。

主な変更点:

- `DependenciesMap` のエントリーは、素のサービス型ではなく `Spec<V, Kind>` になりました。
- `RegistrationKind`、`Spec<V, K>`、`SpecMap<M, K>` が公開エクスポートになりました。
- `registerFactory` は、シングルトンファクトリーに対して `c` パラメーターを絞り込みます。
- `registerClass` は、シングルトン登録に対して `deps` をフィルターします。
- `override(key, value)` は、元のライフタイムの種類を保持します。
- `new Container({fast: true})` は、依存グラフの監査後にランタイムの循環ガードとライフタイムガードを無効化できます。

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
4. デフォルトの checked 契約でランタイムテストを実行します。
5. `skipInferdiDispose`、`autoDispose: false`、またはカスタムの `disposeScope` を使っている場合は、リクエストスコープの所有権を見直します。

## 安定した境界

コアパッケージは引き続きデコレーターフリーで、ゼロ依存です。フレームワークのライフサイクルの動作は、[`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) ではなく、アダプターパッケージに存在します。
