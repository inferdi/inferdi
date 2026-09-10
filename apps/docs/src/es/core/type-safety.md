# Seguridad de tipos

InferDI guarda el grafo declarado en el tipo del contenedor. Cada registro añade una clave, el tipo del servicio, su tiempo de vida, su estado síncrono o asíncrono y los requisitos de entradas de scope. Las llamadas posteriores se comprueban contra ese estado acumulado.

## Firmas de constructor

`registerClass` compara las claves de dependencias con los parámetros del constructor por posición y compatibilidad estructural.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

Las dos dependencias tienen estructuras públicas distintas, así que intercambiarlas sí produce el error descrito:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript usa tipado estructural. Dos clases vacías, o dos clases con los mismos miembros públicos, son asignables entre sí y no permiten demostrar el orden semántico. Da formas distintas a los contratos. Si dos valores deben diferenciarse pese a compartir estructura, usa tipos con marca como explica [Claves Symbol](./symbol-keys#same-value-shape).

## Unicidad de claves

Cada registro encadenado devuelve un contenedor con un tipo de grafo más amplio. Volver a registrar una clave existente es un error:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

Usa `.override()` cuando una prueba sustituya un servicio de forma intencionada. Conserva el contenedor devuelto por cada registro; una referencia anterior no contiene el estado de los nodos posteriores. [Malas prácticas](./bad-practices#stale-builder-references) muestra el problema.

La comprobación de unicidad cubre todos los valores posibles del tipo de la clave. Después de registrar `'dsn'`, una clave de tipo `'dsn' | 'replica'` se rechaza porque podría sobrescribir `'dsn'` en runtime. Los tipos amplios `string` y `symbol` siguen disponibles si no se solapan con el grafo conocido, aunque también reducen la precisión del tipo del grafo.

## Claves dinámicas

`.get()` comprueba directamente las claves literales. Acota con `.has()` una clave obtenida en runtime:

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` demuestra que la clave está registrada. No demuestra que las entradas de scope pendientes estén listas ni que `.get()` pueda aceptar una clave asíncrona.

## El tiempo de vida en el tipo

Cada entrada registra su tiempo de vida. Un singleton no puede capturar una dependencia con scope o transitoria:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

El contrato de runtime predeterminado repite las comprobaciones de ciclos y tiempos de vida para capturar casts, claves dinámicas y contenedores externos que TypeScript no puede analizar. `{ fast: true }` es otro contrato para grafos fijos, con menos comprobaciones en runtime.

## Preparación y estado async

Las entradas de scope y las dependencias async declarativas también determinan qué claves están listas y si se resuelven con `.get()` o `.getAsync()`:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

Al root le falta `request`; el `handler` del scope ya está listo, pero sigue siendo asíncrono porque depende de `database`. Continúa con [Entradas de scope](./scope-inputs) y [Dependencias asíncronas](./async-dependencies).
