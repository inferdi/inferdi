---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/scope-inputs#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Conceptos básicos"
          "item": "https://inferdi.com/es/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Entradas y perfiles de scope"
          "item": "https://inferdi.com/es/core/scope-inputs"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/scope-inputs#article"
      "headline": "Entradas y perfiles de scope en InferDI"
      "name": "Entradas y perfiles de scope"
      "description": "Declara entradas por petición, crea perfiles de scope tipados e impide resolver un servicio hasta que tenga todos los valores necesarios."
      "url": "https://inferdi.com/es/core/scope-inputs"
      "mainEntityOfPage": "https://inferdi.com/es/core/scope-inputs"
      "inLanguage": "es-ES"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, entradas de scope, perfiles de scope, declareScopeInputs, createScope, ReadyKeys, inyección de dependencias TypeScript"
      "articleSection": "Conceptos básicos"
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

# Entradas y perfiles de scope

Las entradas de scope son valores que entrega el código que abre un scope: una petición HTTP, un usuario autenticado, un tenant, el payload de un trabajo o el contexto de una traza. InferDI propaga esos requisitos por el grafo e impide resolver un servicio antes de que sus entradas estén disponibles.

## Declarar las entradas

`declareScopeInputs()` añade claves al grafo de tipos. No crea registros ni valores en runtime.

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

Las entradas tienen lifetime `scoped`. Un singleton no puede depender de ellas, así que el compilador rechaza omitir el kind o declarar `singleton` en los servicios del ejemplo.

## Abrir perfiles tipados

`createScope(inputs)` acepta cualquier subconjunto de las entradas pendientes. El tipo del contenedor devuelto registra qué requisitos están listos.

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth todavía no se ha proporcionado
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

Usa funciones normales para dar nombre a los perfiles de la aplicación. Sus tipos de retorno conservan el conjunto exacto de claves listas sin anotaciones manuales del contenedor.

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

Abre el perfil en el límite de una petición, mensaje o trabajo. El grafo raíz puede mantenerse independiente de los objetos del framework.

## Los requisitos se propagan por el grafo

InferDI propaga los requisitos por clases, companions lazy, factorías síncronas con dependencias declaradas y factorías async declarativas.

```ts
const app = root
  .registerFactory(
    'requestId',
    ['request'],
    (c) => c.get('request').requestId,
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

La tupla del overload de `registerFactory` con dependencias declara aristas a nivel de tipos y limita el callback a un resolver con esas claves. InferDI pasa ese resolver al callback en runtime. `registerAsyncFactory` usa otro contrato: resuelve la tupla y pasa valores posicionales al callback.

El orden de argumentos también cambia:

```ts
registerFactory(key, deps, factory, kind)
registerAsyncFactory(key, factory, deps, kind)
```

## Propiedad de scopes anidados

Un hijo hereda los valores de entrada y crea sus propias instancias scoped. La aplicación conserva la propiedad de las entradas; el contenedor no las libera.

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript libera estas declaraciones en orden inverso, primero el hijo refinado y después su padre. `root.dispose()` no cierra ninguno de los dos scopes.

## Contratos de tipos reutilizables

`ScopeInputMap` describe las entradas de un `Module` con nombre. `WithRequirements` añade requisitos de entrada a la salida del módulo.

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

Los helpers genéricos también deben conservar el estado de preparación:

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## Contrato de entrada

- Las declaraciones requieren claves string o symbol finitas y obligatorias. Se rechazan claves opcionales o numéricas, `__proto__`, index signatures amplias y unions con conjuntos de claves distintos.
- Una propiedad obligatoria con valor `undefined` cuenta como proporcionada. InferDI comprueba la presencia de la propiedad, no su truthiness.
- `createScope(inputs)` toma una copia superficial de las propiedades string y symbol propias y enumerables. Los getters y Proxy traps se ejecutan durante la copia; pasa un objeto de datos normal.
- El schema de entradas solo existe en TypeScript. JavaScript, `any` o un cast pueden añadir claves desconocidas o tapar un registro en la caché del hijo.
- Fast Mode admite el refinamiento de entradas, pero conserva su regla de grafo inmutable: termina los registros antes del primer `.get()` o `.createScope()`.

Consulta [Scopes y limpieza](./scopes) para las reglas de propiedad y [Grafo de dependencias asíncrono](./async-dependency-graph) para servicios async que dependen de entradas de scope.
