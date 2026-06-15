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
      "description": "Un resumen de la API pública del core de @inferdi/inferdi: la clase Container, register, registerFactory, registerValue, get, has, scopes, override, dispose, y los tipos Lazy, DependenciesMap y Module."
      "url": "https://inferdi.com/es/reference/api"
      "mainEntityOfPage": "https://inferdi.com/es/reference/api"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "executableLibraryName": "@inferdi/inferdi"
      "programmingModel": "Registro explícito, builder fluido"
      "targetPlatform": "Node.js, Bun, Deno, Browser"
      "keywords": "InferDI, API, Container, register, registerFactory, get, scope, override, dispose, Lazy, Module"
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
  type LazySpec,
  type Module,
  type RegistrationKind,
  type Spec,
  type SpecMap,
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  registerClass(key, Ctor, deps, kind?, lazyKey?)
  registerFactory(key, factory, kind?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope()
  get(key)
  has(key)

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Métodos de registro

| Método | Uso |
| --- | --- |
| `registerClass` | Registra un constructor y una tupla de dependencias. |
| `registerFactory` | Registra lógica de construcción personalizada. |
| `registerValue` | Registra un valor singleton de propiedad externa. |
| `override` | Reemplaza un registro existente antes del primer resolver. |
| `use` | Aplica un constructor de módulos. |

`registerClass` y `registerFactory` aceptan los tiempos de vida `singleton`, `scoped` y `transient`. `registerValue` siempre es singleton y de propiedad externa.

## Tipos del namespace

```ts
namespace Container {
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Tipo | Uso |
| --- | --- |
| `Container.Resolve<C>` | Extrae un mapa plano `{ key: Value }` de un contenedor construido. |
| `Container.ResolveUnwrapped<C>` | Como `Resolve`, pero desenvuelve las entradas `Lazy<T>` a `T`. |
| `Container.UnwrappedValue<C, K>` | Busca el tipo de un único servicio desenvuelto. |
| `Container.Providers<C>` | Crea un mapa de thunks de proveedores para pruebas. |

## Tipos públicos

```ts
type Lazy<T> = { readonly get: () => T }
type RegistrationKind = 'singleton' | 'transient' | 'scoped'

interface ContainerOptions {
  readonly strict?: boolean
}

interface Spec<V, K extends RegistrationKind = 'singleton'> {
  readonly type: V
  readonly kind: K
}

type SpecMap<M, K extends RegistrationKind = 'singleton'> = {
  [P in keyof M]: Spec<M[P], K>
}

type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>
```

## Formas de la API de los adaptadores

Todos los adaptadores exportan:

- la función de integración, como `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- los helpers estructurales `InferdiScope`, `InferdiRoot` e `InferdiScopeOf`
- tipos de opciones y helpers de contexto específicos del framework

Usa las páginas de los adaptadores para conocer los nombres genéricos y los detalles del ciclo de vida específicos de cada framework.
