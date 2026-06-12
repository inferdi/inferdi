# Scopes y limpieza

Un scope acota el tiempo de vida de los servicios locales a una petición a una sola unidad de trabajo. Un scope hijo hereda cada registro del padre, pero cachea sus propias instancias con scope y es dueño de su limpieza, de modo que el scope creado para una petición nunca comparte estado con otra ni sobrevive a ella.

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` es un singleton de raíz. `request` se crea una vez por scope y se libera cuando el scope se libera.

## Propiedad

Cada contenedor libera solo las instancias que creó.

| Instancia | Propietario |
| --- | --- |
| Singleton de raíz | Contenedor raíz |
| Servicio con scope | Scope de petición |
| Singleton resuelto por primera vez en un hijo | Ese contenedor hijo |
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
