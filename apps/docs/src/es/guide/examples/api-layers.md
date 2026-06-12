# Capas de API

Las integraciones con RPC y GraphQL deberían crear un scope de InferDI por cada petición HTTP, no por cada procedimiento ni por cada resolver.

Estos ejemplos comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compara dónde crea el scope cada integración y qué límite es responsable de su liberación.

| Ejemplo | Muestra |
| --- | --- |
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | `fetchRequestHandler` de tRPC con scope alrededor de toda una petición HTTP |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | Scope en el context de Apollo Server para ejecución no en streaming |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | Scope en el context de GraphQL Yoga para ejecución no en streaming |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Archivo del repositorio: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Archivo del repositorio: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Archivo del repositorio: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)
