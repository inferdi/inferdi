# React アダプター

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) は、InferDI コンテナーの正確な型に対応する React 19 の context と hooks を提供します。Render 中にリソースを作らず、クライアントで作成する子 scope も管理できます。

## インストール

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

React 19 系の `19.2.8` 以降が必要です。アダプターは `react-dom` を import しないため、renderer はアプリケーションが選択します。

## 正確なコンテナー型を binding する

Binding はモジュールスコープで宣言します。各呼び出しは、InferDI graph の正確な type-state ひとつに対応する React context を所有します。

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

Scope inputs が不足している root の binding は、準備済みの子 scope を受け取れません。Inputs を渡す関数の正確な return type から別の binding を作成してください。

## 外部 providers

`Provider` は呼び出し側が所有するコンテナーを公開し、dispose しません。アプリケーション root、サーバーで作る request scope、テスト fixture に使います。

```tsx
createRoot(document.getElementById('root')!).render(
  <AppDI.Provider container={root}>
    <App />
  </AppDI.Provider>
)

function UserMenu() {
  const session = AppDI.useService('session')
  return <span>{session.user.name}</span>
}
```

`container` の置換は通常の React context セマンティクスに従います。ネストした provider では最も近いコンテナーが選ばれます。Unmount または stream 完了後の disposal は bootstrap や request コードが担当します。

## 管理される子 scope

親 binding から managed binding を作ります。`ScopeProvider` は committed Effect で子 scope を作成し、任意の setup 後に公開して、設定された disposal 操作を必ず実行します。

```tsx
type ScopeInput = {
  request: RequestContext
}

const RequestDI = AppDI.createScope({
  createScope: (parent, input: ScopeInput) => parent.createScope(input),
  setupScope: async (scope) => {
    await scope.getAsync('requestSession')
  },
  onDisposeError: (error, _scope, input) => {
    reportCleanupError(error, input.request.id)
  }
})

function RequestArea({request}: {request: RequestContext}) {
  return (
    <RequestDI.ScopeProvider
      input={{request}}
      scopeKey={request.id}
      fallback={<RequestSkeleton />}
    >
      <RequestScreen />
    </RequestDI.ScopeProvider>
  )
}
```

Managed scope の disposal は無効化できません。処理をコンポーネントより長く存続させる場合は、React の外で scope を作って所有し、`Provider` に渡します。

## Service hooks と Suspense

`useService` は準備済みの同期 singleton と scoped key を受け取ります。`useAsyncService` と `useAsyncServices` は準備済みの宣言的 async key または sync/async 混合 key を受け取り、安定してキャッシュされた Promise を React `use` に渡します。

```tsx
function RequestScreen() {
  const [session, repository] = RequestDI.useAsyncServices(
    'requestSession',
    'repository'
  )

  return <Dashboard session={session} repository={repository} />
}

<AppErrorBoundary>
  <Suspense fallback={<Loading />}>
    <RequestArea request={request} />
  </Suspense>
</AppErrorBoundary>
```

Tuple hook は最初に suspend する前に全サービスを開始します。Reject されたサービスは最も近い Error Boundary に届きます。Transient key は、render の再試行で React が所有できないインスタンスを作り得るため拒否されます。イベントまたは Effect で resolve してください。

## Identity と teardown

親コンテナーオブジェクトと `scopeKey` が managed generation を定義します。`input` は generation が実際に始まるときに読むデータ snapshot です。`input` だけを変更しても scope は再作成も更新もされません。

同じ provider で `scopeKey` を変更すると、すぐ fallback を表示し、古い setup と disposal の完了後に次の scope を作ります。React の特別な `key` はコンポーネントを remount し、独立した直列化ドメインを作ります。

Managed descendants は managed ancestor の disposal より先に cleanup を完了します。外部親の所有者は、自身の子 shutdown 調整が終わるまでコンテナーを生存させる必要があります。完了しない setup、disposal、error hook があると、後続 generation は fallback のままです。

## Strict Mode と Activity

アダプターは render、lazy state initialization、モジュール評価中に scope を作りません。Strict Mode の Effect replay は別々の generation を作り、最初の disposal 完了後に次を作成します。

React `Activity` で非表示にすると Effects が切断され、React がコンポーネント state を保持していても managed generation は終了します。再表示時には新しい generation を作ります。Scope を非表示中も維持する場合は、外部 `Provider` をその境界の外に置いてください。

## サーバーレンダリング

Managed Effects はサーバーでは動きません。`ScopeProvider` はサーバーと最初の hydration render で fallback のみを出力し、client commit 後に scope を作ります。

完全な classic SSR では、HTTP handler が正確で準備済みの request scope を所有します。

```tsx
function createRequestScope(request: RequestContext) {
  return root.createScope({request})
}

type RequestContainer = ReturnType<typeof createRequestScope>
const RequestDI = inferdiReact<RequestContainer>()

renderToPipeableStream(
  <RequestDI.Provider container={scope}>
    <App />
  </RequestDI.Provider>,
  streamOptions
)
```

HTTP 統合は stream の完了または切断後に render を中止して scope を dispose する必要があります。コンテナーは HTML に serialize されません。React Server Components と Next.js 専用 lifecycle helpers はこのパッケージの対象外です。

## エラー

現在の generation の create または setup エラーは最も近い Error Boundary に届きます。Setup が失敗すると未完成の scope を先に dispose し、disposal も失敗した場合でも setup エラーだけを公開します。Disposal エラーは `onDisposeError` に渡され、未設定なら `console.error` に送られます。Stale setup エラーは受け取る live boundary がないためログに記録されます。
