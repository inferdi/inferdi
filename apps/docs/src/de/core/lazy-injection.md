# Verzögerte Auflösung mit Lazy Injection

`Lazy<T>` und `AsyncLazy<T>` verschieben die Auflösung bis zum Aufruf von `.get()`. Der Registrierungsmodus des Ziels bestimmt den Rückgabetyp.

| Ziel | Begleiter |
|---|---|
| Synchrone Registrierung | `Lazy<T>` mit `get(): T` |
| Deklarative asynchrone Registrierung | `AsyncLazy<T>` mit `get(): Promise<T>` |
| Klasse mit Sync-/Async-Union als Abhängigkeit | `Lazy<T> \| AsyncLazy<T>` |

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

Ein `lazyKey` bei `registerClass` oder `registerFactory` erzeugt eine Begleitregistrierung, deren Wert einen verzögerten Zugriff der Form `{ get: () => target }` bereitstellt.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` nimmt den Begleitschlüssel als fünftes Argument entgegen:

```ts
import { type AsyncLazy } from '@inferdi/inferdi'

const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
const db = await dbLazy.get()
```

Die Auflösung oder Injektion von `dbLazy` ruft `connectDatabase` noch nicht auf. Erst `.get()` startet das Ziel. Singleton- und scoped Ziele liefern ihr gecachtes natives Promise, einschließlich einer gespeicherten Ablehnung. Transiente Ziele starten bei jedem Aufruf neu und bleiben beim Aufrufer.

Ein Promise als Wert von `registerFactory` gehört weiterhin zum synchronen Graphen und ergibt `Lazy<Promise<T>>`. Nur deklarative asynchrone Ziele ergeben `AsyncLazy<T>`.

## Die Lebensdauer bleibt erhalten

Lazy-Begleiter behalten die Lebensdauer des Ziels. Ein Singleton darf nur `Lazy`- oder `AsyncLazy`-Begleiter für Singleton-Ziele injizieren. TypeScript weist auch Unions mit möglicherweise kürzerer Ziellebensdauer sowie Mischungen aus verwalteten und unverwalteten Begleitern zurück.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Scoped und transiente Verbraucher dürfen Lazy-Begleiter beliebiger Lebensdauer verwenden, da sie nicht global gecacht werden.

## Erfasster Scope und Freigabe

Der Wrapper hält den Container fest, der ihn aufgelöst hat. Ein Wrapper aus einem Kind-Scope verwendet diesen weiter, auch wenn später ein anderes Kind entsteht. Nach Freigabe des erfassten Scopes liefert `AsyncLazy.get()` ein abgelehntes Promise.

Der besitzende Container gibt bereits aufgelöste Singleton- und scoped Ziele frei. Vor dem ersten `.get()` existiert kein Ziel zur Freigabe. Die Freigabe wartet auf bereits gestartete Singleton- oder scoped Initialisierungen. Transiente Ergebnisse bleiben beim Aufrufer.

## Zirkuläre Abhängigkeiten

InferDI erkennt synchrone Zyklen, einschließlich deklarativer asynchroner Kanten während der Vorprüfung. `Lazy<singleton>` kann eine synchrone Singleton-Kante verzögern. `AsyncLazy` kann eine Kante hinter die Promise-Grenze verschieben, wo die synchrone Zykluserkennung sie nicht mehr verfolgt. Erreicht eine Initialisierung über `AsyncLazy.get()` ihr eigenes ausstehendes Promise, warten beide Seiten unbegrenzt. Trenne gemeinsame Initialisierung ab, ziehe sie vor oder entferne den Zyklus. Siehe [Asynchrone Abhängigkeiten](./async-dependencies).
