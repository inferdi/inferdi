# Adaptador de React

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) proporciona contextos y hooks de React 19 para tipos exactos de contenedor InferDI. También administra scopes secundarios creados en el cliente sin construir recursos durante el render.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

Se requiere React `19.2.8` o posterior dentro de React 19. El adaptador no importa `react-dom`, por lo que la aplicación conserva el control del renderer.

## Vincular un tipo exacto de contenedor

Declara los bindings en el ámbito del módulo. Cada llamada posee un React context para un único type-state exacto del grafo InferDI.

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

Un binding para un root con scope inputs pendientes no acepta un scope secundario refinado. Crea otro binding a partir del return type exacto de la función que proporciona esos inputs.

## Providers externos

`Provider` expone un contenedor propiedad del código llamador y nunca lo libera. Úsalo para roots de aplicación, request scopes creados en el servidor y fixtures de pruebas.

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

Reemplazar `container` sigue la semántica habitual de React context. Los providers anidados seleccionan el contenedor más cercano. El código de bootstrap o de petición controla el disposal tras el unmount o el fin del stream.

## Scopes secundarios administrados

Crea un managed binding desde su binding padre. `ScopeProvider` crea el scope secundario en un committed Effect, lo publica tras el setup opcional y siempre ejecuta la operación de disposal configurada.

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

No existe una exclusión del disposal para un scope administrado. Si el trabajo debe sobrevivir al componente, crea y controla el scope fuera de React y pásalo a `Provider`.

## Hooks de servicios y Suspense

`useService` acepta claves síncronas singleton y scoped listas. `useAsyncService` y `useAsyncServices` aceptan claves async declarativas o mixtas sync/async listas y entregan Promises estables y almacenadas en caché a React `use`.

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

El hook de tuple inicia todos los servicios antes de la primera suspensión. Los servicios rechazados llegan al Error Boundary más cercano. Las claves transient se rechazan porque los reintentos de render podrían crear instancias que React no puede poseer; resuélvelas en un evento o Effect.

## Identidad y teardown

El objeto del contenedor padre y `scopeKey` definen una managed generation. `input` es un snapshot de datos leído cuando esa generación comienza realmente. Cambiar solo `input` no recrea ni actualiza el scope.

Cambiar `scopeKey` en el mismo provider muestra el fallback de inmediato, espera a que terminen el setup y disposal anteriores y crea después el reemplazo. El `key` especial de React remonta el componente y crea un dominio de serialización independiente.

Los managed descendants terminan su cleanup antes del disposal del managed ancestor. El propietario de un padre externo debe mantener vivo el contenedor hasta que finalice su propia coordinación de shutdown de hijos. Un hook de setup, disposal o error que no termine deja las generaciones posteriores en el fallback.

## Strict Mode y Activity

El adaptador no crea scopes durante el render, la inicialización lazy de state ni la evaluación del módulo. El replay de Effect en Strict Mode crea generaciones distintas y espera al disposal de la primera antes de crear la segunda.

Ocultar contenido con React `Activity` desconecta Effects y termina la managed generation aunque React conserve el state del componente. Al mostrarlo se crea una generación nueva. Coloca un `Provider` externo fuera de ese límite cuando el scope deba sobrevivir oculto.

## Renderizado del servidor

Los managed Effects no se ejecutan en el servidor. `ScopeProvider` muestra solo su fallback en el servidor y durante el primer hydration render, y crea el scope después del client commit.

Para SSR clásico completo, el handler HTTP debe poseer un request scope exacto y refinado:

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

La integración HTTP debe abortar el render y liberar el scope cuando el stream termine o se desconecte. Los contenedores no se serializan en HTML. React Server Components y los lifecycle helpers específicos de Next.js quedan fuera del paquete.

## Errores

Un error actual de create o setup llega al Error Boundary más cercano. Tras un fallo de setup, el adaptador libera primero el scope incompleto y mantiene el error de setup como error visible aunque falle también el disposal. Los errores de disposal llegan a `onDisposeError` o a `console.error` si no hay handler. Los errores de setup obsoletos se registran porque ya no existe un live boundary que los reciba.
