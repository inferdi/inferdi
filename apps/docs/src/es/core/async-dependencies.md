# Dependencias asíncronas

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

## Registrar factorías asíncronas

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

// @ts-expect-error: dashboard belongs to the async graph
scope.get('dashboard')
```

El compilador también rechaza `root.getAsync('dashboard')` porque el root no tiene la entrada `auth`. Consulta [Entradas de scope](./scope-inputs) para construir perfiles.

## Resolución y propagación

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

## Planificación y caché

| Lifetime | Inicialización | Propiedad |
| --- | --- | --- |
| `singleton` | Una Promise nativa en el contenedor propietario | Contenedor propietario |
| `scoped` | Una Promise nativa por scope que resuelve | Scope que resuelve |
| `transient` | Una inicialización nueva por llamada | Código que llama |

Las llamadas concurrentes comparten la inicialización singleton y scoped. Una Promise rechazada en caché conserva el estado fallido; InferDI no reintenta. Abre un scope nuevo o reconstruye el root cuando el ciclo de vida de la aplicación requiera otro intento.

`has()` comprueba el registro sin iniciar la inicialización. No demuestra que una clave sea síncrona ni proporciona entradas de scope ausentes.

## Companions AsyncLazy

Pasa un quinto argumento `lazyKey` para diferir un objetivo asíncrono declarativo:

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

La creación del wrapper sigue siendo síncrona, así que una clase que recibe `AsyncLazy<T>` no se vuelve asíncrona por esa dependencia. El wrapper captura el contenedor que lo resolvió: los objetivos scoped permanecen en ese scope y los transient se inician en cada llamada y pertenecen al llamador.

## Liberación de recursos y errores

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

Antes de lanzar ese error, la liberación síncrona añade un observador de rechazo a la Promise nativa en caché para que un fallo posterior no llegue a `unhandledRejection`. No espera la Promise ni asimila un thenable personalizado.

Una inicialización singleton o scoped rechazada permanece en la caché; InferDI no la reintenta. Si una dependencia posterior falla durante el preflight, las inicializaciones ya iniciadas conservan su estado de caché y su propietario.

El fallo de una dependencia puede propagarse por varias Promises de inicialización en caché. La liberación asíncrona informa una sola vez del mismo objeto `Error`; los objetos distintos siguen siendo causas distintas de `AggregateError`, incluso con mensajes iguales.

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

## Límites dinámicos

- Pasa tuplas readonly a `registerAsyncFactory` y a `registerClass` cuando la tupla pueda seleccionar una clave async. InferDI clasifica las posiciones async una vez y conserva la referencia a la tupla. Los literales inline se infieren como readonly.
- Los ciclos declarativos y las infracciones de lifetime en frío fallan durante el preflight síncrono. Las llamadas mediante un contenedor capturado después de un límite Promise crean aristas dinámicas fuera de ese análisis.
- `AsyncLazy<T>` difiere la resolución; no añade reintentos, cancelación ni rollback.
- Si una dependencia posterior falla durante el preflight, las inicializaciones anteriores conservan su caché y propiedad. Un transient async ya iniciado puede continuar sin un teardown handle.
- Una clase async con `lazyKey` produce `AsyncLazy<Class>`; una clase mixed sync/async produce `Lazy<Class> | AsyncLazy<Class>`.
- Un ciclo dinámico mediante `AsyncLazy.get()` tras un límite Promise puede esperar su propia Promise pendiente en caché sin error de runtime.

Consulta [Factorías](./factories) para la construcción síncrona y [Scopes y liberación de recursos](./scopes) para el modelo de propiedad.
