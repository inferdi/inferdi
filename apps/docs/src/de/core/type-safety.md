# Typsicherheit

InferDI bildet den deklarierten Abhängigkeitsgraphen im Containertyp ab. Jede Registrierung ergänzt Schlüssel, Servicetyp, Lebensdauer, Sync-/Async-Status und mögliche Scope-Anforderungen. Spätere Aufrufe werden gegen diesen angesammelten Zustand geprüft.

## Konstruktorsignaturen

`registerClass` prüft Abhängigkeitsschlüssel positionsweise anhand der strukturellen Zuweisbarkeit zu den Konstruktorparametern.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly database: Database
  ) {}
}

const container = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['logger', 'database'])

const users = container.get('users')
//    ^?
```

Die beiden Abhängigkeiten haben unterschiedliche öffentliche Strukturen. Ihr Vertauschen führt deshalb zum gezeigten Fehler:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class Database {
  findUser(id: string) {
    return { id }
  }
}

class UserRepo {
  constructor(logger: Logger, database: Database) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('database', Database, [])
  .registerClass('users', UserRepo, ['database', 'logger']) // [!code error]
```

TypeScript typisiert strukturell. Zwei leere Klassen oder Klassen mit identischen öffentlichen Mitgliedern sind einander zuweisbar; ihre semantische Reihenfolge lässt sich dadurch nicht prüfen. Gib Verträgen unterschiedliche Strukturen. Müssen gleich aufgebaute Werte trotzdem verschieden bleiben, verwende Marken wie unter [Symbolschlüssel](./symbol-keys#same-value-shape) beschrieben.

## Eindeutige Schlüssel

Jede Registrierung liefert einen Container mit erweitertem Graphentyp. Ein bereits vorhandener Schlüssel darf nicht erneut registriert werden:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerValue('dsn', 'sqlite://memory') // [!code error]
```

Nutze `.override()`, wenn ein Test absichtlich einen Service ersetzt. Behalte nach jeder Registrierung den zurückgegebenen Container; ältere Referenzen kennen spätere Registrierungen nicht. [Typische Fehler](./bad-practices#stale-builder-references) zeigt die Folgen.

Die Prüfung berücksichtigt jeden möglichen Wert eines Schlüsseltyps. Nach `'dsn'` wird `'dsn' | 'replica'` abgelehnt, weil der Laufzeitwert `'dsn'` überschreiben könnte. Breite `string`- und `symbol`-Schlüssel bleiben erlaubt, sofern sie den bekannten Graphen nicht überlappen; sie verringern allerdings seine Typpräzision.

## Dynamische Schlüssel {#dynamic-keys}

Literale Schlüssel prüft `.get()` direkt. Grenze einen zur Laufzeit erhaltenen Schlüssel zunächst mit `.has()` ein:

```ts twoslash
import { Container } from '@inferdi/inferdi'

const container = new Container()
  .registerValue('answer', 42)
  .registerAsyncFactory('name', async () => 'InferDI', [])

declare const key: string | symbol

if (container.has(key)) {
  await container.getAsync(key)
}
```

`.has()` bestätigt eine Registrierung. Es garantiert weder fehlende Scope-Eingaben noch, dass ein asynchroner Schlüssel mit synchronem `.get()` auflösbar ist.

## Lebensdauer im Typ

Jeder Eintrag hält seine Lebensdauer fest. Ein Singleton darf keine scoped oder transiente Abhängigkeit festhalten:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

Der Standardmodus prüft Zyklen und Lebensdauern zusätzlich zur Laufzeit, um Casts, dynamische Schlüssel und erfasste Container abzusichern, die TypeScript nicht untersuchen kann. `{ fast: true }` ist ein separater Vertrag für feste Graphen mit weniger Laufzeitprüfungen.

## Bereitschaft und Async-Status

Scope-Eingaben und deklarative asynchrone Abhängigkeiten bestimmen ebenfalls, welche Schlüssel bereit sind und ob sie `.get()` oder `.getAsync()` benötigen:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Database {
  query() {}
}

class Handler {
  constructor(request: RequestContext, database: Database) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerAsyncFactory('database', async () => new Database(), [])
  .registerClass('handler', Handler, ['request', 'database'], 'scoped')

root.getAsync('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler') // [!code error]

const handler = await scope.getAsync('handler')
//    ^?
```

Dem Root fehlt `request`. Auch nach Bereitstellung bleibt `handler` asynchron, weil er von `database` abhängt. Mehr unter [Scope-Eingaben](./scope-inputs) und [Asynchrone Abhängigkeiten](./async-dependencies).

