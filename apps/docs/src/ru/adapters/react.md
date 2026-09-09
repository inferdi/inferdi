# React-адаптер

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) предоставляет контексты и хуки React 19 для точных типов контейнера InferDI. Он также управляет дочерними scope на клиенте, не создавая ресурсы во время render.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

Требуется React `19.2.8` или новее в линейке React 19. Адаптер не импортирует `react-dom`, поэтому приложение само выбирает renderer.

## Привязка точного типа контейнера

Объявляйте bindings на уровне модуля. Каждый вызов создаёт один React context для одного точного состояния графа InferDI.

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

Binding корневого контейнера с недостающими scope inputs не принимает уточнённый дочерний scope. Создайте отдельный binding из точного return type функции, которая передаёт эти inputs.

## Внешние providers

`Provider` публикует контейнер, принадлежащий вызывающему коду, и никогда его не освобождает. Используйте его для корней приложения, серверных request scope и тестовых fixtures.

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

Замена `container` подчиняется обычной семантике React context. Во вложенных providers выбирается ближайший контейнер. Bootstrap-код или обработчик запроса отвечает за disposal после unmount или завершения stream.

## Управляемые дочерние scope

Создайте managed binding из родительского binding. `ScopeProvider` создаёт дочерний scope в committed Effect, публикует после необязательного setup и всегда запускает настроенный disposal.

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

Отключить disposal нельзя. Если работа должна пережить компонент, создайте scope вне React, владейте им в приложении и передайте в `Provider`.

## Хуки сервисов и Suspense

`useService` принимает готовые синхронные singleton- и scoped-ключи. `useAsyncService` и `useAsyncServices` принимают готовые декларативные async-ключи и смешанные sync/async-ключи, передавая React `use` стабильные закэшированные Promise.

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

Tuple-хук запускает все сервисы до первой приостановки. Rejection попадает в ближайший Error Boundary. Transient-ключи запрещены: повторный render мог бы создать экземпляры, которыми React не способен владеть. Разрешайте их в событии или Effect.

## Идентичность и teardown

Объект родительского контейнера и `scopeKey` задают managed generation. `input` — snapshot данных, прочитанный при фактическом старте поколения. Изменение только `input` не пересоздаёт и не обновляет scope.

Изменение `scopeKey` на том же provider сразу показывает fallback, ожидает завершения прежних setup и disposal, а затем создаёт замену. Специальный React `key` перемонтирует компонент и создаёт независимый домен сериализации.

Managed-потомки завершают cleanup до disposal управляемого предка. Владелец внешнего родителя должен сохранять контейнер до завершения собственной координации дочернего shutdown. Никогда не завершающийся setup, disposal или error hook оставит следующие поколения на fallback.

## Strict Mode и Activity

Адаптер не создаёт scope во время render, lazy state initialization или загрузки модуля. Повтор Effect в Strict Mode создаёт разные поколения и ждёт disposal первого перед созданием второго.

Скрытие через React `Activity` отключает Effects и завершает managed generation, хотя React сохраняет состояние компонента. При показе создаётся новое поколение. Если scope должен пережить скрытие, разместите внешний `Provider` за пределами этой границы.

## Серверный рендеринг

Managed Effects не работают на сервере. `ScopeProvider` выводит fallback на сервере и при первом hydration render, затем создаёт scope после client commit.

Для полного classic SSR обработчик HTTP должен владеть точным уточнённым request scope:

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

HTTP-интеграция должна остановить render и освободить scope после завершения stream или отключения клиента. Контейнеры не сериализуются в HTML. React Server Components и lifecycle helpers для Next.js не входят в этот пакет.

## Ошибки

Текущая ошибка create или setup попадает в ближайший Error Boundary. При ошибке setup адаптер сначала освобождает наполовину настроенный scope и сохраняет setup-ошибку основной, даже если disposal тоже завершился ошибкой. Ошибки disposal передаются в `onDisposeError`, а без обработчика — в `console.error`. Устаревшие ошибки setup логируются, потому что живого boundary для них уже нет.
