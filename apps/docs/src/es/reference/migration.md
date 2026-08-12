---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/reference/migration#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Referencia"
          "item": "https://inferdi.com/es/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Migración"
          "item": "https://inferdi.com/es/reference/migration"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/reference/migration#article"
      "headline": "Guía de migración de InferDI"
      "name": "Migración"
      "description": "Cambios incompatibles por versión major y la ruta de migración actual a InferDI 6.0, reflejando packages/inferdi/MIGRATION.md como fuente de verdad."
      "url": "https://inferdi.com/es/reference/migration"
      "mainEntityOfPage": "https://inferdi.com/es/reference/migration"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, migración, cambios incompatibles, actualización, 6.0, ReadyKeys, SyncReadyKeys, inyección de dependencias"
      "articleSection": "Referencia"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

# Migración

InferDI registra los cambios incompatibles por versión major. La fuente de verdad sigue siendo [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md), pero aquí se resume la ruta de migración actual.

## Migración a 6.0

### Los resolvers genéricos usan claves listas

`.get()` ahora acepta claves síncronas listas cuyos inputs de scope se hayan proporcionado. Los contenedores concretos sin inputs de scope mantienen el mismo conjunto de claves síncronas. Los helpers genéricos con `K extends keyof T` deben conservar la preparación y el estado async.

```ts
// Antes
function resolve<T extends DependenciesMap, K extends keyof T>(
  container: Container<T>,
  key: K
) {
  return container.get(key)
}

// Después
function resolve<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}
```

Usa `Container.ReadyKeys<Container<T>>` en helpers genéricos que llamen a `getAsync()`. Un `T extends DependenciesMap` genérico puede contener entradas async declarativas o servicios bloqueados por inputs de scope ausentes.

Los conjuntos de claves nuevos se describen en [Resumen de la API](./api), [Entradas y perfiles de scope](../core/scope-inputs) y [Grafo de dependencias asíncrono](../core/async-dependency-graph).

## Migración a 5.0

La release inicial de v5 solo afectó a los adaptadores. El incremento de versión mantiene todos los paquetes publicados en lockstep y alinea los adaptadores de frameworks alrededor de un único contrato de limpieza. Las builds posteriores de v5 también aplican la propiedad del scope hijo y endurecen el contrato de modo rápido descrito a continuación.

Los contratos de los adaptadores ahora comparten estas reglas:

- `createScope`, `setupScope`, `disposeScope`, `autoDispose` y `onDisposeError` usan el mismo vocabulario.
- `MaybePromise`, `InferdiScope`, `InferdiRoot` e `InferdiScopeOf` se exportan en todos los adaptadores.
- Si `setupScope` falla, el adaptador expone únicamente el error de setup original.
- Los fallos de limpieza durante la liberación del setup van a `onDisposeError` o al sink del adaptador.
- Una petición fallida libera su scope incluso después de `skipInferdiDispose`, salvo por la limitación documentada de Express.
- Los hooks de limpieza ven el slot público del scope mientras se ejecutan.

### La resolución scoped requiere un scope hijo

Con el valor predeterminado `strict: true`, resolver una clave scoped desde la raíz ahora lanza `Scoped "key" cannot be resolved from the root container. Use createScope().` Crea un contenedor hijo con `const scope = root.createScope()`, llama a `scope.get(scopedKey)` y libera el hijo en su límite de ciclo de vida. El modo rápido omite este guard en runtime, pero los servicios scoped deben seguir resolviéndose desde scopes hijos.

### Contrato de grafo inmutable del modo rápido

`new Container({ strict: false })` ahora lee el registro raíz inmutable
directamente desde los scopes, evita recorrer los padres y refleja los
singletons delegados en la caché del scope. Los scopes strict recorren su cadena
exacta de padres en cada fallo local en lugar de conservar instantáneas de
búsqueda, por lo que las mutaciones siguen visibles sin contabilidad de
invalidación ni metadatos por scope. La deduplicación por identidad de
instancias owned se ejecuta durante el disposal en ambos modos. Registra cada
clave de runtime una sola vez mediante una cadena fluent lineal, completa el
registro antes de la primera resolución o creación de scope, mantén inmutable
el árbol activado y elimina los scopes hijos antes que sus ancestros. Usa
`strict: true` para hot reload o cualquier árbol que cambie después de
activarse.

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
