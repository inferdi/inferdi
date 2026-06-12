# Adaptador de Express

[`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) es middleware de Express 5. Crea un scope de petición, lo expone como `req.di` y lo libera después de que la respuesta de Node finaliza o se cierra.

## Instalación

```bash
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
```

```ts
import express from 'express'
import { inferdiExpress, type InferdiScopeOf } from '@inferdi/express'
```

## Scope de petición

```ts
const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: InferdiScopeOf<typeof root>
    }
  }
}

const app = express()

app.use(inferdiExpress({
  container: root,
  setupScope: (scope, req) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = req.get('x-user-id') || undefined
    request.ip = req.ip
  },
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
```

El adaptador no aumenta globalmente `Express.Request` con `any`, `unknown` ni un contenedor base. Las aplicaciones poseen su tipo de petición concreto.

## Opciones

| Opción | Por defecto | Descripción |
| --- | --- | --- |
| `container` | requerido | Contenedor raíz. Este middleware nunca lo libera. |
| `createScope` | `root.createScope()` | Creación personalizada del scope de petición. |
| `setupScope` | ninguno | Hidrata el scope antes de los handlers de rutas. |
| `disposeScope` | `scope.dispose()` | Liberación personalizada. |
| `autoDispose` | `true` | `false` o un predicado `false` transfiere la propiedad. |
| `onDisposeError` | `console.error` | Sumidero de fallos de limpieza. |

## Streaming y trabajo en segundo plano

Las respuestas de stream normales de Express no necesitan un skip porque el adaptador espera al `finish` o `close`.

Usa `skipInferdiDispose(req)` cuando el trabajo sobreviva intencionadamente a la respuesta HTTP:

```ts
import { skipInferdiDispose } from '@inferdi/express'

app.get('/background', (req, res) => {
  skipInferdiDispose(req)
  const scope = req.di

  queue.add(async () => {
    try {
      await scope.get('jobs').run()
    } finally {
      await scope.dispose()
    }
  })

  res.status(202).json({ status: 'queued' })
})
```

## Salvedad sobre las peticiones fallidas

A diferencia de los demás adaptadores, Express no puede forzar de forma fiable la liberación de un scope omitido ante un error de ruta gestionado. El middleware de Express se basa en callbacks; después de que `next()` retorna, el adaptador no puede observar una excepción aguas abajo que más tarde fue gestionada por un manejador de errores. Si una ruta llama a `skipInferdiDispose(req)` y luego falla, el scope permanece como propiedad de la aplicación. Libéralo desde tu propia ruta de error o evita combinar skips con rutas que puedan lanzar excepciones.
