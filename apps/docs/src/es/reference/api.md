---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/reference/api#breadcrumb"
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
          "name": "Resumen de la API"
          "item": "https://inferdi.com/es/reference/api"
    - "@type": "APIReference"
      "@id": "https://inferdi.com/es/reference/api#article"
      "headline": "Resumen de la API del core de InferDI"
      "name": "Resumen de la API"
      "description": "Resumen de la API v6 de @inferdi/inferdi, incluidas entradas de scope, registerAsyncFactory, resolución según preparación, overrides y dispose."
      "url": "https://inferdi.com/es/reference/api"
      "mainEntityOfPage": "https://inferdi.com/es/reference/api"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "Registro explícito, builder fluido"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, declareScopeInputs, ScopeInputMap, registerAsyncFactory, getAsync, AsyncSpec, ReadyKeys, dispose"
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
  type RegistrationKind,
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
  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?, lazyKey?)
  registerFactory(key, deps, factory, kind?, lazyKey?)
  registerAsyncFactory(key, factory, deps, kind?, lazyKey?)
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

## Métodos de registro

| Método | Entrada del callback | Tipo guardado en el grafo | Resolución |
| --- | --- | --- | --- |
| `registerClass` | Argumentos del constructor según `deps` | `Spec` o `AsyncSpec` propagado | `get` o `getAsync` |
| `registerFactory(key, factory, ...)` | Contenedor filtrado por lifetime | `Spec<ReturnType>` | `get` |
| `registerFactory(key, deps, factory, ...)` | Resolver limitado a `deps` | `Spec` con requisitos de inputs | `get` |
| `registerAsyncFactory` | Valores posicionales resueltos | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | Ninguna | `Spec` singleton de propiedad externa | `get` |

`registerClass` y `registerFactory` aceptan los tiempos de vida `singleton`, `scoped` y `transient`, además de un acompañante opcional `lazyKey`. `registerValue` siempre es singleton y de propiedad externa.

`registerAsyncFactory` acepta los mismos tiempos de vida y un quinto `lazyKey` opcional. El registro principal guarda el tipo final como `AsyncSpec`; el acompañante tiene tipo `AsyncLazySpec<Awaited<ReturnType>, Kind>`. Resuelve el destino con `getAsync()` y el wrapper con `get()`.

`registerAsyncFactory` y las llamadas a `registerClass` cuya tupla pueda seleccionar una clave asíncrona requieren dependencias readonly. InferDI clasifica las posiciones asíncronas una vez y conserva la referencia a la tupla. Los literales inline se infieren como readonly; las llamadas síncronas a `registerClass` siguen aceptando tuplas mutables.

`registerAsyncFactory` y el `registerFactory` con dependencias usan distinto orden de argumentos y contrato de callback:

```ts
registerFactory(key, deps, resolverFactory, kind, lazyKey)
registerAsyncFactory(key, valueFactory, deps, kind, lazyKey)
```

`override` reemplaza un registro y `use` aplica un module builder. La comprobación de tiempo de `override` solo consulta la caché del contenedor actual. Detecta valores singleton/scoped guardados localmente, `registerValue` y overrides repetidos, pero no registra resoluciones transient ni valores propiedad de un ancestro resueltos desde un hijo. Aplica los overrides antes de resolver el grafo de dependencias.

## Entradas de scope y resolución

`declareScopeInputs<Inputs>()` añade entradas scoped que solo existen en los tipos. `createScope(inputs)` proporciona cualquier subconjunto de valores pendientes y devuelve un contenedor cuyo conjunto de claves listas refleja las propiedades obligatorias recibidas. Los inputs siguen siendo propiedad de la aplicación.

| API | Claves aceptadas |
| --- | --- |
| `get()` | Claves listas sin `AsyncSpec` |
| `getAsync()` | Todas las claves sync y async declarativas que estén listas |
| `has()` | Cualquier string o symbol; solo demuestra que existe el registro |

`has()` no demuestra que una clave esté lista o sea síncrona. Consulta [Entradas y perfiles de scope](../core/scope-inputs) para el refinamiento del estado de tipos y [Grafo de dependencias asíncrono](../core/async-dependency-graph) para el comportamiento Promise.

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

| Tipo | Uso |
| --- | --- |
| `Container.ReadyKeys<C>` | Extrae las claves cuyos inputs de scope ya se proporcionaron; un resolver genérico puede pasarlas a `getAsync`. |
| `Container.SyncReadyKeys<C>` | Extrae claves no asíncronas listas para que un resolver genérico las pase a `get`. |
| `Container.Resolve<C>` | Extrae un mapa plano `{ key: Value }` de un contenedor construido. |
| `Container.ResolveUnwrapped<C>` | Como `Resolve`, pero desenvuelve de forma distributiva los `LazySpec` y `AsyncLazySpec` administrados; los wrappers normales no cambian. |
| `Container.UnwrappedValue<C, K>` | Busca el tipo de un único servicio desenvuelto. |
| `Container.Providers<C>` | Crea un mapa de thunks de proveedores para pruebas. |

Los resolvers genéricos de v6 deben conservar el conjunto de claves aceptado. Usa `Container.SyncReadyKeys<C>` con `get()` y `Container.ReadyKeys<C>` con `getAsync()` en lugar de un `keyof T` sin restricciones.

## Tipos públicos

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, RegistrationKind>
>

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

interface AsyncSpec<V, K extends RegistrationKind = 'singleton'>
  extends Spec<V, K> {
  readonly async: true
}

interface LazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

interface AsyncLazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

`LazySpec` y `AsyncLazySpec` incluyen un discriminante privado solo de tipos.
Usa estas interfaces con nombre en formas explícitas de `Container` y `Module`.
El discriminante no crea un campo de runtime y no se exporta.

`ScopeInputMap<M>` convierte propiedades string/symbol obligatorias y finitas en entradas scoped. Rechaza claves opcionales o numéricas, `__proto__`, index signatures amplias y unions con distintos conjuntos de claves. `WithRequirements<S, K>` conserva las claves de entrada requeridas en la salida de un módulo con nombre. Las definiciones condicionales exactas están en las declaraciones TypeScript publicadas.

## Formas de la API de los adaptadores

Todos los adaptadores exportan:

- la función de integración, como `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- los helpers estructurales `InferdiScope`, `InferdiRoot` e `InferdiScopeOf`
- tipos de opciones y helpers de contexto específicos del framework

Usa las páginas de los adaptadores para conocer los nombres genéricos y los detalles del ciclo de vida específicos de cada framework.
