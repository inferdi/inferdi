---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/async-dependency-graph#breadcrumb"
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
          "name": "Grafo de dependencias asíncrono"
          "item": "https://inferdi.com/es/core/async-dependency-graph"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/async-dependency-graph#article"
      "headline": "Grafos de dependencias asíncronos declarativos en InferDI"
      "name": "Grafo de dependencias asíncrono"
      "description": "Crea grafos de dependencias async tipados con registerAsyncFactory, getAsync, caché single-flight, aislamiento por scope y limpieza explícita."
      "url": "https://inferdi.com/es/core/async-dependency-graph"
      "mainEntityOfPage": "https://inferdi.com/es/core/async-dependency-graph"
      "inLanguage": "es-ES"
      "datePublished": "2026-08-11"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, grafo de dependencias asíncrono, registerAsyncFactory, getAsync, AsyncSpec, single-flight, inyección de dependencias TypeScript"
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

# Grafo de dependencias asíncrono

`registerAsyncFactory` registra una arista async explícita. El grafo conserva el tipo final del servicio, espera las dependencias async declaradas y propaga el estado async a las clases que dependen de ellas.

## Elegir el modelo de Promise

Una Promise puede ser el propio servicio o el límite de inicialización de un servicio. InferDI ofrece un contrato para cada caso.

| API | Valor del grafo | Inyección | Resolución |
| --- | --- | --- | --- |
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | El objeto Promise por identity | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` en `AsyncSpec` | El `Database` fulfilled | `getAsync()` |

Usa `registerAsyncFactory` cuando los servicios dependientes necesiten el valor inicializado. Conserva una `registerFactory` que devuelve Promise solo si la propia Promise forma parte del grafo síncrono.

La diferencia también decide el tipo acompañante. Un `registerFactory`
Promise-valued produce `Lazy<Promise<T>>`; un `registerAsyncFactory` declarativo
con un quinto `lazyKey` produce `AsyncLazy<T>`. Obtener el wrapper es síncrono y no propaga el estado async al consumidor.

## Construir un grafo async por petición

Este grafo inicializa una base de datos para el root y una sesión por scope autenticado. Una clase pasa a ser async cuando alguna dependencia declarada es async.

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard pertenece al grafo async
scope.get('dashboard')
```

El compilador también rechaza `root.getAsync('dashboard')` porque el root no tiene la entrada `auth`. Consulta [Entradas y perfiles de scope](./scope-inputs) para construir perfiles.

## Resolución y planificación

`getAsync()` acepta claves sync y async listas y devuelve una Promise. Un error síncrono de lookup, ciclo, lifetime o disposal se convierte en una Promise rechazada.

InferDI inicia las dependencias declaradas en el orden de la tupla. Espera los elementos marcados como async declarativos y llama a la factoría con valores posicionales. Las dependencias async independientes pueden inicializarse al mismo tiempo.

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

El callback recibe valores en vez de un contenedor. TypeScript y el preflight de runtime pueden ver así las aristas async.

Anota el tipo de cada parámetro del callback, o pasa una función con firma previa, cuando `deps` no esté vacío. La tupla comprueba los tipos y su orden; no proporciona inferencia contextual para los parámetros.

## Caché por lifetime

| Lifetime | Inicialización | Propiedad |
| --- | --- | --- |
| `singleton` | Una Promise nativa en el contenedor propietario | Contenedor propietario |
| `scoped` | Una Promise nativa por scope que resuelve | Scope que resuelve |
| `transient` | Una inicialización nueva por llamada | Código que llama |

Las llamadas concurrentes comparten la inicialización singleton y scoped. Una Promise rechazada en caché conserva el estado fallido; InferDI no reintenta. Abre un scope nuevo o reconstruye el root cuando el ciclo de vida de la aplicación requiera otro intento.

`has()` comprueba el registro sin iniciar la inicialización. No demuestra que una clave sea síncrona ni proporciona entradas de scope ausentes.

## Limpieza de recursos async

Los registros singleton y scoped mantienen su Promise en caché tras el fulfillment. Libera su contenedor de forma asíncrona para que InferDI espere la inicialización e inspeccione el recurso resuelto.

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

Los recursos async propiedad del contenedor admiten `await using`, `dispose()` y `Symbol.asyncDispose`. Un `using` síncrono no puede desenvolver una Promise en caché e informa del uso incorrecto.

## Valores Promise heredados

Una Promise devuelta por `registerFactory` sigue siendo un valor de servicio síncrono. Una factoría async declarativa recibe esa Promise por identity porque el registro no tiene marcador `AsyncSpec`.

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

En el nivel superior, `getAsync('dbPromise')` sigue la semántica await de JavaScript y resuelve a `Database`.

## Límites y semántica de errores

- Pasa tuplas readonly a `registerAsyncFactory` y a `registerClass` cuando la tupla pueda seleccionar una clave async. InferDI clasifica las posiciones async una vez y conserva la referencia a la tupla. Los literales inline se infieren como readonly.
- Los ciclos declarativos y las infracciones de lifetime en frío fallan durante el preflight síncrono. Las llamadas mediante un contenedor capturado después de un límite Promise crean aristas dinámicas fuera de ese análisis.
- `AsyncLazy<T>` difiere la resolución; no añade reintentos, cancelación ni rollback.
- Si una dependencia posterior falla durante el preflight, las inicializaciones anteriores conservan su caché y propiedad. Un transient async ya iniciado puede continuar sin un teardown handle.
- Una clase async con `lazyKey` produce `AsyncLazy<Class>`; una clase mixed sync/async produce `Lazy<Class> | AsyncLazy<Class>`.
- Un ciclo dinámico mediante `AsyncLazy.get()` tras un límite Promise puede esperar su propia Promise pendiente en caché sin error de runtime.

Consulta [Factorías](./factories) para la construcción síncrona y [Scopes y limpieza](./scopes) para el modelo de propiedad.
