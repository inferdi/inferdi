# Ejemplos

Elige el límite de ciclo de vida que controla tu aplicación y compara cómo crea, expone y libera un scope cada ecosistema. Cada grupo corresponde a un directorio de [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples).

## Empieza aquí

Lee primero [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). La mayoría de los ejemplos del lado del servidor importan este builder para que sus archivos puedan centrarse en el cableado del framework.

| Grupo | Qué comparar |
| --- | --- |
| [Uso en JavaScript](/es/guide/examples/javascript) | Uso con Node ESM, Node CommonJS y bundler de navegador |
| [Frameworks de backend](/es/guide/examples/backend) | Adaptadores de scope de petición para Fastify, Hono, Koa, Express y Elysia |
| [Capas de API](/es/guide/examples/api-layers) | Límites de scope de petición en tRPC, Apollo Server y GraphQL Yoga |
| [Frameworks full-stack](/es/guide/examples/fullstack) | Scopes de loader/action en Next.js App Router y Remix |
| [Runtimes y plataformas edge](/es/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy y Supabase Edge |
| [Frameworks de frontend](/es/guide/examples/frontend) | Scopes de feature en React, React Native, Vue y Svelte |
| [Bots, colas y CLI](/es/guide/examples/workers-cli) | Scopes de operación en Telegraf, Grammy, BullMQ, Commander y Yargs |

## Cómo leer los grupos

Usa `examples/_shared/container.ts` como el grafo de la aplicación para los ejemplos del lado del servidor. Las páginas de grupo se centran en la propiedad del ciclo de vida: dónde se crea un scope, dónde se expone y dónde se libera.

Para los ejemplos del lado del servidor y de workers, compara los hooks del ciclo de vida del framework/plataforma. Para los ejemplos de frontend, compara los límites de montaje y desmontaje.

::: info Fragmentos de referencia
El workspace raíz no instala todas las dependencias de frameworks ni comprueba los tipos de `examples/`. Copia el patrón que necesites, instala sus dependencias y adapta el grafo compartido a tus tipos.
:::
