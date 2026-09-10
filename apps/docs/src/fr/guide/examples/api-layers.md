# Couches API

Les intégrations RPC et GraphQL doivent créer un scope InferDI par requête HTTP, et non par procédure ou par résolveur.

Ces exemples utilisent le graphe partagé. Compare l’endroit où le scope est créé et la limite responsable de sa libération. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Exemple | Contenu |
|---|---|
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | Scope autour de toute la requête HTTP avec `fetchRequestHandler` de tRPC |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | Scope de contexte Apollo Server pour une exécution sans streaming |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | Scope de contexte GraphQL Yoga pour une exécution sans streaming |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Fichier du dépôt : [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Fichier du dépôt : [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Fichier du dépôt : [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)

