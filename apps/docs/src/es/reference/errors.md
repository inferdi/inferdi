# Errores

InferDI lanza errores explícitos ante el uso indebido del grafo y del ciclo de vida. Mantén estos mensajes visibles en las pruebas para que los errores de registro fallen pronto.

| Disparador | Forma del mensaje |
| --- | --- |
| `.get(k)` sobre una clave inexistente | `Key "k" not found` |
| Resolver en un contenedor liberado | `Container is disposed (key: "k")` |
| Resolver con un ancestro liberado | `Ancestor container is disposed (key: "k")` |
| `createScope()` después de liberar | `Cannot create scope from a disposed container` |
| Violación del tiempo de vida singleton | `Singleton "x" cannot depend on scoped "y"...` |
| Ciclo síncrono | `Circular dependency detected: a -> b -> a...` |
| Liberación síncrona sobre un recurso asíncrono | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Override tardío | `Cannot override "k" because it has already been resolved...` |
| Override en un contenedor liberado | `Cannot override on a disposed container (key: "k")` |

## Ciclos entre factorías asíncronas

Los ciclos entre factorías asíncronas no se detectan. Una factoría que hace `await` sobre otra factoría asíncrona puede reanudarse después de que la pila de ciclos síncrona se haya vaciado. Si ambos lados acaban esperándose mutuamente, quien llama observa una promesa pendiente que nunca se resuelve.

Corrige los ciclos asíncronos a nivel arquitectónico:

- separa la inicialización compartida
- eleva uno de los lados a un servicio anterior
- usa `Lazy<singleton>` solo cuando ambos lados son singletons
- añade un watchdog de desarrollo con timeout alrededor de los `await` de nivel superior sospechosos

## Errores de limpieza en los adaptadores

Los errores de limpieza de un adaptador que ocurren después de producir una respuesta nunca se exponen al cliente. Se enrutan a `onDisposeError` o al sink de respaldo del adaptador.

Los fallos de configuración (setup) son distintos: se expone el error de setup original, y cualquier fallo de limpieza durante la liberación del setup se enruta al sink sin agregarse al error expuesto.
