# React 适配器

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) 为精确的 InferDI 容器类型提供 React 19 context 和 hooks。它也能管理客户端创建的子 scope，且不会在 render 期间创建资源。

## 安装

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

需要 React 19 系列中的 `19.2.8` 或更高版本。适配器不导入 `react-dom`，应用可以继续自行选择 renderer。

## 绑定精确的容器类型

请在模块作用域声明 binding。每次调用都会为一个精确的 InferDI graph type-state 创建一个 React context。

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

缺少 scope inputs 的根容器 binding 不能接收已经细化的子 scope。请根据提供这些 inputs 的函数的精确 return type 创建另一个 binding。

## 外部 providers

`Provider` 公开由调用方拥有的容器，并且永远不会释放它。它适用于应用根容器、服务器创建的 request scope 和测试 fixture。

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

替换 `container` 遵循普通 React context 语义。嵌套 provider 使用最近的容器。Bootstrap 或请求代码负责在 unmount 或 stream 结束后执行 disposal。

## 托管子 scope

从父 binding 创建 managed binding。`ScopeProvider` 在 committed Effect 中创建子 scope，在可选 setup 完成后公开它，并始终运行配置的 disposal 操作。

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

托管 scope 不能跳过 disposal。如果工作需要比组件存活更久，请在 React 外创建并拥有 scope，再将它传给 `Provider`。

## 服务 hooks 与 Suspense

`useService` 接受已就绪的同步 singleton 和 scoped 键。`useAsyncService` 与 `useAsyncServices` 接受已就绪的声明式 async 键或 sync/async 混合键，并把稳定缓存的 Promise 传给 React `use`。

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

Tuple hook 会在第一次 suspend 前启动所有服务。Rejected service 会进入最近的 Error Boundary。Transient 键会被类型系统拒绝，因为 render 重试可能创建 React 无法拥有的实例；请在事件或 Effect 中解析它们。

## 身份与 teardown

父容器对象和 `scopeKey` 共同定义 managed generation。`input` 是该 generation 真正启动时读取的数据 snapshot。只改变 `input` 不会重新创建或更新 scope。

在同一个 provider 上改变 `scopeKey` 会立即显示 fallback，等待旧 setup 和 disposal 完成，再创建替代 scope。React 的特殊 `key` 会重新挂载组件并创建独立的串行化域。

Managed descendants 会在 managed ancestor 释放前完成 cleanup。外部父容器的拥有者必须让它存活到自己的子级 shutdown 协调结束。永不完成的 setup、disposal 或 error hook 会让后续 generation 一直停留在 fallback。

## Strict Mode 与 Activity

适配器不会在 render、lazy state initialization 或模块加载期间创建 scope。Strict Mode 的 Effect replay 会创建不同的 generation，并在创建第二个之前等待第一个完成 disposal。

React `Activity` 隐藏内容时会断开 Effects 并结束 managed generation，即使 React 仍保留组件状态。再次显示时会创建新 generation。如果 scope 必须跨隐藏阶段存活，请把外部 `Provider` 放在该边界之外。

## 服务端渲染

Managed Effects 不会在服务器运行。`ScopeProvider` 在服务器和第一次 hydration render 中只输出 fallback，然后在 client commit 后创建 scope。

完整 classic SSR 应由 HTTP handler 拥有精确且已细化的 request scope：

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

HTTP 集成必须在 stream 完成或连接断开后停止 render 并释放 scope。容器不会被序列化进 HTML。React Server Components 和 Next.js 专用 lifecycle helpers 不属于此包。

## 错误

当前 generation 的 create 或 setup 错误会进入最近的 Error Boundary。Setup 失败时，适配器先释放未完整配置的 scope；即使 disposal 也失败，setup 错误仍是公开错误。Disposal 错误会交给 `onDisposeError`，未配置处理器时交给 `console.error`。Stale setup 错误会被记录，因为此时已没有可接收它的 live boundary。
