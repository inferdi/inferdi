# Inyección perezosa

`Lazy<T>` y `AsyncLazy<T>` retrasan la resolución hasta `.get()`. Un destino sync devuelve `T`; un destino async declarativo devuelve `Promise<T>`. Una clase cuya clave pueda elegir ambos modos recibe `Lazy<T> | AsyncLazy<T>`.

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

Pasar un `lazyKey` a `registerClass`, `registerFactory` o `registerAsyncFactory` crea un registro acompañante cuyo valor es `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` recibe la clave acompañante como quinto argumento:

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Obtener o inyectar el wrapper no inicia la factoría. `.get()` devuelve la Promise
nativa en caché para destinos singleton y scoped, incluido un rechazo. Un destino
transient se inicia en cada llamada y queda en manos del caller. Un
`registerFactory` Promise-valued sigue produciendo `Lazy<Promise<T>>`.

## El tiempo de vida se preserva

Los acompañantes lazy conservan el tiempo de vida del destino. Un singleton solo puede inyectar `Lazy` o `AsyncLazy` de un destino singleton. TypeScript también rechaza unions con un lifetime posiblemente corto y unions de wrappers managed/unmanaged.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Los consumidores con scope y transitorios pueden usar acompañantes perezosos para cualquier tiempo de vida porque no se cachean globalmente.

## Scope capturado y liberación de recursos

El wrapper captura el contenedor que lo resolvió. Un wrapper obtenido del primer
scope hijo sigue usando ese scope después de crear otro. Tras liberar el scope
capturado, `AsyncLazy.get()` devuelve una Promise rechazada. El propietario libera
los destinos singleton/scoped resueltos y espera una inicialización ya iniciada.

## Dependencias circulares

InferDI detecta los ciclos síncronos, incluidas las dependencias async declarativas durante el preflight. Un ciclo dinámico mediante `AsyncLazy.get()` tras un límite Promise queda fuera del detector síncrono. Si una inicialización vuelve a obtener su propia Promise pendiente, ambas partes esperan sin terminar. Divide la inicialización compartida o elimina el ciclo. Consulta [Dependencias asíncronas](./async-dependencies).
