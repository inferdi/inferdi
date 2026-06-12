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

## Momento del override

Los overrides deben ocurrir antes de que se resuelva la clave:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Esa segunda línea lanza una excepción. Un override tardío dividiría el grafo: los consumidores existentes mantendrían la instancia antigua mientras que las resoluciones posteriores devolverían el mock.

## Propiedad

Los valores de override son de propiedad externa. Al igual que `registerValue`, un override no se añade a la cola de liberación del contenedor. El fixture de prueba es dueño de su limpieza.

## Localidad del scope

Un override muta solo el contenedor sobre el que se invoca:

```ts
const scope = root.createScope().override('db', mockDb)
```

La raíz y los scopes hermanos no se ven afectados. Los overrides a nivel del padre son visibles a través de la búsqueda habitual en el padre.
