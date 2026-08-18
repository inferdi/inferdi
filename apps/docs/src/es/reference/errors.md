# Errores

InferDI lanza errores explícitos ante el uso indebido del grafo y del ciclo de vida. Mantén estos mensajes visibles en las pruebas para que los errores de registro fallen pronto.

| Disparador                                                  | Forma del mensaje                                                                            |
|-------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `.get(k)` sobre una clave inexistente                       | `Key "k" not found`                                                                          |
| Resolver en un contenedor liberado                          | `Container is disposed (key: "k")`                                                           |
| Resolver con un ancestro liberado                           | `Ancestor container is disposed (key: "k")`                                                  |
| `createScope()` después de liberar                          | `Cannot create scope from a disposed container`                                              |
| Registro después de liberar                                 | `Cannot register on a disposed container (key: "k")`                                         |
| Clave scoped resuelta desde la raíz con `{fast: false}`     | `Scoped "k" cannot be resolved from the root container. Use createScope().`                  |
| Violación del tiempo de vida singleton                      | `Singleton "x" cannot depend on scoped "y"...`                                               |
| Ciclo síncrono                                              | `Circular dependency detected: a -> b -> a...`                                               |
| Liberación síncrona sobre un recurso asíncrono              | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...`          |
| Liberación síncrona sobre una inicialización async en caché | `Sync [Symbol.dispose] called on a container that cached a Promise from an async factory...` |
| Override tardío                                             | `Cannot override "k" because it has already been resolved...`                                |
| Override en un contenedor liberado                          | `Cannot override on a disposed container (key: "k")`                                         |

La liberación síncrona observa el rechazo de una Promise nativa en caché antes de informar del uso incorrecto. Un rechazo posterior no llega a `unhandledRejection`, pero la ruta síncrona no puede esperar ni cerrar el recurso. Tampoco llama a `.then()` en un valor Promise-like personalizado.

Durante la liberación asíncrona, una dependencia fallida y sus registros dependientes pueden rechazar con el mismo objeto `Error`. InferDI informa de ese objeto una vez. Los objetos distintos siguen siendo causas distintas de `AggregateError`, aunque sus mensajes coincidan.

## Ciclos entre factorías asíncronas

Las dependencias declaradas en `registerAsyncFactory(..., deps, ...)` pasan por una fase previa síncrona. El detector de ciclos existente rechaza el ciclo antes de ejecutar el cuerpo de cualquier factoría.

No se detectan los ciclos creados después de un límite de Promise. Esto incluye callbacks de `registerFactory` que devuelven una Promise y contenedores capturados que se usan después de `await`. Si ambos lados se esperan mutuamente, quien llama recibe una Promise que nunca se resuelve.

Corrige los ciclos asíncronos a nivel arquitectónico:

- separa la inicialización compartida
- eleva uno de los lados a un servicio anterior
- usa `Lazy<singleton>` solo para dependencias singleton síncronas
- añade un watchdog de desarrollo con timeout alrededor de los `await` de nivel superior sospechosos

## Errores de limpieza en los adaptadores

Los errores de limpieza de un adaptador que ocurren después de producir una respuesta nunca se exponen al cliente. Se enrutan a `onDisposeError` o al sink de respaldo del adaptador.

Los fallos de configuración (setup) son distintos: se expone el error de setup original, y cualquier fallo de limpieza durante la liberación del setup se enruta al sink sin agregarse al error expuesto.
