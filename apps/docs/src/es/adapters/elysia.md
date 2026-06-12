# Adaptador de Elysia

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) es un plugin de Elysia v1. En modo con scope, crea un scope de petición, lo expone en el contexto de Elysia, lo mantiene disponible para los manejadores de errores del usuario y lo libera desde `onAfterResponse`.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'
```

## Scope de petición

```ts
const root = buildRootContainer()

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    setupScope: (scope, { request }) => {
      const ctx = scope.get('request')
      ctx.requestId = crypto.randomUUID()
      ctx.userId = request.headers.get('x-user-id') ?? undefined
    },
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

Para una clave de contexto personalizada:

```ts
const app = new Elysia()
  .use(inferdiElysia({ container: root, key: 'container' }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

Las rutas deben registrarse después de `.use(inferdiElysia(...))` en la cadena tipada de Elysia.

## Opciones

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `container` | requerido | Contenedor raíz. |
| `key` | `'di'` | Clave de contexto de Elysia. |
| `scopePerRequest` | `true` | Establece `false` para el modo solo raíz. |
| `createScope` | `root.createScope()` | Creación personalizada del scope de petición. |
| `setupScope` | ninguno | Hidrata antes de la validación y de los handlers de rutas. |
| `setupValidatedScope` | ninguno | Hidrata después de la validación de Elysia. |
| `disposeScope` | `scope.dispose()` | Liberación personalizada. |
| `autoDispose` | `true` | `false` o un predicado `false` transfiere la propiedad. |
| `onDisposeError` | `console.error` | Sumidero de fallos de limpieza. |

## Modo solo raíz

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

El modo solo raíz expone el contenedor raíz y no instala ningún hook del ciclo de vida del scope de petición. Las opciones exclusivas del modo con scope se rechazan estáticamente.

## Notas del ciclo de vida

La limpieza está vinculada al ciclo de vida en `onAfterResponse`. Si Elysia nunca alcanza ese hook, el adaptador no puede liberar los recursos retenidos por el scope de petición. La contabilidad por petición se mantiene de forma débil, pero la liberación de recursos requiere que el hook del ciclo de vida se ejecute.

Usa `setupScope` para los valores necesarios antes de la validación. Usa `setupValidatedScope` para los valores derivados del body, query, params, headers o cookies validados.

## Streaming

Elysia puede producir una `Response` de streaming antes de que el stream se drene. Si se usan servicios con scope después de que la ruta retorna, llama a `skipInferdiDispose(context)` y libera el scope tú mismo.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` suprime solo la limpieza exitosa. Las rutas de error igualmente liberan.
