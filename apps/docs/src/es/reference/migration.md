# Migración

InferDI registra los cambios incompatibles por versión major. La fuente de verdad sigue siendo [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md), pero aquí se resume la ruta de migración actual.

## Migración a 5.0

v5 es una release de adaptadores. El paquete core no cambió. El incremento de versión mantiene todos los paquetes publicados en lockstep y alinea los adaptadores de frameworks alrededor de un único contrato de limpieza.

Los contratos de los adaptadores ahora comparten estas reglas:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose` y `onDisposeError` usan el mismo vocabulario.
- `MaybePromise`, `InferdiScope`, `InferdiRoot` e `InferdiScopeOf` se exportan en todos los adaptadores.
- Si `setupScope` falla, el adaptador expone únicamente el error de setup original.
- Los fallos de limpieza durante la liberación del setup van a `onDisposeError` o al sink del adaptador.
- Una petición fallida libera su scope incluso después de `skipInferdiDispose`, salvo por la limitación documentada de Express.
- Los hooks de limpieza ven el slot público del scope mientras se ejecutan.

### Notas de los adaptadores

| Paquete                                                                             | Notas de migración                                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Renombra `logDisposeError` a `onDisposeError`; `InferdiScope.dispose()` puede devolver `void` o `Promise<void>`; se añadieron `disposeScope`, `autoDispose`, `skipInferdiDispose` e `InferdiScopeOf`. |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)    | Los fallos de limpieza después de `next()` se registran o se envían a `onDisposeError`; ya no reemplazan una respuesta exitosa. La liberación del setup ya no lanza `AggregateError`.                            |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` es ahora un sink por error para la liberación del setup y la finalización de la respuesta. Express no puede forzar la liberación de un scope omitido ante un error de ruta manejado.                                        |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)     | La liberación del setup expone únicamente el error de setup. Un error aguas abajo libera incluso después de `skipInferdiDispose(ctx)`.                                                                                    |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)  | La liberación del setup expone únicamente el error de setup. Un fallo de limpieza va a `onDisposeError` o a `console.error`.                                                                                         |

## Migración a 4.0

v4 endurece la semántica de tiempo de vida de `Lazy<T>`. Un companion lazy gestionado ahora preserva el tiempo de vida del objetivo. Un singleton solo puede inyectar `Lazy<singleton>`.

Cambios principales:

- `AllowedDeps<T, 'singleton'>` ya no acepta un `Lazy<V>` arbitrario.
- `LazySpec<V, TargetKind>` pasó a ser un tipo público para formas explícitas de contenedores y módulos.
- La exención lazy en runtime solo se aplica cuando el tipo del objetivo es `singleton`.
- Un singleton que inyectaba `Lazy<scoped>` o `Lazy<transient>` debe cambiar o el tiempo de vida del objetivo o el del consumidor.

Correcciones comunes:

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## Migración a 3.0

v3 traslada la seguridad de los tiempos de vida al sistema de tipos. El comportamiento en runtime se mantiene compatible, y los guards estrictos de runtime siguen siendo defensa en profundidad.

Cambios principales:

- Las entradas de `DependenciesMap` pasaron a ser `Spec<V, Kind>` en lugar de tipos de servicio simples.
- `RegistrationKind`, `Spec<V, K>` y `SpecMap<M, K>` pasaron a ser exportaciones públicas.
- `registerFactory` estrecha su parámetro `c` para las factorías singleton.
- `registerClass` filtra `deps` para los registros singleton.
- `override(key, value)` preserva el tipo de tiempo de vida original.
- `new Container({ strict: false })` puede deshabilitar los guards de ciclo y tiempo de vida en runtime tras una auditoría del grafo.

Correcciones comunes:

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## Migración a 2.0

v2 tiene dos cambios incompatibles mecánicos.

### Se eliminó `container.cradle`

Usa `.get(key)`:

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` pasó a ser `lazyKey`

Pasa la clave del companion:

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

v2 también añadió claves de tipo string o symbol a todos los métodos de registro y mejoró los diagnósticos de ancestro liberado.

## Lockstep de versiones

Todos los paquetes publicados de InferDI comparten la misma versión:

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)

Al actualizar los adaptadores, mantén el paquete del adaptador y [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) en versiones major coincidentes.

## Lista de verificación de actualización

1. Lee las notas de migración de cada versión major que atravieses.
2. Actualiza [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) y todos los adaptadores instalados juntos.
3. Ejecuta las pruebas de tipos o `tsc --noEmit` para detectar cambios en la forma del grafo.
4. Ejecuta las pruebas de runtime en modo estricto.
5. Revisa la propiedad del scope de petición si usas `skipInferdiDispose`, `autoDispose: false` o un `disposeScope` personalizado.

## Fronteras estables

El paquete core sigue siendo libre de decoradores y sin dependencias. El comportamiento del ciclo de vida de los frameworks vive en los paquetes de adaptadores, no en [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
