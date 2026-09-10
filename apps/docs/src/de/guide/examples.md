# Beispiele

Wähle die Lebenszyklusgrenze deiner Anwendung und vergleiche, wie das jeweilige Ökosystem Scopes erstellt, bereitstellt und freigibt. Jede Gruppe entspricht einem Verzeichnis unter [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples).

## Einstieg

Lies zuerst [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Die meisten Serverbeispiele verwenden diesen Builder, damit die Framework-Anbindung im Mittelpunkt steht.

| Gruppe | Vergleichsschwerpunkt |
|---|---|
| [JavaScript](/de/guide/examples/javascript) | Node ESM, CommonJS und Browser-Bundler |
| [Backend-Frameworks](/de/guide/examples/backend) | Request-Scope-Adapter für Fastify, Hono, Koa, Express und Elysia |
| [API-Schichten](/de/guide/examples/api-layers) | Request-Scope-Grenzen bei tRPC, Apollo Server und GraphQL Yoga |
| [Fullstack-Frameworks](/de/guide/examples/fullstack) | Next.js App Router sowie Loader und Actions in Remix |
| [Laufzeit- und Edge-Plattformen](/de/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy und Supabase Edge |
| [Frontend-Frameworks](/de/guide/examples/frontend) | Feature-Scopes in React, React Native, Vue und Svelte |
| [Bots, Queues und CLI](/de/guide/examples/workers-cli) | Operations-Scopes in Telegraf, Grammy, BullMQ, Commander und Yargs |

## Die Gruppen vergleichen

`examples/_shared/container.ts` enthält den Anwendungsgraphen der Serverbeispiele. Die Gruppenseiten zeigen, wo ein Scope entsteht, wo er verfügbar wird und wer ihn freigibt.

Vergleiche bei Servern und Workern die Lebenszyklushooks der Plattform. Im Frontend sind das Einhängen und Entfernen von Komponenten entscheidend.

::: info Referenzbeispiele
`pnpm run examples:typecheck` prüft `examples/_shared/container.ts` und `examples/_shared/testing.ts`. Nicht jedes Framework-Beispiel wird typgeprüft, da der Root-Workspace nicht alle Framework-Abhängigkeiten installiert. Übernimm das passende Muster in deine Anwendung, installiere dessen Abhängigkeiten und passe den gemeinsamen Graphen an deine Typen an.
:::

