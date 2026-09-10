# Asynchrone Abhängigkeiten

`registerAsyncFactory` deklariert eine explizite asynchrone Kante. Der Graph speichert den fertigen Servicetyp, wartet auf deklarierte asynchrone Abhängigkeiten und propagiert den Async-Status durch abhängige Klassen.

## Das Promise-Modell wählen

InferDI unterstützt zwei Verträge: Ein Promise kann selbst der Service sein oder lediglich dessen Initialisierung darstellen.

| API | Wert im Graphen | Injektion | Auflösung |
|---|---|---|---|
| `registerFactory('dbPromise', () => connect())` | `Promise<Database>` | dasselbe Promise-Objekt | `get()` |
| `registerAsyncFactory('db', connect, [])` | `Database` in `AsyncSpec` | die fertige `Database` | `getAsync()` |

Nutze `registerAsyncFactory`, wenn nachgelagerte Services den fertigen Wert brauchen. Behalte ein Promise als `registerFactory`-Wert nur dann, wenn es selbst zum synchronen Graphen gehören soll.

Das bestimmt auch den Lazy-Begleiter: `registerFactory(..., lazyKey)` mit Promise-Wert ergibt `Lazy<Promise<T>>`, die deklarative Form `registerAsyncFactory(..., lazyKey)` dagegen `AsyncLazy<T>`.

## Asynchrone Factories registrieren

Dieser Graph initialisiert eine Datenbank für den Root und eine Sitzung je authentifiziertem Scope. Klassen werden asynchron, sobald eine deklarierte Abhängigkeit asynchron ist.

```ts
interface AuthContext {
  token: string
}

class Repository {
  constructor(readonly db: Database) {}
}

class Dashboard {
  constructor(
    readonly repository: Repository,
    readonly session: Session
  ) {}
}

const root = new Container()
  .registerValue('config', {dsn: 'postgres://localhost/app'})
  .declareScopeInputs<{auth: AuthContext}>()
  .registerAsyncFactory(
    'db',
    async (config: {dsn: string}) => connectDatabase(config.dsn),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.token),
    ['auth'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])
  .registerClass(
    'dashboard',
    Dashboard,
    ['repository', 'session'],
    'scoped'
  )

await using scope = root.createScope({auth})
const dashboard = await scope.getAsync('dashboard')

// @ts-expect-error: dashboard belongs to the async graph
scope.get('dashboard')
```

Der Compiler lehnt auch `root.getAsync('dashboard')` ab, weil dem Root die Eingabe `auth` fehlt. [Scope-Eingaben](./scope-inputs) erklärt den Aufbau von Profilen.

## Auflösung und Weitergabe

`getAsync()` akzeptiert bereite synchrone und asynchrone Schlüssel und liefert ein Promise. Synchrone Fehler bei Suche, Zyklen, Lebensdauern oder bereits freigegebenen Containern werden zu Promise-Ablehnungen.

InferDI startet deklarierte Abhängigkeiten in Tupelreihenfolge. Es wartet auf deklarativ asynchrone Einträge und ruft dann die Factory mit positionsgebundenen Werten auf. Unabhängige asynchrone Abhängigkeiten können gleichzeitig initialisiert werden.

```ts
const app = new Container()
  .registerAsyncFactory('db', openDatabase, [])
  .registerAsyncFactory('cache', openCache, [])
  .registerAsyncFactory(
    'service',
    (db: Database, cache: Cache) => new Service(db, cache),
    ['db', 'cache']
  )
```

Der Callback erhält Werte statt eines Containers. So bleiben asynchrone Kanten für TypeScript und die Laufzeitvorprüfung sichtbar.

Bei nichtleerem `deps` musst du die Callback-Parameter typisieren oder eine Funktion mit vorhandener Signatur übergeben. Das Tupel prüft Parametertypen und Reihenfolge, liefert aber keine kontextuelle Parameterinferenz.

## Ablauf und Caching

| Lebensdauer | Initialisierung | Verantwortung |
|---|---|---|
| `singleton` | ein natives Promise im besitzenden Container | besitzender Container |
| `scoped` | ein natives Promise je auflösendem Scope | auflösender Scope |
| `transient` | neue Initialisierung je Aufruf | Aufrufer |

Gleichzeitige Aufrufer teilen die Initialisierung von Singletons und scoped Services. Ein abgelehntes Promise bleibt als Fehlerzustand im Cache; InferDI versucht es nicht erneut. Öffne einen neuen Scope oder baue den Root neu auf, wenn der Anwendungslebenszyklus einen neuen Versuch vorsieht.

`has()` prüft die Registrierung, ohne eine Initialisierung zu starten. Es garantiert weder einen synchronen Schlüssel noch fehlende Scope-Eingaben.

## AsyncLazy-Begleiter

Ein fünftes Argument `lazyKey` verzögert den Zugriff auf ein deklarativ asynchrones Ziel:

```ts
const root = new Container()
  .registerAsyncFactory('db', openDatabase, [], undefined, 'dbLazy')

const dbLazy = root.get('dbLazy') // AsyncLazy<Database>
const first = dbLazy.get()
const second = dbLazy.get()

first === second // true for this singleton target
```

Der Wrapper wird synchron erstellt. Eine Klasse, die `AsyncLazy<T>` injiziert, übernimmt deshalb von dieser Abhängigkeit keinen Async-Status. Eine bereits asynchron propagierte Klasse mit eigenem `lazyKey` erzeugt `AsyncLazy<Class>`. Kann ein Abhängigkeitsschlüssel eine synchrone oder asynchrone Registrierung wählen, entsteht `Lazy<Class> | AsyncLazy<Class>`.

Der Wrapper hält den auflösenden Container fest. Scoped Ziele bleiben dadurch an diesen Scope gebunden. Transiente Ziele starten je Aufruf neu und bleiben beim Aufrufer.

## Freigabe und Fehler

Singleton- und scoped Registrierungen behalten ihr Promise auch nach erfolgreicher Initialisierung im Cache. Gib ihren Container asynchron frei, damit InferDI die Initialisierung abwarten und die fertige Ressource prüfen kann.

```ts
try {
  const db = await root.getAsync('db')
  await db.runMigrations()
} finally {
  await root.dispose()
}
```

`await using`, `dispose()` und `Symbol.asyncDispose` unterstützen eigene asynchrone Ressourcen. Synchrones `using` kann ein gecachtes Promise nicht entpacken und meldet diesen Fehlgebrauch.

Vor diesem synchronen Fehler registriert InferDI bei einem gecachten nativen Promise einen Ablehnungsbeobachter. Eine spätere Ablehnung löst dadurch kein `unhandledRejection` aus. Das Promise wird weder abgewartet noch wird ein benutzerdefiniertes Thenable assimiliert.

Fehlgeschlagene Singleton- oder scoped Initialisierungen bleiben gecacht, ohne automatische Wiederholung. Für einen neuen Versuch muss die Anwendung einen neuen Root oder Scope erstellen. Scheitert eine spätere Abhängigkeit in der Vorprüfung, behalten früher gestartete Initialisierungen ihren Cache- und Besitzstatus.

Ein Abhängigkeitsfehler kann mehrere gecachte Initialisierungs-Promises ablehnen. Die asynchrone Freigabe meldet dasselbe `Error`-Objekt nur einmal. Verschiedene Fehlerobjekte bleiben separate Ursachen im `AggregateError`, auch bei gleichem Nachrichtentext.

## Bestehende Promise-Werte

Ein von `registerFactory` zurückgegebenes Promise bleibt ein synchroner Servicewert. Deklarative asynchrone Factories erhalten genau dieses Promise-Objekt, weil ihm der `AsyncSpec`-Marker fehlt.

```ts
const legacy = new Container()
  .registerFactory('dbPromise', () => connectDatabase())
  .registerAsyncFactory(
    'monitor',
    (dbPromise: Promise<Database>) => new Monitor(dbPromise),
    ['dbPromise']
  )

const promise = legacy.get('dbPromise')
const monitor = await legacy.getAsync('monitor')
```

Auf oberster Ebene folgt `getAsync('dbPromise')` der JavaScript-`await`-Semantik und liefert die fertige `Database`.

## Dynamische Grenzen

- Verwende readonly Abhängigkeitstupel für `registerAsyncFactory` und für `registerClass`, wenn das Tupel einen asynchronen Schlüssel wählen kann. InferDI klassifiziert die asynchronen Positionen einmal und behält die Tupelreferenz. Inline-Literale werden als readonly Tupel abgeleitet.
- Deklarative Zyklen und Lebensdauerverletzungen bei kalter Auflösung scheitern während der synchronen Vorprüfung. Zugriffe über erfasste Container nach einer Promise-Grenze erzeugen dynamische Kanten außerhalb dieser Analyse.
- `AsyncLazy<T>` verzögert die Auflösung, ergänzt aber keine Wiederholungen, Abbrüche oder Rollbacks.
- Ein bereits gestarteter asynchroner transienter Service kann ohne Freigabezugriff weiterlaufen, wenn eine spätere Abhängigkeit in der Vorprüfung scheitert.
- Ein dynamischer Zyklus über `AsyncLazy.get()` nach einer Promise-Grenze kann auf das eigene gecachte ausstehende Promise warten. Die synchrone Zykluserkennung erkennt diesen Deadlock nicht.

[Factories](./factories) behandelt synchrone Konstruktion, [Scopes und Freigabe](./scopes) die Ressourcenverantwortung.

## Compilerprüfung

Eine deklarative asynchrone Registrierung ist für `.get()` ausgeschlossen und bleibt über `.getAsync()` verfügbar:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Database {
  query() {}
}

const container = new Container()
  .registerAsyncFactory('database', async () => new Database(), [])

container.get('database') // [!code error]

const database = await container.getAsync('database')
//    ^?
```

