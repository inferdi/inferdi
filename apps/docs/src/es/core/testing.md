# Pruebas y overrides

Usa `.override()` cuando las pruebas necesitan reemplazar un registro existente por un mock.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

El valor del override debe ser asignable al tipo registrado original. Las claves ausentes y los mocks incompatibles son errores de TypeScript.

## Providers tipados

`Container.Providers<C>` convierte el tipo de un contenedor construido en un conjunto de funciones provider. Resulta útil para crear mocks sin resolver el grafo de producción.

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

El tipo conserva cada servicio concreto, incluidos los valores detrás de companions lazy gestionados. InferDI no registra ni toma posesión de estos providers; la prueba sigue siendo responsable de ellos.

## Momento del override

Aplica los overrides antes de resolver el grafo de dependencias:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

La segunda línea lanza una excepción porque el valor singleton ya está en la caché local de este contenedor. La comprobación se basa deliberadamente en esa caché: también detecta valores scoped almacenados en el scope actual, `registerValue` y overrides repetidos. En el modo strict mutable, las resoluciones transient y los valores propiedad de un ancestro que se resuelven desde un hijo no se guardan en la caché local, por lo que no se registran. Los scopes fijos pueden reflejar singletons delegados en su caché local y no admiten mutaciones después de activarse. Un transient devuelto anteriormente permanece en manos de quien lo recibió, mientras que las resoluciones posteriores devuelven el mock. Este límite forma parte del contrato, pero no justifica overrides tardíos: aplicarlos antes de resolver el grafo evita dividirlo.

## Propiedad

Los valores de override son de propiedad externa. Al igual que `registerValue`, un override no se añade a la cola de liberación del contenedor. El fixture de prueba es dueño de su limpieza.

## Localidad del scope

Un override muta solo el contenedor sobre el que se invoca:

```ts
const scope = root.createScope().override('db', mockDb)
```

La raíz y los scopes hermanos no se ven afectados. Los overrides a nivel del padre son visibles a través de la búsqueda habitual en el padre.
