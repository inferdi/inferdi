# スコープ入力

スコープ入力は、スコープを開くコードが渡す値です。HTTP リクエスト、認証済みユーザー、テナント、ジョブの payload、トレースコンテキストなどが該当します。InferDI はその要件をグラフ全体へ伝播し、入力が揃う前のサービス解決を型で防ぎます。

## 入力の宣言

`declareScopeInputs()` はキーを型レベルのグラフへ追加します。ランタイム登録や値は作成しません。

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

スコープ入力のライフタイムは `scoped` です。singleton はスコープ入力へ依存できないため、上のサービスで lifetime を省略したり `singleton` を指定したりするとコンパイラが拒否します。

## 型付きプロファイルを開く

`createScope(inputs)` は、まだ渡していない入力の一部を受け取ります。返されたコンテナの型には、準備済みの要件が記録されます。

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth has not been provided
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

通常の関数を使って、アプリケーション内のプロファイルに名前を付けます。関数の戻り値型が準備済みキーを正確に保持するため、コンテナ型を手書きする必要はありません。

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

リクエスト、メッセージ、ジョブの境界でプロファイルを開きます。ルートグラフをフレームワークオブジェクトへ依存させる必要はありません。

## 要件の伝播

InferDI は、クラス、lazy companion、依存キー付き同期ファクトリー、宣言的 async ファクトリーを通じて入力要件を伝播します。

```ts
const app = root
  .registerFactory(
    'requestId',
    (c) => c.get('request').requestId,
    ['request'],
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

依存キー付き `registerFactory` overload のタプルは型レベルのエッジを宣言し、callback が使える resolver をそのキーだけに制限します。ランタイムでは callback に resolver を渡します。`registerAsyncFactory` はタプルを解決し、位置引数として値を callback へ渡します。

引数の順序も異なります。

```ts
registerFactory(key, factory, deps, lifetime)
registerAsyncFactory(key, factory, deps, lifetime)
```

## ネストしたスコープの所有権

子スコープは入力値を継承し、独自の scoped インスタンスを作成します。入力値はアプリケーションが所有し、コンテナは破棄しません。

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript は宣言と逆の順序でリソースを破棄します。先に細分化した子スコープを閉じ、その後に親を閉じます。`root.dispose()` はどちらのスコープも閉じません。

## 再利用できる型契約

`ScopeInputMap` は名前付き `Module` の入力を記述します。`WithRequirements` は入力要件をモジュール出力へ付加します。

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

ジェネリック helper でも準備状態を保持します。

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## 入力の契約

- 宣言には有限かつ必須の string または symbol キーを使います。optional キー、数値キー、`__proto__`、広い index signature、キー集合が異なる union は拒否されます。
- 値が `undefined` の必須プロパティも提供済みとして扱われます。InferDI は truthiness ではなくプロパティの存在を確認します。
- `createScope(inputs)` は enumerable な own string/symbol プロパティを shallow copy します。コピー時に getter と Proxy trap が実行されるため、通常のデータオブジェクトを渡してください。
- 入力 schema は TypeScript にだけ存在します。JavaScript、`any`、型 assertion を使うと、未知のキーの追加や子コンテナのキャッシュ内の登録を上書きできます。
- `{fast: true}` でも入力を段階的に追加できますが、グラフは固定に保ちます。最初の `.get()` または `.createScope()` より前に登録を終えてください。

所有権の規則は[スコープとリソース破棄](./scopes)、スコープ入力へ依存する async サービスは[非同期依存関係](./async-dependencies)を参照してください。

## コンパイラーによる検証

入力を渡すと、同じグラフの準備済みキーが変わります。

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Handler {
  constructor(readonly request: RequestContext) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('handler', Handler, ['request'], 'scoped')

root.get('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
const handler = scope.get('handler')
//    ^?
```
