# Inicio rápido

En este recorrido construiremos un grafo completo, resolveremos un servicio del contenedor raíz y abriremos un scope de petición. No hacen falta decoradores ni configuración de metadatos.

## Instalación

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## Construir el grafo

```ts
import { Container } from '@inferdi/inferdi'

type RequestContext = {
  requestId: string
}

class Logger {
  info(message: string) {
    console.info(message)
  }
}

class Database {
  constructor(readonly dsn: string) {}
}

class UserService {
  constructor(
    private readonly request: RequestContext,
    private readonly database: Database,
    private readonly logger: Logger
  ) {}

  find(id: string) {
    this.logger.info(`request=${this.request.requestId} user=${id}`)
    return { id, database: this.database.dsn }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, ['dsn'])
  .registerClass(
    'users',
    UserService,
    ['request', 'database', 'logger'],
    'scoped'
  )
```

Cada tupla de dependencias se comprueba contra el constructor. Intercambiar `database` y `logger`, omitir `request` o usar una clave desconocida produce un error de TypeScript.

El grafo anterior contiene una entrada externa y cuatro registros:

```text
dsn ───────────────▶ database (singleton) ─┐
logger (singleton) ────────────────────────┼─▶ users (scoped)
request (scope input) ─────────────────────┘
```

## Resolver servicios

Los singleton del contenedor raíz se resuelven de forma síncrona con `.get()`:

```ts
const database = root.get('database')
```

`users` necesita la entrada `request`, así que primero hay que abrir un scope:

```ts
const request = { requestId: crypto.randomUUID() }

await using scope = root.createScope({ request })
const users = scope.get('users')

users.find('42')
```

El tipo del scope devuelto registra que `request` está disponible. `root.get('users')` no compila porque el contenedor raíz no tiene una petición.

## Elegir tiempos de vida

Los registros usan `singleton` por defecto. Indica otro tiempo de vida cuando el valor pertenezca al scope o al código que lo solicita.

| Tiempo de vida | Creación               | Caché                     | Responsable de liberar |
|----------------|------------------------|---------------------------|------------------------|
| `singleton`    | una vez                | el contenedor que lo crea | ese contenedor         |
| `scoped`       | una vez por scope hijo | el scope hijo             | ese scope              |
| `transient`    | en cada resolución     | ninguna                   | el llamador            |

Un singleton no puede depender directamente de un servicio scoped o transient. InferDI aplica esta regla en los tipos y, por defecto, vuelve a comprobarla en runtime.

## Siguiente paso

| Si necesitas…                                            | Continúa con                                          |
|----------------------------------------------------------|-------------------------------------------------------|
| entender las comprobaciones del grafo en compilación     | [Seguridad de tipos](../core/type-safety)             |
| modelar una petición, un tenant o los datos de una tarea | [Entradas de scope](../core/scope-inputs)             |
| inicializar una dependencia de forma asíncrona           | [Dependencias asíncronas](../core/async-dependencies) |
| cerrar bases de datos y otros recursos con seguridad     | [Scopes y liberación de recursos](../core/scopes)     |
| conectar scopes con un framework web                     | [Adaptadores](../adapters/)                           |
| ver ejemplos completos de frameworks y runtimes          | [Ejemplos](./examples)                                |
