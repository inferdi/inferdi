# React-адаптер

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) предоставляет контексты и хуки React 19 для точных типов контейнера InferDI. Он также управляет дочерними скоупами на клиенте, не создавая ресурсы во время рендеринга.

## Установка

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

Требуется React `19.2.8` или новее в линейке React 19. Адаптер не импортирует `react-dom`, поэтому приложение само выбирает средство рендеринга.

## Привязка точного типа контейнера

Объявляйте привязки контейнера на уровне модуля. Каждый вызов создаёт отдельный контекст React для конкретного состояния графа InferDI.

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

Привязка корневого контейнера, в котором ещё не предоставлены входные данные скоупа, не принимает дочерний скоуп с этими данными. Создайте отдельную привязку по точному возвращаемому типу функции, которая передаёт нужные данные.

## Внешние провайдеры {#внешние-providers}

`Provider` публикует контейнер, принадлежащий вызывающему коду, и никогда его не освобождает. Используйте его для корней приложения, серверных скоупов запроса и тестовых фикстур.

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

Замена `container` работает по обычным правилам контекста React. При вложенных провайдерах используется ближайший контейнер. Код запуска приложения или обработчик запроса отвечает за освобождение ресурсов после размонтирования или завершения потока.

## Управляемые дочерние скоупы {#управляемые-дочерние-scope}

Создайте управляемую привязку на основе родительской. `ScopeProvider` создаёт дочерний скоуп в эффекте после фиксации изменений React, делает его доступным после необязательной настройки и всегда запускает заданное освобождение ресурсов.

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

Отключить освобождение ресурсов нельзя. Если работа должна продолжиться после удаления компонента, создайте скоуп вне React, управляйте им в приложении и передайте его в `Provider`.

## Хуки сервисов и Suspense

`useService` принимает готовые ключи синхронных singleton- и scoped-сервисов. `useAsyncService` и `useAsyncServices` принимают готовые декларативные асинхронные ключи и ключи, допускающие оба режима. Они передают React `use` стабильные закэшированные Promise.

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

Хук, принимающий кортеж ключей, запускает инициализацию всех сервисов до первой приостановки рендеринга. Отклонение Promise попадает в ближайший Error Boundary. Transient-ключи запрещены: повторный рендеринг мог бы создавать экземпляры, за освобождение которых React не отвечает. Получайте такие сервисы в обработчике события или эффекте.

## Идентичность скоупа и освобождение ресурсов {#идентичность-и-teardown}

Объект родительского контейнера и `scopeKey` определяют поколение управляемого скоупа, то есть один цикл его создания, использования и освобождения. `input` фиксируется при фактическом запуске этого поколения. Изменение только `input` не обновляет и не пересоздаёт скоуп.

При изменении `scopeKey` у того же провайдера сразу отображается `fallback`. Адаптер ждёт завершения настройки и освобождения прежнего скоупа, затем создаёт новый. Специальный атрибут React `key` перемонтирует компонент: у нового экземпляра своя очередь операций, независимая от прежнего.

Управляемые дочерние скоупы освобождаются раньше управляемого родителя. Если родительский контейнер передан извне, его владелец должен сам дождаться освобождения дочерних скоупов. Если настройка, очистка или обработчик ошибок никогда не завершатся, следующие поколения останутся на `fallback`.

## Strict Mode и Activity

Адаптер не создаёт скоуп во время рендеринга, ленивой инициализации состояния или загрузки модуля. Повторный запуск эффекта в Strict Mode создаёт новое поколение скоупа, дождавшись освобождения предыдущего.

При скрытии через React `Activity` эффекты отключаются, и текущее поколение управляемого скоупа завершается. Состояние компонента при этом сохраняется. Когда компонент снова показывается, создаётся новое поколение скоупа. Если скоуп должен пережить скрытие, разместите внешний `Provider` за пределами `Activity`.

## Серверный рендеринг

Эффекты, управляющие скоупом, не выполняются на сервере. `ScopeProvider` выводит `fallback` на сервере и при первом рендеринге во время гидратации. Скоуп создаётся после фиксации изменений на клиенте.

Для полноценного классического SSR обработчик HTTP должен владеть скоупом запроса, тип которого учитывает все переданные входные данные:

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

HTTP-интеграция должна остановить рендеринг и освободить скоуп после завершения потока или отключения клиента. Контейнеры не сериализуются в HTML. Поддержка React Server Components и вспомогательные средства управления жизненным циклом для Next.js в пакет не входят.

## Ошибки

Ошибка создания или настройки текущего скоупа попадает в ближайший Error Boundary. При ошибке настройки адаптер сначала пытается освободить частично подготовленный скоуп. Исходная ошибка остаётся основной, даже если очистка тоже завершилась сбоем. Ошибки очистки передаются в `onDisposeError`, а при его отсутствии в `console.error`. Ошибки настройки прежнего поколения записываются в лог: активного Error Boundary для них уже нет.
