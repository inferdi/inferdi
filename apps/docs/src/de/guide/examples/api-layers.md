# API-Schichten

RPC- und GraphQL-Integrationen sollten einen InferDI-Scope pro HTTP-Anfrage erstellen, nicht pro Prozedur oder Resolver.

Diese Beispiele nutzen den gemeinsamen Graphen. Vergleiche, wo der Scope erstellt wird und welche Grenze für die Freigabe zuständig ist. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Beispiel | Inhalt |
|---|---|
| [`trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts) | tRPC `fetchRequestHandler` mit einem Scope für die gesamte HTTP-Anfrage |
| [`apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts) | Kontext-Scope in Apollo Server für Ausführung ohne Streaming |
| [`graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts) | Kontext-Scope in GraphQL Yoga für Ausführung ohne Streaming |

## tRPC

<<< ../../../../../../examples/api-layers/trpc.ts

Datei im Repository: [`examples/api-layers/trpc.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/trpc.ts)

## Apollo Server

<<< ../../../../../../examples/api-layers/apollo-server.ts

Datei im Repository: [`examples/api-layers/apollo-server.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/apollo-server.ts)

## GraphQL Yoga

<<< ../../../../../../examples/api-layers/graphql-yoga.ts

Datei im Repository: [`examples/api-layers/graphql-yoga.ts`](https://github.com/inferdi/inferdi/blob/main/examples/api-layers/graphql-yoga.ts)

