# Tiempos de vida

InferDI tiene tres tiempos de vida:

| Clase       | Creado                             | Cacheado en            | Liberado por el contenedor |
|-------------|------------------------------------|------------------------|----------------------------|
| `singleton` | una vez por contenedor propietario | contenedor propietario | sí                         |
| `scoped`    | una vez por scope hijo             | scope hijo             | sí                         |
| `transient` | en cada resolución                 | nunca                  | no                         |

Resuelve las claves `scoped` desde un contenedor hijo devuelto por `createScope()`. El contrato predeterminado con comprobaciones rechaza su resolución desde el contenedor raíz.

## La regla del tiempo de vida

Un singleton no puede depender directamente de un servicio `scoped` o `transient`. Un singleton se crea una vez y se comparte en cada petición, así que si captura un valor con scope — el contexto, el usuario o la transacción de la petición actual — el estado de esa única petición se filtra de forma silenciosa hacia todas las demás. InferDI hace que ese caso límite sea inexpresable en el sistema de tipos en lugar de dejarlo a la revisión de código.

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

TypeScript rechaza ese registro con cualquier contrato de runtime. El contrato predeterminado con comprobaciones también rechaza la misma forma en runtime si un cast burla el sistema de tipos.

Las entradas de scope declaradas cuentan como dependencias scoped. Registra un consumidor de petición, contexto de autenticación, tenant o payload de trabajo como `scoped` o `transient`; el compilador rechaza un consumidor singleton antes del runtime. Consulta [Entradas de scope](./scope-inputs).

<!-- Preserve deep links from before the container-option sections moved -->
<h6 id="comprobaciones-en-runtime-predeterminadas" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>
<h6 id="fast-true" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>

El contrato del contenedor controla estas comprobaciones de runtime. Consulta
[Opciones del contenedor](../reference/api#opciones-del-contenedor) para conocer
el comportamiento exacto de los contratos predeterminado y fast.
