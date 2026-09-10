# Resumen de la API

Esta página resume la API pública del core. Consulta el README del paquete y las declaraciones de TypeScript para ver las definiciones genéricas exactas.

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Opciones del contenedor

El constructor acepta una opción de configuración:

| Opción | Tipo | Predeterminado | Función |
| --- | --- | --- | --- |
| `fast` | `boolean` | `false` | Elige entre el contrato mutable con comprobaciones y el contrato de grafo fijo sin comprobaciones de runtime |

```ts
const checked = new Container()
const explicitChecked = new Container({ fast: false })
const fast = new Container({ fast: true })
```

La forma predeterminada y la forma con `false` explícito mantienen las
comprobaciones de ciclos y lifetimes en runtime, rechazan la resolución de
servicios scoped desde la raíz y conservan la cadena de padres exacta y mutable.
Usa este contrato para desarrollo, pruebas, recarga en caliente y grafos que
puedan cambiar después del arranque.

El literal `{fast: true}` conserva todas las comprobaciones de TypeScript, pero
desactiva el seguimiento de ciclos y lifetimes en runtime, incluida la protección
de servicios scoped en la raíz. Trata el árbol de contenedores como fijo, dirige
la búsqueda del scope al propietario del registro y refleja los singletons
delegados en las cachés locales. Los scopes hijos heredan la configuración de la
raíz.

En un árbol fast, completa todas las llamadas a `register*`, `.use()` y
`.override()` antes de la primera resolución o `createScope()`, mantén el árbol
inmutable después de activarlo y libera los hijos antes que sus ancestros. Solo
el valor literal `true` habilita este contrato; cualquier otro valor de runtime
conserva el contrato con comprobaciones. [Rendimiento](../guide/performance#fast-true)
explica qué costes se ven afectados y cuándo puede resultar útil esta decisión.

## Métodos de registro

| Método                                     | Entrada del callback                                             | Tipo guardado en el grafo             | Resolución         |
|--------------------------------------------|------------------------------------------------------------------|---------------------------------------|--------------------|
| `registerClass`                            | Argumentos del constructor según `deps`                          | `Spec` o `AsyncSpec` propagado        | `get` o `getAsync` |
| `registerFactory(key, factory, ...)`       | Contenedor filtrado por lifetime                                 | `Spec<ReturnType>`                    | `get`              |
| `registerFactory(key, factory, deps, ...)` | Resolver limitado a `deps`                                       | `Spec` con requisitos de inputs       | `get`              |
| `registerAsyncFactory`                     | Valores posicionales; espera las dependencias async declarativas | `AsyncSpec<Awaited<ReturnType>>`      | `getAsync`         |
| `registerValue`                            | Ninguna                                                          | `Spec` singleton de propiedad externa | `get`              |

`registerClass`, `registerFactory` y `registerAsyncFactory` aceptan los tiempos de vida `singleton`, `scoped` y `transient`. Un acompañante de `registerFactory` requiere un lifetime explícito, incluido `'singleton'`. `registerValue` siempre es singleton y de propiedad externa.

Un `lazyKey` en `registerClass` o `registerFactory` añade un `LazySpec` administrado. Una clase cuyo estado async se haya propagado desde sus dependencias añade un `AsyncLazySpec` en su lugar. Un `registerFactory` que devuelve una Promise sigue siendo un `Spec<Promise<T>>` síncrono, y su acompañante sigue siendo `Lazy<Promise<T>>`; usa `registerAsyncFactory` cuando el grafo deba guardar el tipo final del servicio.

`registerAsyncFactory` acepta los mismos tiempos de vida y un quinto `lazyKey` opcional. El registro principal guarda el tipo final como `AsyncSpec`; el acompañante tiene tipo `AsyncLazySpec<Awaited<ReturnType>, L>`. Las clases dependientes heredan el estado async de la clave de destino, mientras que quien consume el wrapper sigue siendo síncrono. Resuelve el destino con `getAsync()` y el wrapper con `get()`.

`registerAsyncFactory` y las llamadas a `registerClass` cuya tupla pueda seleccionar una clave asíncrona requieren dependencias readonly. InferDI clasifica las posiciones asíncronas una vez y conserva la referencia a la tupla. Los literales inline se infieren como readonly; las llamadas síncronas a `registerClass` siguen aceptando tuplas mutables.

El `registerFactory` con dependencias y `registerAsyncFactory` usan el mismo orden de argumentos, pero distintos contratos de callback. El primero recibe un resolver limitado a `deps`; el segundo recibe los valores de las dependencias por posición:

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` reemplaza un registro existente que no sea un scope input y `use` aplica un module builder. La comprobación de tiempo de `override` solo consulta la caché del contenedor actual. Detecta valores singleton/scoped guardados localmente, `registerValue` y overrides repetidos, pero nunca registra resoluciones transient. En modo checked tampoco registra singletons propiedad de un ancestro resueltos desde un hijo; un hijo fast refleja los singletons delegados en su caché local, por lo que la comprobación sí los detecta. Aplica los overrides antes de resolver el grafo de dependencias.

## Entradas de scope y resolución

`declareScopeInputs<Inputs>()` añade entradas scoped que solo existen en los tipos. `createScope(inputs)` proporciona cualquier subconjunto de valores pendientes y devuelve un contenedor cuyo conjunto de claves listas refleja las propiedades obligatorias recibidas. Los inputs siguen siendo propiedad de la aplicación.

| API          | Claves aceptadas                                                 |
|--------------|------------------------------------------------------------------|
| `get()`      | Claves listas sin `AsyncSpec`                                    |
| `getAsync()` | Todas las claves sync y async declarativas que estén listas      |
| `has()`      | Cualquier string o symbol; solo demuestra que existe el registro |

`has()` no demuestra que una clave esté lista o sea síncrona. Los scope inputs declarados solo existen en los tipos y no son registros, así que `has()` devuelve `false` para ellos incluso después de proporcionar sus valores mediante `createScope(inputs)`. Consulta [Entradas de scope](../core/scope-inputs) para el refinamiento del estado de tipos y [Dependencias asíncronas](../core/async-dependencies) para el comportamiento Promise.

## Tipos del namespace

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Tipo                             | Uso                                                                                                                                      |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `Container.ReadyKeys<C>`         | Extrae las claves cuyos inputs de scope ya se proporcionaron; un resolver genérico puede pasarlas a `getAsync`.                          |
| `Container.SyncReadyKeys<C>`     | Extrae claves no asíncronas listas para que un resolver genérico las pase a `get`.                                                       |
| `Container.Resolve<C>`           | Extrae un mapa plano `{ key: Value }` de un contenedor construido.                                                                       |
| `Container.ResolveUnwrapped<C>`  | Como `Resolve`, pero desenvuelve de forma distributiva los `LazySpec` y `AsyncLazySpec` administrados; los wrappers normales no cambian. |
| `Container.UnwrappedValue<C, K>` | Busca el tipo de un único servicio desenvuelto.                                                                                          |
| `Container.Providers<C>`         | Crea un mapa de thunks de proveedores para pruebas; excluye los scope inputs declarados.                                                 |

Los resolvers genéricos de v6 deben conservar el conjunto de claves aceptado. Usa `Container.SyncReadyKeys<C>` con `get()` y `Container.ReadyKeys<C>` con `getAsync()` en lugar de un `keyof T` sin restricciones.

## Tipos públicos

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` y `AsyncLazySpec` incluyen un discriminante privado solo de tipos.
Usa estas interfaces con nombre en formas explícitas de `Container` y `Module`.
El discriminante no crea un campo de runtime y no se exporta.

`Spec`, `AsyncSpec`, `LazySpec` y `AsyncLazySpec` describen entradas del grafo de tipos; sus campos no se añaden a los valores de servicio resueltos.

`ScopeInputMap<M>` convierte propiedades string/symbol obligatorias y finitas en entradas scoped. Rechaza claves opcionales o numéricas, `__proto__`, index signatures amplias y unions con distintos conjuntos de claves. `WithRequirements<S, K>` adjunta las claves de entrada requeridas a una entrada del grafo y resulta útil en las salidas de módulos con nombre. Las definiciones condicionales exactas están en las declaraciones TypeScript publicadas.

## Formas de la API de los adaptadores

### Adaptadores HTTP

Fastify, Hono, Koa, Express y Elysia exportan:

- la función de integración, como `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- los helpers estructurales `InferdiScope`, `InferdiRoot` e `InferdiScopeOf`
- tipos de opciones y helpers de contexto específicos del framework

### Adaptador de React

React exporta `inferdiReact` y tipos para su binding, `Provider` externo, `ScopeProvider` gestionado, hooks de servicios, extracción del grafo, claves sync/async estables y opciones de ciclo de vida del scope. No exporta `skipInferdiDispose`: los scopes de componentes siguen el commit y la limpieza de efectos de React, no un ciclo de petición HTTP.

Consulta las páginas de los adaptadores para ver los nombres exactos y los detalles del ciclo de vida.
