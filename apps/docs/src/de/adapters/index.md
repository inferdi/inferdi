# Framework-Adapter

InferDI-Adapter verbinden exakte Containertypen mit Framework-Lebenszyklen. HTTP-Adapter erstellen einen Request-Scope und stellen ihn am frameworküblichen Ort bereit. Der React-Adapter liefert typisierte Kontexte und kann einen clientseitig erstellten Kind-Scope verwalten.

Die Adapter verwalten den Lebenszyklus von Request-Scopes. Das Kernpaket bleibt ohne Abhängigkeiten und ergänzt weder Dekoratoren noch Controller-Suche, Handler-Parameterinjektion oder automatische Routenerkennung.

## Pakete

| Paket                                                                             | Framework  | Scope-Zugriff | Nur Root |
|-------------------------------------------------------------------------------------|------------|----------------|----------------|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | Fastify v5 | `request.di`   | ja            |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)       | Hono v4    | `c.var.di`     | nein             |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)         | Koa v3     | `ctx.state.di` | nein             |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | Express 5  | `req.di`       | nein             |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)   | Elysia v1  | `context.di`   | ja            |
| [`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react)     | React 19   | React-Kontext  | externer `Provider` |

React verwendet den Komponentenlebenszyklus. Ein externer `Provider` gibt seinen Container nie frei; ein verwalteter `ScopeProvider` erstellt den Kind-Scope nach dem Commit und gibt ihn immer frei. Siehe [React-Adapter](./react).

## Gemeinsamer Lebenszyklusvertrag

Im Scope-Modus durchlaufen HTTP-Anfragen dieselben Schritte:

1. **Erstellen:** Bei Anfragebeginn einen Scope vom Root ableiten (`createScope`, standardmäßig `root.createScope()`).
2. **Bereitstellen:** Hono, Koa, Express und Elysia stellen den Scope vor dem Setup am nativen Ort bereit. Fastify veröffentlicht `request.di` nach erfolgreichem Setup; bei Setup-Fehlern erscheint der Scope nur vorübergehend für die Freigabehooks. Fehlerhandler erhalten dort keinen halb aufgebauten Scope.
3. **Einrichten:** Optionales, auch asynchrones `setupScope` führt zusätzliche Initialisierung vor den Handlern aus.
4. **Verarbeiten:** Routen- und Fehlerhandler lösen Services aus dem Scope auf.
5. **Freigeben:** Am sicheren Abschluss des Framework-Lebenszyklus wird `disposeScope` ausgeführt, standardmäßig `scope.dispose()`, sofern die Verantwortung nicht übertragen wurde.

### Gemeinsame Optionen

| Option | Standard | Zweck |
|---|---|---|
| `container` | erforderlich | Root; keine automatische Freigabe außer Fastifys optionalem `disposeRootOnClose`. |
| `createScope` | `root.createScope()` | Scope erstellen und deklarierte Anfrageeingaben übergeben; darf asynchron sein. |
| `setupScope` | keiner | Zusätzliche Initialisierung vor Handlern; darf asynchron sein. |
| `disposeScope` | `scope.dispose()` | Eigene synchrone oder asynchrone Freigabe. |
| `autoDispose` | `true` | `false` oder ein Prädikat mit Ergebnis `false` überträgt die Freigabe an deinen Code. |
| `onDisposeError` | adapterspezifisch | Fastify: `request.log.error`; Koa: `ctx.app.emit('error')`; andere: `console.error`. |
| `skipInferdiDispose(...)` | — | Überträgt die Verantwortung für eine Anfrage, etwa bei Streaming oder Hintergrundarbeit. |

### Fehler und Ressourcenverantwortung

- **Bei Setup-Fehlern bleibt der ursprüngliche Fehler sichtbar.** Der halb aufgebaute Scope wird freigegeben. Ein zusätzlicher Freigabefehler geht an `onDisposeError` oder den Standardempfänger und wird nicht mit dem Setup-Fehler aggregiert.
- **Fehlgeschlagene Requests werden weiterhin freigegeben.** `skipInferdiDispose` unterdrückt nur die Freigabe erfolgreicher Antworten. Express ist die Ausnahme: Behandelte nachgelagerte Routenfehler sind für seine Callback-Middleware nicht erkennbar; der übersprungene Scope bleibt anwendungseigen.
- **`autoDispose: false` und `skipInferdiDispose` übertragen die Verantwortung.** Dein Code muss den Scope an der passenden Framework-Grenze freigeben. Auch Fehlerpfade respektieren `autoDispose: false`.
- **Freigabefehler nach Erzeugung einer Antwort werden gemeldet und abgefangen.** Die bereits gesendete Antwort kann durch einen späten Freigabefehler nicht beschädigt werden.

## Wesentliche Unterschiede

| Adapter | Unterschied |
|---|---|
| Fastify | Freigabe in `onResponse`, bei Abbruch in `onRequestAbort`; optionale Root-Freigabe durch `disposeRootOnClose`. |
| Hono | Freigabe nach `await next()`; Streaming-Helfer können früher zurückkehren, daher benötigen Streaming-Routen oft `skipInferdiDispose`. |
| Koa | Wartet auf `finish` oder `close` der Node-Antwort; normale Stream-Bodies brauchen keinen Skip. |
| Express | Erkennt behandelte nachgelagerte Routenfehler nicht; fehlgeschlagene übersprungene Requests bleiben anwendungseigen. |
| Elysia | Freigabe hängt von `onAfterResponse` ab. Ohne diesen Hook kann der Adapter Scope-Ressourcen nicht freigeben. |
