# Guards de tiempo de vida

InferDI tiene tres tiempos de vida:

| Clase | Creado | Cacheado en | Liberado por el contenedor |
| --- | --- | --- | --- |
| `singleton` | una vez por contenedor propietario | contenedor propietario | sí |
| `scoped` | una vez por scope | scope | sí |
| `transient` | en cada resolución | nunca | no |

## La regla del tiempo de vida

Un singleton no puede depender directamente de un servicio `scoped` o `transient`. Un singleton se crea una vez y se comparte en cada petición, así que si captura un valor con scope — el contexto, el usuario o la transacción de la petición actual — el estado de esa única petición se filtra de forma silenciosa hacia todas las demás. InferDI hace que ese caso límite sea inexpresable en el sistema de tipos en lugar de dejarlo a la revisión de código.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

Ese registro lo rechaza TypeScript. En modo estricto, la misma forma se rechaza en runtime si un cast burla el sistema de tipos.

## Modo estricto

`strict: true` es el valor por defecto. Atrapa:

- violaciones de singleton a scoped o de singleton a transient introducidas por casts
- fugas de factorías que capturan un contenedor externo
- ciclos síncronos de singletons
- ciclos síncronos de transitorios
- mal uso de claves dinámicas que burla la comprobación estática

```ts
const root = new Container({ strict: true })
```

## Modo rápido

Usa `strict: false` solo después de que las pruebas demuestren la forma del grafo:

```ts
const root = new Container({ strict: false })
```

El modo rápido elimina del camino de resolución la contabilidad de ciclos y tiempos de vida en runtime. No cambia el contrato a nivel de tipos, pero tampoco puede defenderse frente a casts deshonestos, contenedores externos capturados o ciclos.

Flujo de trabajo recomendado: desarrolla y prueba en modo estricto, y luego cambia únicamente los grafos de producción sensibles al rendimiento tras una auditoría.
