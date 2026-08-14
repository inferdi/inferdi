# Tiempos de vida

InferDI tiene tres tiempos de vida:

| Clase | Creado | Cacheado en | Liberado por el contenedor |
| --- | --- | --- | --- |
| `singleton` | una vez por contenedor propietario | contenedor propietario | sí |
| `scoped` | una vez por scope hijo | scope hijo | sí |
| `transient` | en cada resolución | nunca | no |

Con el valor predeterminado `{fast: false}`, resolver una clave `scoped` desde la raíz lanza `Scoped "key" cannot be resolved from the root container. Use createScope().` Resuelve los servicios scoped desde un contenedor hijo devuelto por `createScope()`.

## La regla del tiempo de vida

Un singleton no puede depender directamente de un servicio `scoped` o `transient`. Un singleton se crea una vez y se comparte en cada petición, así que si captura un valor con scope — el contexto, el usuario o la transacción de la petición actual — el estado de esa única petición se filtra de forma silenciosa hacia todas las demás. InferDI hace que ese caso límite sea inexpresable en el sistema de tipos en lugar de dejarlo a la revisión de código.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

TypeScript rechaza ese registro. Con `fast: false`, los checks de runtime rechazan la misma forma si un cast burla el sistema de tipos.

Las entradas de scope declaradas cuentan como dependencias scoped. Registra un consumidor de petición, contexto de autenticación, tenant o payload de trabajo como `scoped` o `transient`; el compilador rechaza un consumidor singleton antes del runtime. Consulta [Entradas de scope](./scope-inputs).

## Comprobaciones en runtime predeterminadas

`fast` vale `false` por defecto. El grafo permanece mutable y el runtime detecta:

- resolución directa de una clave scoped desde el contenedor raíz
- violaciones de singleton a scoped o de singleton a transient introducidas por casts
- fugas de factorías que capturan un contenedor externo
- ciclos síncronos de singletons
- ciclos síncronos de transitorios
- mal uso de claves dinámicas que burla la comprobación estática

```ts
const root = new Container()
const explicitRoot = new Container({ fast: false })
```

## `fast: true`

Usa `fast: true` solo después de que las pruebas demuestren la forma del grafo:

```ts
const root = new Container({ fast: true })
```

La opción conserva el contrato de tipos, pero elimina la contabilidad de ciclos y tiempos de vida en runtime. El árbol de contenedores se considera fijo después de activarse y también se omite la comprobación de scoped en el root.

Desarrolla y prueba con `fast: false`. Usa `fast: true` solo para un grafo de producción comprobado e inmutable. [Rendimiento](../guide/performance#fast-true) explica los compromisos y las reglas de activación.
