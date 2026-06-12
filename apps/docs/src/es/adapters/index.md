# Adaptadores de frameworks

Cada adaptador crea exactamente un scope de petición por petición, lo expone en la ubicación nativa del framework y lo libera en el punto de finalización seguro del framework, conservando al mismo tiempo el tipo concreto de contenedor que tu aplicación posee, de modo que `request.di` queda totalmente tipado, no `any` ni un contenedor base.

Ese es todo el trabajo. Los adaptadores son una fina capa de pegamento del ciclo de vida: el mismo diseño que mantiene a [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) sin dependencias también mantiene los decoradores, el escaneo de controladores, la inyección de parámetros de handlers y el descubrimiento de rutas fuera del núcleo. Optas por el ciclo de vida de las peticiones de un framework, no por la idea que ese framework tenga de la inyección de dependencias.

## Paquetes

| Paquete | Framework | Ubicación del scope | Modo solo raíz |
| --- | --- | --- | --- |
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di` | sí |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Hono v4 | `c.var.di` | no |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | Koa v3 | `ctx.state.di` | no |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5 | `req.di` | no |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | Elysia v1 | `context.di` | sí |

## Contrato común del ciclo de vida

En modo con scope, cada adaptador ejecuta los mismos pasos para cada petición:

1. **Crea** el scope a partir del contenedor raíz (`createScope`, por defecto `root.createScope()`) cuando comienza la petición.
2. **Expone** el scope en la ubicación nativa del framework (`request.di`, `ctx.state.di`, `c.var.di`, o la clave de contexto de Elysia) *antes* de que se ejecute la configuración, de modo que un fallo de configuración y tus hooks de limpieza observen todos el mismo slot.
3. **Configura** el scope con `setupScope` para hidratar el estado derivado de la petición: id de petición, usuario autenticado, IP del cliente. Puede ser asíncrono.
4. **Atiende** la petición: los handlers de rutas y los manejadores de errores del framework resuelven servicios desde el scope expuesto.
5. **Libera** el scope en el punto de finalización seguro del framework (`disposeScope`, por defecto `scope.dispose()`), salvo que se haya transferido la propiedad.

### Opciones compartidas

| Opción | Por defecto | Propósito |
| --- | --- | --- |
| `container` | requerido | Contenedor raíz expuesto a la aplicación. Los adaptadores nunca lo liberan (excepto el `disposeRootOnClose` opcional de Fastify). |
| `createScope` | `root.createScope()` | Construye el scope por petición. Puede ser asíncrono. |
| `setupScope` | ninguno | Hidrata el scope antes de que se ejecuten los handlers. Puede ser asíncrono. |
| `disposeScope` | `scope.dispose()` | Limpieza personalizada. Puede ser síncrona o asíncrona. |
| `autoDispose` | `true` | `false`, o un predicado que devuelve `false`, cede la liberación a tu código. |
| `onDisposeError` | sumidero por adaptador | Recibe los fallos de liberación del scope de petición: Fastify `request.log.error`, Koa `ctx.app.emit('error')`, los demás `console.error`. |
| `skipInferdiDispose(...)` | — | Marca una petición como propiedad de la aplicación para streaming o trabajo en segundo plano. |

### Reglas de errores y de propiedad

- **Un fallo de configuración expone solo el error original.** Si `setupScope` lanza una excepción, el adaptador libera el scope a medio construir y vuelve a lanzar ese error. Un fallo de limpieza durante esta operación va a `onDisposeError` (o al sumidero) y nunca se agrega al error expuesto.
- **Una petición fallida igualmente se libera.** `skipInferdiDispose` suprime la limpieza solo en una respuesta *exitosa*; una ruta de error libera de todos modos. Express es la excepción: su middleware basado en callbacks no puede observar un error de ruta gestionado, por lo que una petición fallida de Express omitida permanece como propiedad de la aplicación.
- **`autoDispose: false` y `skipInferdiDispose` transfieren la propiedad.** Entonces tu código pasa a ser responsable de liberar el scope en el límite correcto del framework.
- **Los errores de limpieza después de que se produce una respuesta se enrutan al sumidero y se descartan.** La respuesta ya se envió, por lo que un fallo tardío de limpieza nunca podrá corromperla.

## Diferencias importantes

| Adaptador | Diferencia |
| --- | --- |
| Fastify | Libera en `onResponse`; la limpieza por aborto usa `onRequestAbort`; la liberación de la raíz puede activarse con `disposeRootOnClose`. |
| Hono | Libera después de `await next()`; los helpers de streaming pueden devolver antes de que termine el trabajo del stream, por lo que las rutas de streaming a menudo necesitan `skipInferdiDispose`. |
| Koa | Espera al `finish` o `close` de la respuesta de Node, por lo que los cuerpos de stream normales no necesitan un skip. |
| Express | No puede detectar un error de ruta gestionado aguas abajo desde un middleware basado en callbacks; una petición fallida omitida permanece como propiedad de la aplicación. |
| Elysia | La limpieza está vinculada a `onAfterResponse`; si ese hook nunca se alcanza, el adaptador no puede liberar los recursos retenidos por el scope. |
