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

## El tiempo de vida en el tipo

Cada entrada lleva tanto el tipo del valor como su clase de tiempo de vida. El sistema de tipos filtra las dependencias para que un singleton no pueda depender directamente de servicios con scope o transitorios.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  // Rejected: singleton cannot capture scoped request state.
  .registerClass('users', UserService, ['request'], 'singleton')
```

El modo estricto en runtime sigue siendo defensa en profundidad frente a casts `as`, claves dinámicas, contenedores externos capturados y ciclos de dependencias.
