# Versionsmigration

InferDI dokumentiert inkompatible Änderungen nach Hauptversion. Maßgeblich bleibt [`packages/inferdi/MIGRATION.md`](https://github.com/inferdi/inferdi/blob/main/packages/inferdi/MIGRATION.md); diese Seite fasst den aktuellen Upgrade-Pfad zusammen.

## Migration auf 6.0

Diese Zusammenfassung geht von der stabilen Version `5.0.7` aus. Aktualisiere alle installierten `@inferdi/*`-Pakete auf `6.0.0`; die Adapter benötigen `@inferdi/inferdi@^6.0.0`.

- Ersetze `RegistrationKind` durch `Lifetime` und `Spec.kind` durch `Spec.lifetime`. Es gibt keine veralteten Aliase.
- Das stabile v5 hatte keine `registerFactory`-Überladung mit `deps`. V6 ergänzt `registerFactory(key, factory, deps, ...)`. Nur Nutzer der v6-Vorabversion mit `registerFactory(key, deps, factory, ...)` müssen Argumente umordnen. Ein synchroner Factory-Begleiter verlangt eine explizite Lebensdauer, auch `'singleton'`.
- Ersetze v5 `{strict: false}` durch `{fast: true}` und `{strict: true}` durch den Standard oder `{fast: false}`. Die Boolesche Bedeutung ist umgekehrt. Die Voraboption `mode` wurde entfernt.
- Benannte `Module<TRequirements, TProvides>` akzeptieren und erhalten zusätzliche Registrierungen, prüfen Anforderungen exakt und verbieten Ausgabekollisionen. `new Container(parent)` ist nicht mehr öffentlich; nutze `createScope()`.
- Registrierung verbietet jeden Schlüsseltyp, der einen vorhandenen Haupt- oder Lazy-Schlüssel überlappen könnte. Grenze breite oder Union-Schlüssel auf einen neuen Wert ein; für gezielten Ersatz nutze `.override()`.
- V6 ergänzt rein typseitige Scope-Eingaben mit `declareScopeInputs<Inputs>()` und `createScope(inputs)`. Scopes ohne Argumente behalten ihr v5-Verhalten.
- V6 ergänzt `registerAsyncFactory`, `AsyncSpec` und `getAsync()` für deklarative asynchrone Abhängigkeiten. Promise-Werte von `registerFactory` bleiben synchrone Grapheneinträge mit `get()`.
- Asynchrone Freigabe meldet dasselbe Ablehnungsobjekt einmal, wenn ein Abhängigkeitsfehler mehrere gecachte Promises betrifft. Synchrone Freigabe beobachtet native Promise-Ablehnungen vor dem Fehler über asynchronen Fehlgebrauch.

### Generische Resolver verwenden bereite Schlüssel

`.get()` akzeptiert jetzt bereite synchrone Schlüssel mit erfüllten Scope-Anforderungen. Konkrete Container ohne Scope-Eingaben behalten dieselbe synchrone Schlüsselmenge. Generische Helfer mit `K extends keyof T` müssen Bereitschaft und Async-Status erhalten.

```ts
// Before
function resolve<T extends DependenciesMap, K extends keyof T>(
  container: Container<T>,
  key: K
) {
  return container.get(key)
}

// After
function resolve<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}
```

Nutze `Container.ReadyKeys<Container<T>>` in generischen Helfern für `getAsync()`. Ein generisches `T extends DependenciesMap` kann deklarative asynchrone Einträge oder durch fehlende Scope-Eingaben blockierte Services enthalten.

### Benannte Specs für Lazy-Begleiter

`LazySpec` trägt nun eine private rein typseitige Modusmarke; v6 ergänzt `AsyncLazySpec`. Explizite `Container`- und `Module`-Typen müssen diese Exporte nutzen, statt `{type, lifetime, lazyOf}` nachzubauen. Die Marke besitzt kein Laufzeitfeld.

`registerAsyncFactory` akzeptiert ein fünftes `lazyKey` und erzeugt `AsyncLazy<T>`. Asynchron propagierte Klassen nutzen denselben Wrapper; gemischte Klassen liefern `Lazy<T> | AsyncLazy<T>`. Begleiter Promise-wertiger `registerFactory` bleiben `Lazy<Promise<T>>`. `Container.ResolveUnwrapped` entpackt verwaltete synchrone, asynchrone und gemischte Begleiter distributiv.

[API-Übersicht](./api), [Scope-Eingaben](../core/scope-inputs) und [Asynchrone Abhängigkeiten](../core/async-dependencies) beschreiben die neuen Schlüsselmengen.

## Migration auf 5.0

Die erste v5-Veröffentlichung betraf nur Adapter. Der Versionssprung hält alle Pakete synchron und vereinheitlicht ihren Freigabevertrag. Spätere v5-Builds verschärften auch die Verantwortung von Kind-Scopes und den unten beschriebenen `{fast: true}`-Vertrag.

Die Adapter teilen nun diese Regeln:

- Gemeinsame Begriffe: `createScope`, `setupScope`, `disposeScope`, `autoDispose`, `onDisposeError`.
- Gemeinsame Exporte: `MaybePromise`, `InferdiScope`, `InferdiRoot`, `InferdiScopeOf`.
- Scheitert `setupScope`, bleibt nur der ursprüngliche Setup-Fehler sichtbar.
- Freigabefehler während eines Setup-Abbruchs gehen an `onDisposeError` oder den Adapterempfänger.
- Fehlgeschlagene Requests geben trotz `skipInferdiDispose` frei, mit der dokumentierten Express-Ausnahme.
- Freigabehooks sehen während ihrer Ausführung den öffentlichen Scope-Zugriff.

### Scoped Auflösung benötigt einen Kind-Scope

Bei standardmäßigem `{fast: false}` wirft scoped Auflösung aus dem Root nun `Scoped "key" cannot be resolved from the root container. Use createScope().` Erstelle mit `const scope = root.createScope()` ein Kind, rufe `scope.get(scopedKey)` auf und gib es an seiner Lebenszyklusgrenze frei. `{fast: true}` überspringt diese Laufzeitprüfung. Anwendungscode muss scoped Schlüssel dennoch aus Kind-Scopes auflösen.

### Fester Graph mit `fast: true`

`new Container({fast: true})` liest aus Scopes direkt die unveränderbare Root-Registrierung, vermeidet Elternketten und spiegelt delegierte Singletons im Scope-Cache. Standard-Scopes durchlaufen bei jedem lokalen Cachemiss ihre exakte Elternkette, statt Suchergebnisse zu speichern. Änderungen bleiben ohne Invalidierungsbuchführung oder zusätzliche Suchmetadaten sichtbar. Beide Modi deduplizieren eigene Instanzen bei der Freigabe. Registriere jeden Laufzeitschlüssel einmal in einer linearen Kette, beende den Aufbau vor der ersten Auflösung oder Scope-Erstellung, halte den aktivierten Baum unveränderbar und gib Kinder vor Vorfahren frei. Für Hot Reload oder veränderbare Bäume nutze `{fast: false}`.

### Adapterhinweise

| Paket | Migrationshinweise |
|---|---|
| [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify) | `logDisposeError` wird `onDisposeError`; `InferdiScope.dispose()` darf `void` oder `Promise<void>` liefern. Neu: `disposeScope`, `autoDispose`, `skipInferdiDispose`, `InferdiScopeOf`. |
| [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono) | Freigabefehler nach `next()` werden protokolliert oder an `onDisposeError` gesendet; sie ersetzen keine erfolgreiche Antwort mehr. Setup-Freigabe wirft kein `AggregateError` mehr. |
| [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express) | `onDisposeError` empfängt einzelne Fehler bei Setup-Freigabe und Antwortabschluss. Ein übersprungener Scope kann bei behandeltem Routenfehler nicht zwangsweise freigegeben werden. |
| [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa) | Setup-Freigabe zeigt nur den Setup-Fehler. Ein nachgelagerter Fehler gibt auch nach `skipInferdiDispose(ctx)` frei. |
| [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) | Setup-Freigabe zeigt nur den Setup-Fehler. Freigabefehler gehen an `onDisposeError` oder `console.error`. |

## Migration auf 4.0

V4 präzisiert die Lebensdauer von `Lazy<T>`. Ein verwalteter Begleiter behält die Ziellebensdauer; ein Singleton darf nur `Lazy<singleton>` injizieren.

Die wichtigsten Änderungen:

- `AllowedDeps<T, 'singleton'>` akzeptiert kein beliebiges `Lazy<V>` mehr.
- `LazySpec<V, TargetKind>` wird öffentlich für explizite Container- und Modultypen.
- Die Lazy-Ausnahme zur Laufzeit gilt nur für Zielart `singleton`.
- Ein Singleton mit `Lazy<scoped>` oder `Lazy<transient>` muss die Lebensdauer des Ziels oder des Verbrauchers ändern.

Typische Anpassungen:

```ts
// v3
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'singleton')

// v4: make the consumer scoped
.registerClass('req', RequestContext, [], 'scoped', 'reqLazy')
.registerClass('app', AppService, ['reqLazy'], 'scoped')
```

```ts
// v3
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: Spec<Lazy<Clock>, 'transient'>
}

// v4
type Deps = SpecMap<{ clock: Clock }> & {
  clockLazy: LazySpec<Clock, 'singleton'>
}
```

## Migration auf 3.0

V3 verlagert Lebensdauersicherheit ins Typsystem. Das Laufzeitverhalten bleibt kompatibel; Standardprüfungen dienen weiter als zusätzliche Absicherung.

Die wichtigsten Änderungen:

- `DependenciesMap` verwendet `Spec<V, Kind>` statt bloßer Servicetypen.
- `RegistrationKind`, `Spec<V, K>` und `SpecMap<M, K>` werden öffentlich exportiert.
- `registerFactory` beschränkt `c` bei Singleton-Factories.
- `registerClass` filtert `deps` für Singleton-Registrierungen.
- `override(key, value)` erhält die ursprüngliche Lebensdauer.
- `new Container({fast: true})` kann nach Graphenprüfung Laufzeitprüfungen für Zyklen und Lebensdauern deaktivieren.

Typische Anpassungen:

```ts
// v2
const c = new Container() as Container<{ a: A; b: B }>

// v3
const c = new Container() as Container<SpecMap<{ a: A; b: B }>>
```

```ts
// v2
const mod: Module<{ cfg: Config }, { db: Db }> = (c) => ...

// v3
const mod: Module<
  SpecMap<{ cfg: Config }>,
  SpecMap<{ db: Db }>
> = (c) => ...
```

## Migration auf 2.0

V2 enthält zwei mechanisch umsetzbare inkompatible Änderungen.

### `container.cradle` wurde entfernt

Nutze `.get(key)`:

```ts
// 1.x
const { db, logger } = container.cradle

// 2.x
const db = container.get('db')
const logger = container.get('logger')
```

### `registerClass(..., lazy: true)` wurde zu `lazyKey`

Übergib den Begleitschlüssel:

```ts
// 1.x
.registerClass('clock', Clock, [], 'transient', true)

// 2.x
.registerClass('clock', Clock, [], 'transient', 'clockLazy')
```

V2 ergänzte außerdem String- und Symbolschlüssel bei allen Registrierungsmethoden und verbesserte Diagnosen für freigegebene Vorfahren.

## Einheitliche Versionen

Alle veröffentlichten InferDI-Pakete tragen dieselbe Version:

- [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi)
- [`@inferdi/fastify`](https://github.com/inferdi/inferdi/tree/main/packages/fastify)
- [`@inferdi/hono`](https://github.com/inferdi/inferdi/tree/main/packages/hono)
- [`@inferdi/koa`](https://github.com/inferdi/inferdi/tree/main/packages/koa)
- [`@inferdi/express`](https://github.com/inferdi/inferdi/tree/main/packages/express)
- [`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia)
- [`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react)

Halte beim Upgrade Adapter und [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) auf derselben Hauptversion.

## Upgrade-Checkliste

1. Lies die Hinweise zu jeder übersprungenen Hauptversion.
2. Aktualisiere [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi) und alle installierten Adapter gemeinsam.
3. Führe Typtests oder `tsc --noEmit` aus, um Graphenänderungen zu erkennen.
4. Führe Laufzeittests im geprüften Standardmodus aus.
5. Prüfe die Scope-Verantwortung bei `skipInferdiDispose`, `autoDispose: false` oder eigenem `disposeScope`.

## Stabile Grenzen

Der Kern bleibt dekoratorfrei und ohne Abhängigkeiten. Framework-Lebenszyklen gehören in Adapterpakete, nicht in [`@inferdi/inferdi`](https://github.com/inferdi/inferdi/tree/main/packages/inferdi).
