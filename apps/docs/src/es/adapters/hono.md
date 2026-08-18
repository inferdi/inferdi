# Adaptador de Hono

[`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) es middleware de Hono v4. Crea un scope de petición por cada invocación del middleware, lo expone a través de las variables de contexto de Hono y lo libera después de que el pipeline acotado de la ruta se completa.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/hono hono
```

```ts
import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'
```

## Scope de petición

```ts
const root = buildRootContainer()
const openRequestScope = (requestId: string, userId?: string) =>
  root.createScope({ request: { requestId, userId } })
type RequestScope = ReturnType<typeof openRequestScope>
type AppEnv = InferdiHonoScopeEnv<RequestScope>

const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  createScope: (_root, c) => openRequestScope(
    crypto.randomUUID(),
    c.req.header('x-user-id')
  )
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.di.get('users').profile(c.req.param('id')))
})
```

`c.get('di')` es equivalente a `c.var.di`.

## Clave personalizada

```ts
type AppEnv = InferdiHonoScopeEnv<RequestScope, 'container'>

const app = new Hono<AppEnv>()
app.use('*', inferdiHono({
  container: root,
  key: 'container',
  createScope: (_root, c) => openRequestScope(
    crypto.randomUUID(),
    c.req.header('x-user-id')
  )
}))

app.get('/users/:id', async (c) => {
  return c.json(await c.var.container.get('users').profile(c.req.param('id')))
})
```

El adaptador no aumenta globalmente el `ContextVariableMap` de Hono, por lo que la ausencia del middleware sigue siendo visible para TypeScript.

## Opciones

| Opción           | Por defecto          | Descripción                                                 |
|------------------|----------------------|-------------------------------------------------------------|
| `container`      | requerido            | Contenedor raíz. Este middleware nunca lo libera.           |
| `key`            | `'di'`               | Clave de la variable de contexto.                           |
| `createScope`    | `root.createScope()` | Creación personalizada del scope de petición.               |
| `setupScope`     | ninguno              | Ejecuta inicialización adicional después de crear el scope. |
| `disposeScope`   | `scope.dispose()`    | Liberación personalizada.                                   |
| `autoDispose`    | `true`               | `false` o un predicado `false` transfiere la propiedad.     |
| `onDisposeError` | `console.error`      | Sumidero de fallos de limpieza.                             |

## Streaming

Los helpers de streaming de Hono pueden devolver una `Response` antes de que el callback del stream termine. Llama a `skipInferdiDispose(c)` y libera el scope desde el ciclo de vida del stream.

```ts
import { stream } from 'hono/streaming'
import { skipInferdiDispose } from '@inferdi/hono'

app.get('/events', (c) => {
  skipInferdiDispose(c)

  const scope = c.var.di
  const events = scope.get('events')

  return stream(c, async (s) => {
    try {
      for await (const event of events.subscribe()) {
        await s.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } finally {
      await scope.dispose()
    }
  })
})
```

`skipInferdiDispose` suprime la limpieza solo para una respuesta exitosa. Las rutas de error igualmente liberan.
