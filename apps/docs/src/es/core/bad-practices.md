# Malas prácticas

Después de cada llamada a `register*`, sigue usando la referencia que devolvió el método. Una referencia anterior conserva el tipo antiguo del grafo aunque apunte al mismo contenedor en runtime.

## Reutilizar una referencia anterior

Cada método `register*` modifica el contenedor y devuelve el mismo objeto con un tipo genérico ampliado. TypeScript amplía el tipo del valor devuelto, pero no cambia el tipo de las referencias creadas antes de la llamada.

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// Compila porque base todavía tiene el tipo Container<{}>.
base.registerAsyncFactory('dependency', async () => 2, [])

// TypeScript ve number, pero el nuevo registro proporciona Promise<number>.
syncGraph.get('consumer').dependency
```

`base` y `syncGraph` apuntan al mismo objeto. La última llamada sobrescribe el registro de `dependency` en runtime, mientras que el tipo de `syncGraph` sigue describiendo el grafo síncrono original. Las clases registradas antes del reemplazo conservan su clasificación de dependencias.

## Por qué el compilador permite este código

La comprobación de claves duplicadas usa las claves del tipo de grafo de la referencia actual. El tipo de `syncGraph` contiene `dependency`, por lo que registrarla de nuevo mediante `syncGraph` produce un error de tipos. El tipo de `base` sigue siendo `Container<{}>`, donde `keyof T` es `never`.

TypeScript no actualiza los argumentos genéricos de todos los alias de un objeto mutable. Tampoco ofrece tipos lineales o afines que permitan marcar `base` como consumido después de un registro. InferDI no añade una consulta al registry en cada registro para rastrear referencias antiguas, ya que esa comprobación aumentaría el coste de los grafos construidos de forma correcta.

## Conserva la última referencia devuelta

Construye el grafo en una sola cadena y usa su resultado:

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

No ignores el valor devuelto por `register*` ni continúes registrando mediante una referencia anterior. Un módulo también debe devolver el contenedor producido por su último registro. Consulta [Módulos](./modules).

## No uses `register*` como API de reemplazo

Elige una sola implementación para cada clave al construir el grafo de producción. Usa control de flujo normal o `.use()` cuando la configuración seleccione una implementación.

Las pruebas pueden usar `.override()` antes de resolver el grafo si el reemplazo conserva el tiempo de vida, el modo lazy y el modo async originales. `.override()` no puede convertir un registro síncrono en un registro asíncrono declarativo. Consulta [Pruebas y overrides](./testing).

## Service locator en la lógica de negocio

Pasar el contenedor a un servicio de dominio oculta sus dependencias reales y aplaza los fallos por claves ausentes. Pasa el servicio directamente:

```ts
class UserController {
  constructor(
    private readonly container: AppContainer // [!code --]
    private readonly users: UserRepo // [!code ++]
  ) {}

  show(id: string) {
    return this.container.get('users').find(id) // [!code --]
    return this.users.find(id) // [!code ++]
  }
}
```

Mantén las factorías que usan un resolver en la raíz de composición cuando el ensamblado las necesite.

## Scope de petición global

Un scope global mutable puede filtrar valores entre peticiones concurrentes. Créalo y ciérralo dentro del límite de la petición:

```ts
let currentScope = root.createScope({ request }) // [!code warning]

async function handle(request: Request) {
  const scope = root.createScope({ request }) // [!code focus]
  try {
    return await scope.getAsync('handler')
  } finally {
    await scope.dispose()
  }
}
```

Los adaptadores de frameworks automatizan ese límite y conservan las mismas reglas de propiedad.

## Borrar el tipo concreto del contenedor

Una anotación `Container` descarta el estado acumulado del grafo. Deja que se infiera el retorno del builder y deriva los aliases desde él:

```ts
const buildContainer = (): Container => new Container() // [!code --]
const buildContainer = () => new Container() // [!code ++]
  .registerClass('users', UserRepo, [])

type AppContainer = ReturnType<typeof buildContainer>
```

Usa `ReturnType` para los aliases del contenedor y del scope de tu aplicación en vez de reconstruir sus argumentos genéricos.

## Perder la propiedad

Crear un scope sin una ruta de limpieza deja vivos sus servicios scoped. Limpia en el mismo límite del ciclo de vida donde lo creas:

```ts
const scope = root.createScope({ request }) // [!code warning]
return scope.get('handler').run()

await using ownedScope = root.createScope({ request }) // [!code focus]
return ownedScope.get('handler').run()
```

Si tu toolchain no admite `await using`, usa `try/finally` y `await scope.dispose()`. Los values, overrides, scope inputs y resultados transient siguen siendo propiedad del llamante y necesitan su propia política de limpieza.
