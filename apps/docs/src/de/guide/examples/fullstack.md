# Fullstack-Frameworks

Fullstack-Beispiele nutzen Scopes für Loader, Actions, Route-Handler und Server Actions. Entwicklungsbuilds cachen den Root auf `globalThis`, damit HMR keine doppelten Clients erzeugt.

Beide Beispiele verwenden denselben Graphen. Vergleiche, bis zu welcher Operationsgrenze das jeweilige Framework wartet. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Beispiel | Inhalt |
|---|---|
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Scope-Grenzen für Requests und Server Actions im Next.js App Router |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Scope-Grenzen für Loader und Actions in Remix |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

Datei im Repository: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

Datei im Repository: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)

