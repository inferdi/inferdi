# Scopes y liberación de recursos

Un scope acota el tiempo de vida de los servicios locales a una petición a una sola unidad de trabajo. Un scope hijo hereda cada registro del padre, pero cachea sus propias instancias con scope y es dueño de su limpieza, de modo que el scope creado para una petición nunca comparte estado con otra ni sobrevive a ella.

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` es un singleton del root. La petición es una entrada externa que sigue perteneciendo a la aplicación, mientras que el scope crea y libera `handler`.

Los registros `scoped` pertenecen a scopes hijos. Con `fast: false` (el valor predeterminado), resolver uno desde el root lanza `Scoped "key" cannot be resolved from the root container. Use createScope().` Resuelve la clave desde el contenedor que devuelve `createScope()`. `fast: true` omite esta comprobación en runtime.

## Entradas de scope

Los inputs de scope representan valores externos que existen al abrir un scope, como una petición, el contexto de autenticación, un tenant o los datos de un job. Decláralos una vez y proporciona el subconjunto necesario mediante `createScope(inputs)`:

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

El tipo del contenedor registra los inputs proporcionados y oculta los servicios dependientes hasta que estén listos. Consulta [Entradas de scope](./scope-inputs) para perfiles con nombre, refinamiento anidado, factorías con dependencias, tipos reutilizables y reglas de validación.

## Propiedad

Cada contenedor libera solo las instancias que creó.

| Instancia | Propietario |
| --- | --- |
| Singleton registrado en la raíz, aunque se resuelva desde un hijo | Contenedor raíz |
| Singleton registrado en un contenedor hijo | Ese contenedor hijo |
| Servicio con scope | Scope de petición |
| Transitorio | Llamante |

`root.dispose()` no cascadea hacia los scopes hijos ya creados. Libera los scopes en su propio límite de ciclo de vida.

## Gestión nativa de recursos

Container implementa ambos símbolos de liberación:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Usa `await using` o `await container.dispose()` cuando algún recurso propio pueda ser asíncrono.

## Protocolo de liberación

Las instancias propias se liberan en orden inverso al de creación. El contenedor sondea:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

Si fallan varios liberadores, InferDI los recopila en un `AggregateError` para que una limpieza fallida no impida cerrar los recursos posteriores.
