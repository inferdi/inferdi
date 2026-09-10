# InferDI installieren

InferDI wird auf npm und JSR unter denselben Paketnamen und mit identischen Versionen veröffentlicht. Für Node und Bun eignet sich die npm-Installation; für Deno und Laufzeitumgebungen, die TypeScript-Quellcode bevorzugen, steht JSR bereit.

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

Ein direkter Import ist ebenfalls möglich:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Voraussetzungen

| Umgebung | Mindestversion |
|---|---|
| Node.js | 16 für das Kernpaket |
| Bun | 1.0 |
| Deno | 1.40 |
| TypeScript | 5.2 |

Auf Node-Versionen ohne native Unterstützung für `Symbol.dispose` und `Symbol.asyncDispose` ergänzt InferDI beim Import die Symbole per Polyfill. Damit bleibt die Zusammenarbeit mit Explicit Resource Management möglich.

Die veröffentlichten Typdeklarationen referenzieren die Bibliothek für Explicit Resource Management selbst. Anwendungen mit ES2022 als Ziel müssen `ESNext.Disposable` daher nicht zusätzlich in ihre TypeScript-`lib`-Konfiguration aufnehmen.

## Adapter installieren

Installiere das Kernpaket, den Adapter und das Framework als Peer-Abhängigkeit:

```bash
pnpm add @inferdi/inferdi @inferdi/react react
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

Jeder Adapter hat eine eigene Seite mit Lebenszyklusregeln und Hinweisen zur Typkonfiguration.
