# Seguridad de tipos

La regla central de InferDI: el grafo de dependencias vive en el sistema de tipos. Un grafo inválido — un orden de argumentos incorrecto, una clave que nunca se registró, un singleton que alcanza estado con scope — es un error de tipos que ves en tu editor, no un stack trace que descubres bajo carga. Todo lo que el compilador puede demostrar estáticamente se comprueba estáticamente; los guards de runtime existen solo para atrapar lo que los casts `as` y las claves dinámicas dejan pasar.

## Firmas de constructor

`registerClass` comprueba la tupla de dependencias contra la lista de parámetros del constructor.

```ts
class Logger {}
class Db {}

class UserRepo {
  constructor(logger: Logger, db: Db) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('db', Db, [])
  .registerClass('users', UserRepo, ['logger', 'db'])
```

Si el constructor cambia, el registro cambia con él. Intercambiar `['db', 'logger']` se rechaza porque el primer parámetro del constructor espera un `Logger`.

## Unicidad de claves

Cada registro devuelve un tipo de contenedor ampliado. Volver a registrar la misma clave a través de la API fluida se rechaza:

```ts
new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  // TypeScript rejects this duplicate key.
  .registerValue('dsn', 'sqlite://memory')
```

Las pruebas usan `.override()` cuando el reemplazo es intencional.

El guard de unicidad comprueba todo el conjunto de valores representado por el tipo de la clave. Si una clave tiene el tipo `'dsn' | 'replica'` después de registrar `'dsn'`, TypeScript rechaza la llamada porque el valor de runtime podría sobrescribir `'dsn'`. La misma regla se aplica a un `string` o `symbol` amplio y a `lazyKey`, que no puede solaparse con la clave principal ni con una clave existente.

Las claves amplias y union siguen disponibles cuando sus valores posibles no se solapan con el grafo. Un `string` amplio es válido en un contenedor vacío o después de registros compuestos solo por symbols. Acota una clave de runtime a un miembro nuevo antes de registrarla; usa `.override()` cuando quieras reemplazar un registro.

## Claves dinámicas

`.get()` comprueba directamente las claves estáticas. Si una clave llega en runtime, acota primero su tipo con `.has()`:

```ts
const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

El grafo concreto anterior no tiene inputs de scope pendientes, y `.getAsync()` acepta cualquiera de las claves registradas sin importar su modo sync o async. `.has()` solo demuestra que la clave está registrada. Devuelve `false` si el contenedor está liberado, pero no demuestra que los inputs de scope estén listos ni que la clave pueda pasarse a `.get()`.

## El tiempo de vida en el tipo

Cada entrada lleva tanto el tipo del valor como su clase de tiempo de vida. El sistema de tipos filtra las dependencias para que un singleton no pueda depender directamente de servicios con scope o transitorios.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

El modo estricto en runtime sigue siendo defensa en profundidad frente a casts `as`, claves dinámicas, contenedores externos capturados y ciclos de dependencias.

## Preparación y estado async

El tipo del grafo también registra requisitos de entradas de scope y registros async declarativos. Una clave desaparece de `.get()` hasta que se proporcionan sus entradas, y una clave `AsyncSpec` pasa a `.getAsync()` junto con las clases que dependen de ella.

```ts
const root = new Container()
  .declareScopeInputs<{request: Request}>()
  .registerAsyncFactory('db', openDatabase, [])
  .registerClass('handler', Handler, ['request', 'db'], 'scoped')

const scope = root.createScope({request})

// @ts-expect-error: handler is async
scope.get('handler')

await scope.getAsync('handler')
```

Usa [Entradas de scope](./scope-inputs) para modelar la preparación y [Dependencias asíncronas](./async-dependencies) para elegir el contrato Promise.
