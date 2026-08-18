# InferDI コアアーキテクチャ宣言

この文書は `packages/inferdi` 内の `@inferdi/inferdi` を規定します。公開 API、型システム、`get()` の解決パス、登録の形、スコープのセマンティクス、クリーンアップの動作に触れる PR をレビューする前に、本書を読んでください。

## 1. 哲学と約束

### ミッション

InferDI は、TypeScript の DI が静的な保証を手放すことなくランタイムの柔軟性を維持できることを証明します。依存グラフは TypeScript の型です。コンパイラがルールを検証できるなら、InferDI はそのルールを公開シグネチャにエンコードしなければなりません。ランタイムチェックは、`as` キャスト、捕捉された外部コンテナ、動的キー、その他 TypeScript がグラフを見られない場面のために存在します。

### 価値提案

グラフが型です。存在しないキー、誤ったコンストラクター引数の位置、重複した登録、シングルトンからスコープドへの漏れは、本番コードが動作する前に失敗すべきです。InferDI はランタイム契約も小さく保ちます。ランタイム依存なし、デコレーターなし、メタデータリフレクションなし、proxy のトラップなし、そしてコアパッケージにはフレームワークの仕組みもありません。

キャッシュヒットの解決は、単一の `Map.get()` の高速パスのままです。クラスの構築は、0〜7 個の依存に対してアリティ展開された直接の `new Ctor(...)` 呼び出しを使い、8 個以上の依存に対しては計測済みの末尾パスを使います。

ある機能がこれらの約束を弱めるなら、それを拒否するか、コアの外へ移してください。

## 2. 妥協できない柱

### 2.1 エンドツーエンドの型安全性

すべての公開シグネチャは、TypeScript がそのルールを表現できる場所で、無効なグラフ状態を表現不可能にしなければなりません。

- `register*` は `key: K & NoKeyOverlap<K, keyof T>` を受け取ります。`NoKeyOverlap` は `[K & keyof T]` を非分配的に検査します。リテラル、ワイド型、symbol、union のキーは引き続き利用できますが、重複が 1 つでもあれば union の一要素だけを暗黙に落とすのではなく、候補キー全体を拒否します。
- `DepsOf<AllowedDeps<T, L>, A>` は、`deps` タプルをコンストラクターのパラメーターと位置および構造的代入可能性によって照合します。
- `AllowedDeps<T, L>` は、ファクトリーへ渡されるコンテナを絞り込みます。シングルトンファクトリーの内部では、`c.get('scoped')` は型エラーです。
- クロージャ形式の `registerFactory` は lifetime でフィルターされたコンテナを受け取ります。依存を指定する overload は、宣言された同期キーだけに制限された resolver を受け取ります。`registerAsyncFactory` はコンテナではなく、解決済みの位置引数を受け取ります。これらの callback 契約を混同しないでください。
- `Lazy`、`AsyncLazy`、`Lifetime`、`Spec`、`AsyncSpec`、`LazySpec`、`AsyncLazySpec`、`ScopeInputMap`、`WithRequirements`、`DependenciesMap`、`SpecMap`、`ContainerOptions`、`Module`、そして `Container.ReadyKeys`、`Container.SyncReadyKeys`、`Container.Resolve`、`Container.ResolveUnwrapped`、`Container.UnwrappedValue`、`Container.Providers` は公開契約です。ランタイムコードが変わらなくても、その代入可能性や推論への変更は API 変更として扱ってください。
- 汎用 resolver は `get()` に `Container.SyncReadyKeys<C>` を、`getAsync()` に `Container.ReadyKeys<C>` を使います。`.has()` が証明するのは登録の存在だけです。同期モードを証明せず、不足しているスコープ入力を満たすこともありません。
- 新規または変更された公開型のインターフェースには、`container.test-d.ts` または宣言的 async 型テストスイートに肯定的テストと否定的な `// @ts-expect-error` テストが必要です。モジュールやスコープ入力の公開診断文には専用のコンパイラ診断 fixture も必要であり、出力された宣言は TypeScript 5.2 の `consumer-dts.ts` に引き続き合格しなければなりません。

既知の TypeScript の制限は、隠すのではなく文書化しなければなりません。例えば、同じ構造型を持つ 2 つの依存は、ユーザーが `unique symbol` キーやブランド化された値型などの名目的な区別を導入しない限り、相互に交換可能なままです。

### 2.2 ゼロデコレーター、ゼロ reflect metadata

InferDI は ES2022 をターゲットとする素の TypeScript です。デコレーター、`reflect-metadata`、`experimentalDecorators`、`emitDecoratorMetadata`、TS transformer、トランスパイラープラグインを追加しないでください。

- コンストラクターの型が依存型の信頼できる情報源です。
- 明示的な `deps` タプルが引数順序の信頼できる情報源です。
- ランタイムは、コンストラクターのパラメーター名、生成されたメタデータ、クラスフィールドを調べません。

デコレーターとメタデータは InferDI を別のライブラリに変えてしまいます。これらはランタイム状態、ツールチェーンの要件、コアパッケージが拒否するコールドスタートのコストを追加します。

### 2.3 ライフタイムは型である

コアには 3 つの登録ライフタイムがあります。`singleton`、`scoped`、`transient` です。各登録は `Spec<V, L>` と公開 `lifetime` プロパティを通じてライフタイムを保持します。

- シングルトンは、スコープドまたはトランジェントのサービスに直接依存してはなりません。`AllowedDeps<T, L>` はコンパイル時にこれを強制し、デフォルトの checked 契約はキャストと動的登録に対してランタイムで強制します。対象 lifetime の union が `'singleton'` を含む可能性がある場合は、シングルトン安全なフィルターを使います。singleton を除外した union だけが短命な依存を受け入れられます。
- `Lazy<V>` と `AsyncLazy<V>` は対象の lifetime を保持します。シングルトンの利用側が注入できるのは、対象 lifetime の完全な状態が `'singleton'` である managed companion だけです。scoped、transient、混合 lifetime、managed と unmanaged の union は、シングルトン利用側には不正なままです。
- ランタイムの `Registration.lazy` フラグは、対象 lifetime が `'singleton'` である lazy companion に対してのみ `true` でなければなりません。
- ランタイムの `Registration.owned` フラグは、生成値をコンテナが所有するクラスまたはファクトリー登録だけで `true` です。`registerValue`、`.override()`、lazy companion、スコープ入力、transient の結果では `false` です。
- `registerValue`、`.override()`、スコープ入力の値は外部が所有します。transient の結果は呼び出し側が所有します。いずれもクリーンアップキューには入りません。
- `.override()` はテスト用の脱出口です。元の `kind`、`lazy`、`async` の状態を保持し、スコープローカルのままにし、宣言済みのスコープ入力、未知のキー、破棄済みコンテナ、現在のコンテナのローカルキャッシュに存在するキーを拒否しなければなりません。キャッシュガードはローカルにキャッシュされた singleton/scoped 解決、`registerValue`、繰り返しの override を検出できますが、transient の解決や checked な子から解決された祖先所有の値は観測できません。ランタイムガードがタイミングを証明できない場合でも、グラフを解決する前に override を適用してください。
- `dispose()` は、そのコンテナが所有するインスタンスだけに触れます。親コンテナと子コンテナは互いを破棄しません。

#### 2.3.1 Async モードは型状態である

宣言的 async サービスは、同期サービスと同じグラフ、登録マップ、キャッシュ、スコープ参照、所有権ルール、破棄パスを使います。

- `registerAsyncFactory` は `Promise<V>` ではなく、最終的な値型を `AsyncSpec<V, L>` に記録します。位置依存タプルはコンストラクタータプルと同様に検査され、登録が分類済みの位置を保持するため readonly のままです。
- singleton と scoped の async 登録は 1 つのネイティブ Promise をキャッシュするため、並行する `getAsync()` 呼び出しは同じ初期化に参加します。`AsyncLazy` wrapper だけを解決しても、その対象を開始してはなりません。
- 宣言的 async 依存を持つクラスは推移的に async になります。その対象は `getAsync()` で解決され、managed companion は `AsyncLazy` になります。sync/async キーの union で選ばれたクラスは、保守的に混合状態のままです。
- `get()` は型で宣言的 async キーを拒否します。`getAsync()` は準備済みのすべてのキーを受け入れ、Promise を返し、別の registry や解決レーンを作らずに resolver の同期エラーを rejection に変換します。
- Promise を返す `registerFactory` は、値が Promise そのものである通常の同期グラフエントリーのままです。この互換契約を暗黙に `AsyncSpec` へ再分類しないでください。
- `Registration.async` は末尾に追加され、登録時の依存分類だけに使われるコールドメタデータです。解決のホットパスは決して読み取ってはなりません。

#### 2.3.2 スコープの準備状態は型状態である

スコープ入力は、子スコープを開いたときにだけ利用可能になる、アプリケーション所有の値を表します。

- `declareScopeInputs<Inputs>()` は型専用であり、ランタイムコンテナを変更してはなりません。
- 宣言が受け入れるのは、必須かつ有限の string または symbol キーです。数値キー、`__proto__`、広い index signature、省略可能プロパティ、キー集合が異なる union、既存グラフとの衝突は拒否されます。
- `createScope(inputs)` は不足入力の任意の部分集合を提供できます。準備状態は依存する登録へ伝播し、ネストしたスコープは提供済みの入力を継承し、準備済みのキーだけが解決可能になります。
- 提供された値は子キャッシュへ shallow copy され、アプリケーション所有のままで、上書き登録も override もできず、`Container.Providers<C>` から除外されます。

#### 2.3.3 モジュールは要件契約である

`Module<TRequirements, TProvides>` は、コンテナ全体の正確な alias ではなく、再利用可能なグラフ変換を表します。

- 実際のグラフは追加のエントリーを含められますが、各要件はサービスの代入可能性、正確な lifetime、sync/async 状態、managed-lazy モード、スコープ入力の同一性、準備状態が一致しなければなりません。
- モジュール callback が参照できるのは宣言された要件だけです。返されるグラフは実際の全エントリーを保持し、宣言された出力を追加します。
- 出力キーは実際のグラフと衝突してはなりません。呼び出し側がすでに満たしているスコープ入力要件は、返される出力状態から削除されます。
- ジェネリックな `<T>(c: Container<T>) => ...` helper は、`DependenciesMap` の上限に対して任意の新しいキーを証明できません。`.use()` のインライン lambda、または名前付きの `Module<TRequirements, TProvides>` を使ってください。

### 2.4 解決のホットパスは小さく保つ

`get()` における最初の操作はローカルキャッシュの参照です。

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

この参照より前に作業を追加しないでください。

- 明示的な `undefined` 値は `UNDEFINED_MARKER` で表現されます。キャッシュヒットのパス上に 2 回目の `cache.has(key)` 参照を再導入しないでください。
- `_disposed`、登録の参照、親の参照、循環チェック、lifetime チェック、シングルトンスタックの変更は、すべてキャッシュ高速パスの後に存在します。
- デフォルトのツリーは正確な親チェーンを走査する前にローカル登録を確認します。親参照の snapshot を保持しないため、無効化の管理やスコープごとの参照メタデータなしで変更を観測できます。
- コンストラクターの呼び出しは、0〜7 個の引数に対してアリティ展開のままです。8 個以上のパスは、`push` で構築された packed array を伴う `Reflect.construct` を使います。
- `get()` は同期のままです。共有の `resolving` 配列と `singletonStack` が機能するのは、1 回の解決と宣言的 async 依存の各 preflight がコールスタック上でアトミックに実行されるためです。`getAsync()` は同じ resolver の外側に Promise 境界を追加するだけで、continuation からこれらのスタックを変更しません。
- 宣言的 async 登録は、同期登録と同じ `regs`、`cache`、スコープ参照、所有権、破棄処理を使います。`Registration.async` は登録時の依存分類に使うコールドメタデータであり、`get()` は決して読み取りません。
- `{fast: false}` はデフォルトの checked mutable 契約です。`{fast: true}` はローカルキャッシュの高速パス後に循環と lifetime のチェックを取り除き、registry owner を直接参照し、委譲された singleton をローカルキャッシュへ反映します。fast ツリーは固定グラフ契約です。最初の解決または `createScope()` の前にすべての `register*`、`.use()`、`.override()` を終え、祖先より先に子を破棄してください。リテラル値 `true` だけが有効化し、キャストや未知のオプション値は安全に checked 契約へフォールバックします。
- `Registration` のホットフィールドは `{kind, lazy, fn, owned}` の順序を保ってください。省略可能な `async` マーカーはそれらの後ろにだけ追加でき、解決パスから外れたままでなければなりません。

`packages/inferdi/__tests__/container.bench.ts` は CI で強制されません。`get()`、登録オブジェクトの形、キャッシュの表現、スコープの参照、lazy companion、コンストラクターの呼び出しへの変更については、レビュアーがベンチマーク出力を要求しなければなりません。関連するシナリオで 5% を超えるローカルのリグレッションは、PR が範囲を限定した書面による正当化を含まない限り、マージを阻止します。

### 2.5 ゼロランタイム依存

`@inferdi/inferdi` にはランタイム依存がありません。この状態を保ってください。

公開されるバンドルは gzip 圧縮後に厳密に 3 KiB（3072 bytes）未満でなければなりません。CI は `pnpm run test:bundle-size` でこの予算を強制します。コア実装または公開 helper にコードを追加する PR では、レビュアーもサイズの変化を確認してください。

### 2.6 破棄は所有権を強制する

破棄は、現在のコンテナが所有し、キャッシュしている値だけを閉じます。冪等で、再入可能であり、親と子で独立しています。

- コンテナを破棄済みにし、`owned` の snapshot を取得して重複を除去してから、ユーザーの disposer を呼び出す前に `owned`、`cache`、`regs`、`scopeInputs`、`parent` をクリアします。再入した解決は、解体済みのコンテナを即座に認識しなければなりません。
- 最初に作成された順序の LIFO を保ってください。重複したキャッシュエントリーや、同じリソースに解決された異なる async ファクトリーは、そのリソースを一度だけ閉じなければなりません。
- async `dispose()` は進行中の完了 Promise を 1 つ共有し、キャッシュされた async ファクトリーの Promise を待ち、`Symbol.asyncDispose` → `Symbol.dispose` → `.dispose()` の順に調べ、失敗後も続行し、エラーが 1 つならそのエラーを、複数なら `AggregateError` をスローします。
- 同期 `[Symbol.dispose]()` は同期プロトコルだけを呼び出します。キャッシュされた Promise や、Promise を返す通常の `.dispose()` は誤用として報告します。エラーを隠すために見えないバックグラウンドクリーンアップを開始しないでください。
- `registerValue`、`.override()`、スコープ入力、lazy wrapper、transient 値は、所有権が移転していないためコンテナのクリーンアップ対象外です。

## 3. PR フィルター

`packages/inferdi/src`、`packages/inferdi/package.json`、`packages/inferdi/jsr.json`、コアテストに触れるすべての PR について、レビュー時に以下の問いに答えてください。

1. その変更はコンパイル時のグラフ保証を維持していますか。それとも文書化された TypeScript の制限なしにルールをランタイムチェックへ移していますか。
2. それは `get()` のキャッシュヒット動作、登録オブジェクトの形、スコープの参照、lazy 解決、コンストラクターの呼び出しに触れていますか。もしそうなら、ベンチマークの証拠はどこにありますか。
3. それはコアパッケージにランタイム依存、デコレーターのサポート、メタデータリフレクション、proxy ベースの解決動作、トランスパイラーの要件を追加していますか。

1 番目が正当な理由なく型ルールをランタイムへ移している、2 番目がベンチマークの証拠を欠いている、または 3 番目が「はい」である場合は、その PR を拒否してください。

## 4. 厳格な管理チェックリスト

以下の項目に該当する変更には、PR で明示的な正当化が必要です。

### ホットパスとランタイム形状

- [ ] `get()` の `cache.get(key)` より前に処理が追加されたか。
- [ ] `UNDEFINED_MARKER`、`cache`、`regs`、親の参照、`Registration` の形状が変更されたか。
- [ ] `Registration` のホットプロパティの順序が `{kind, lazy, fn, owned}` から変更されたか、または省略可能な `async` マーカーがそれらより前へ移動したか。
- [ ] checked 契約のローカル登録参照が親の参照より後へ移動したか。
- [ ] 解決処理に `Proxy`、`Reflect.get`、`Object.defineProperty`、メタデータ参照が追加されたか。
- [ ] `get()` が `async` に変更されたか。
- [ ] `get()` が `Registration.async` を読むか、準備状態の処理を行うようになったか。
- [ ] コンストラクターの 0〜7 引数向けアリティ展開ブランチが削除または変形されたか。
- [ ] fast スコープが registry owner を直接読まなくなったか、委譲された singleton だけを反映しなくなったか。

### 型システム

- [ ] `.override()` 以外で重複キーガードが弱められたか。
- [ ] 公開キー制約で `string | symbol` が `string` に狭められたか。
- [ ] `AllowedDeps`、`LazySpec`、`AsyncLazySpec`、async 伝播、準備状態、lifetime フィルタリングが弱められたか。
- [ ] `NoKeyOverlap`、`ScopeInputMap`、`WithRequirements`、モジュール互換性、`SpecMap`、namespace helper 型が変更されたか。
- [ ] スコープ入力宣言が省略可能、数値、ワイド、variant、衝突するキーを受け入れられるか、または提供前に解決できるか。
- [ ] 名前付きモジュールが不足または非互換の要件を隠せるか、その出力を実際のグラフと衝突させられるか。
- [ ] `src/` に安全でない `any`、`unknown as`、`// @ts-ignore` が追加されたか。
- [ ] 公開型の動作が、肯定的・否定的型テスト、該当する診断 fixture、宣言 consumer チェックなしに変更されたか。

### 依存とビルド

- [ ] `packages/inferdi/package.json` にランタイム依存が追加されたか。
- [ ] `reflect-metadata`、`tslib`、フレームワーク glue の peer dependency が追加されたか。
- [ ] 厳密な `< 3 KiB` gzip 予算を超えたか、その CI チェックが弱められたか。
- [ ] TS plugin、transformer、デコレーターフラグ、メタデータ出力が必要になったか。

### ライフサイクルと破棄

- [ ] `dispose()` または `[Symbol.dispose]()` が disposer の呼び出し前に `_disposed` を設定しなくなったか。
- [ ] `owned`、`cache`、`regs`、`scopeInputs`、`parent` のクリアが disposer の呼び出し後へ移動したか。
- [ ] 親からの切り離しが削除されたか。
- [ ] 所有インスタンスの重複除去が、最初に作成された順序の LIFO を保持しなくなったか。
- [ ] LIFO の破棄順序が変更されたか。
- [ ] async disposer の確認順序が `Symbol.asyncDispose`、`Symbol.dispose`、`.dispose()` から変更されたか。
- [ ] キャッシュされた async ファクトリーの Promise を確認前に待たなくなったか、共有の解決済みリソースを二重に破棄できるようになったか。
- [ ] 並行する async `dispose()` 呼び出しが 1 つの完了 Promise を共有しなくなったか。
- [ ] 複数のクリーンアップ失敗が `AggregateError` にならなくなったか。
- [ ] 同期クリーンアップが async リソースの誤用を報告しなくなったか。

### 脱出口と動的利用

- [ ] `.override()` のローカルキャッシュタイミングガードが弱められたか、transient および祖先所有の解決に対する既知の制限が隠されたか。
- [ ] `.override()` が `kind`、`lazy`、`async` の状態を保持しなくなったか、非ローカルになったか、宣言済みスコープ入力キーに利用可能になったか。
- [ ] `.has()` が resolver になったか、キャッシュを変更するようになったか。
- [ ] `.has()` が準備状態や同期解決の安全性を主張するようになったか。
- [ ] fast ツリーが有効化後に変更可能になったか、子を祖先より先に破棄する契約が弱められたか。
- [ ] ランタイムで構築されるキーが主要 API として推奨されたか。
- [ ] auto-wire、auto-inject、パラメーター名による注入、ファイルシステムのスキャン、モジュール discovery がコアに追加されたか。

## 5. 意識的なトレードオフ

これらの選択を「修正」するのではなく、文書化してください。

| トレードオフ | 理由 |
|---|---|
| ES5 または ES2022 より前をターゲットにしない | `Map`、`Symbol`、`WeakRef`、`Reflect.construct`、`Symbol.dispose`、`Symbol.asyncDispose` は基盤です。パッケージが polyfill するのは、それらを持たないランタイム向けの破棄 symbol だけです。Node 16+ が引き続き下限です。 |
| デコレーター API なし | デコレーターベースの DI は別のライブラリです。 |
| ランタイムメタデータなし | コンストラクターシグネチャと明示的な `deps` タプルがグラフを提供します。ランタイムイントロスペクションは依存と弱い失敗モードを追加します。 |
| 同一構造の依存に名目的な区別なし | TypeScript は構造的代入可能性を使います。2 つのキーが同じ形を公開する場合、`DepsOf` はユーザーの意味的意図を知ることができません。同じ形のサービス間で順序が重要な場合は、ブランド型または `unique symbol` キーを使ってください。 |
| async `get()` なし | `get()` は同期のままです。`getAsync()` は同じ同期 resolver を包んで Promise を返し、別の registry、キャッシュ、解決レーンを作りません。 |
| Promise を返す `registerFactory` は同期グラフ状態のまま | 既存のファクトリーは意図的に Promise をサービス値として公開している場合があります。`AsyncSpec` と宣言的 async 伝播を作るのは `registerAsyncFactory` だけです。 |
| Promise 境界後の動的循環を検出しない | 宣言的 async エッジは同期 preflight を通り、既存の循環ガードを使います。Promise 値を返す互換ファクトリーや捕捉されたコンテナからの `await` 後の呼び出しは、解決スタックがクリアされた後に実行されます。その循環を分割するか、共有初期化を引き上げてください。 |
| async 境界後のランタイム lifetime 検出なし | `AllowedDeps` は不正な型付きファクトリーを引き続き阻止しますが、`as` キャストや `await` 後に使われる捕捉された外部コンテナは `singletonStack` がクリアされた後に実行されます。完全な多層防御には async context の追跡が必要です。依存の参照はファクトリーの同期プレリュードで行ってください。 |
| 自動的な循環の切断なし | 一方が明示的な lazy singleton companion でない限り、循環はアーキテクチャ上の欠陥です。InferDI はサポートされるランタイム循環を検出して報告しますが、proxy や部分的なインスタンスを作り出しません。 |
| ジェネリックな `<T>(c: Container<T>) => ...` モジュールなし | ジェネリック本体内では `keyof T` が `DependenciesMap` の上限へ縮退します。`.use()` のインライン lambda、または要件を宣言した `Module<TRequirements, TProvides>` を使ってください。 |
| 暗黙のスコープ入力ソースなし | `declareScopeInputs()` は型専用です。アプリケーションは所有する値を `createScope(inputs)` へ明示的に渡します。コアは ambient request context や `AsyncLocalStorage` を読みません。 |
| 動的 DI resolver API なし | `.has(key)` は許可された登録プローブです。準備状態や同期モードは証明しません。静的な準備済みキーには `.get()` または `.getAsync()` を直接使ってください。 |
| 本番用の override ストーリーなし | `.override()` はテストと hot-reload fixture のために存在し、そのタイミング検査が観測できるのはローカルキャッシュだけです。本番グラフの選択は `.use()` または通常の builder コードで行います。 |
| fast モードは固定グラフ契約 | `{fast: true}` は topology、lifecycle、cycle、lifetime の不変条件を信頼することで、平坦な参照と singleton の反映を得ます。checked mutable 契約がデフォルトのままです。 |
| 親から子への連鎖的な破棄なし | 各コンテナは自身のインスタンスを所有します。連鎖的な破棄は `dispose()` を非ローカルな副作用にし、スコープの所有権を壊します。 |
| 解決時の hook、interceptor、middleware なし | それは AOP です。ホットパスに処理を追加し、コア契約を曖昧にします。 |
| コアにフレームワーク glue なし | フレームワークアダプターはアダプターパッケージに属します。コアは依存なし、フレームワーク非依存のままです。 |
| コアにグラフ分析エンジンなし | リポジトリにある将来の `@inferdi/graph` に関する記述は提案であり、現在の API ではありません。将来の開発/CI companion は本番の解決処理の外に置き、ホットな登録形状を変更してはなりません。 |

## 6. 非目標

InferDI は次のものにはなりません。

- 汎用 IoC フレームワーク。
- デコレーターまたはリフレクションコンテナ。
- リクエストコンテキストシステム、または `AsyncLocalStorage` の代替。
- 自動配線スキャナー。
- provider 定義 DSL またはランタイムのモジュール discovery システム。
- 本番コア内のグラフ分析、ルール、レポート、snapshot エンジン。
- 解決時 middleware のプラグインホスト。
- レガシー DI コンテナの互換レイヤー。

最後のルール: グラフが型であり、型が契約です。
