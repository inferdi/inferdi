# Por qué InferDI

La inyección manual por constructor es un buen punto de partida. Mantiene las dependencias visibles y TypeScript comprueba cada llamada a `new`. InferDI resulta útil cuando el grafo supera unas pocas llamadas y también debes controlar tiempos de vida, scopes, preparación asíncrona, módulos y liberación de recursos.

## Comprobar la composición como un grafo

Cada registro devuelve un tipo de contenedor nuevo. Ese tipo conserva las claves conocidas, tipos de servicio, tiempos de vida, estado asíncrono y entradas de scope pendientes. Un registro posterior no puede pedir silenciosamente una clave desconocida, pasar un argumento incompatible, duplicar una clave ni hacer que un singleton capture estado de menor duración.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Database {
  find(id: string) {
    return { id }
  }
}

class UserService {
  constructor(readonly database: Database) {}
}

const app = new Container()
  .registerClass('database', Database, [])
  .registerClass('users', UserService, ['database'])

const users = app.get('users')
//    ^?
```

InferDI llama a este estado acumulado «el grafo es el tipo». Los módulos conservan los mismos requisitos cuando la composición se reparte entre archivos.

## Qué añade al ensamblado manual

El ensamblado manual ya comprueba `new UserService(database)`. Por sí solo no registra el tiempo de vida de cada alta, cómo se propaga el estado async, qué exige un módulo reutilizable ni qué recursos en caché posee un scope. InferDI añade esos contratos para el grafo completo y gestiona el ciclo de vida sin ocultar las elecciones.

El código de ensamblado sigue ahí. Durante una revisión se ve qué implementación se eligió y en qué orden recibe sus dependencias.

## Un runtime pequeño que hace trabajo real

Core no tiene dependencias en runtime, no exige decoradores ni metadata reflection y no resuelve mediante Proxy. El bundle de producción tiene un presupuesto forzoso inferior a 3 KiB gzip. Un acierto de caché empieza con un solo `Map.get()`; un `undefined` explícito usa un marcador interno en lugar de una segunda consulta.

Los tipos desaparecen al compilar, pero el contenedor registra providers, crea objetos, mantiene cachés, informa de errores en runtime y libera los recursos que posee. El modo predeterminado conserva diagnósticos de ciclos y tiempos de vida. `{ fast: true }` es un contrato opcional para grafos fijos que elimina algunas comprobaciones.

## La lógica de negocio sigue siendo código normal

Los servicios de dominio reciben argumentos normales de constructor o función. No necesitan importar InferDI ni aceptar un resolver. El contenedor vive en la raíz de composición y en los límites del ciclo de vida, donde la aplicación elige implementaciones y abre scopes.

Una prueba unitaria puede instanciar el servicio directamente con una dependencia falsa. Sustituir InferDI exige reescribir registros y la integración con el framework, pero las reglas de negocio pueden quedar intactas si respetas esa frontera. [Raíz de composición](./composition-root) muestra la separación completa.

## Scopes y propiedad explícita

Un scope puede representar una petición HTTP, un trabajo, una operación de tenant u otra unidad acotada. El contenedor libera los resultados en caché de clases y factorías que posee. Los valores, overrides, entradas de scope y resultados transitorios pertenecen al llamador. Los contenedores padre e hijo nunca se liberan entre sí automáticamente.

Los adaptadores conectan estas reglas con React, Fastify, Hono, Koa, Express y Elysia sin introducir comportamiento de framework en core.

## Hasta dónde llegan las garantías

TypeScript conserva su tipado estructural. Las formas idénticas son intercambiables salvo que marques los valores, y `any` o los casts pueden saltarse las comprobaciones. Las claves amplias reducen la precisión del grafo. Las lecturas dinámicas de dependencias después de un `await` no participan en el seguimiento síncrono de ciclos.

InferDI no diseña la arquitectura, repara ciclos, evita toda fuga de recursos ni acelera cualquier aplicación. Comprueba las relaciones declaradas y mantiene pequeño el mecanismo de runtime. Continúa con [Inicio rápido](./quick-start) o consulta los diagnósticos concretos de [Seguridad de tipos](../core/type-safety).
