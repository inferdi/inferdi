# Tests und Overrides

## Services direkt testen

Fachliche Services erhalten gewöhnliche Werte. Ihre Unit-Tests benötigen daher keinen Container:

```ts
type Logger = { info(message: string): void }
type Database = { findUser(id: string): { id: string } | undefined }

class UserRepo {
  constructor(readonly logger: Logger, readonly db: Database) {}

  find(id: string) {
    this.logger.info(`find ${id}`)
    return this.db.findUser(id)
  }
}

const messages: string[] = []
const repo = new UserRepo(
  { info: (message) => messages.push(message) },
  { findUser: (id) => ({ id }) }
)

expect(repo.find('42')).toEqual({ id: '42' })
expect(messages).toEqual(['find 42'])
```

Verwende einen Container im Integrationstest, wenn der Anwendungsgraph selbst geprüft werden soll.

## Den zusammengesetzten Graphen testen

Mit `.override()` ersetzen Tests eine vorhandene Registrierung durch einen Mock.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

Der Ersatzwert muss dem ursprünglichen Servicetyp zuweisbar sein. Fehlende Schlüssel und inkompatible Mocks sind TypeScript-Fehler.

## Typisierte Provider

`Container.Providers<C>` bildet den Typ eines fertigen Containers auf parameterlose Provider-Funktionen ab. Das hilft Test-Utilities, Mocks zu erzeugen, ohne den Produktionsgraphen aufzulösen.

```ts
type TestProviders = Container.Providers<ReturnType<typeof buildContainer>>

const providers: TestProviders = {
  logger: () => mockLogger,
  db: () => mockDb,
  users: () => mockUsers
}
```

Der Helfertyp erhält alle registrierten Servicetypen, einschließlich verwalteter Lazy-Begleiter. Reine `declareScopeInputs()`-Schlüssel sind ausgeschlossen, weil `createScope(inputs)` sie bereitstellt. Der Typ registriert keine Provider und überträgt keine Ressourcenverantwortung; der Test entscheidet über Anwendung und Freigabe.

## Zeitpunkt von Overrides

Wende Overrides vor der Auflösung des Graphen an:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Die zweite Zeile wirft einen Fehler, weil der Singleton bereits im lokalen Cache liegt. Diese absichtlich cachebasierte Prüfung erfasst auch lokal gecachte scoped Werte, `registerValue` und wiederholte Overrides. Bei `fast: false` werden transiente Auflösungen und über ein Kind aufgelöste Werte eines Vorfahren nicht lokal gecacht und daher nicht erfasst. Fast-Scopes können delegierte Singletons lokal spiegeln und erlauben nach Aktivierung keine Änderungen. Ein bereits zurückgegebenes transientes Objekt bleibt beim Aufrufer, während spätere Auflösungen den Mock liefern. Diese Grenze ist keine Empfehlung für späte Overrides: Ersetze alle Werte vor der Auflösung, um gemischte Graphen zu vermeiden.

## Ressourcenverantwortung

Override-Werte gehören dem Aufrufer. Wie `registerValue` kommen sie nicht in die Freigabewarteschlange des Containers. Das Test-Fixture muss sie selbst freigeben.

## Lokale Wirkung im Scope

Ein Override verändert nur den Container, auf dem es aufgerufen wird:

```ts
const scope = root.createScope().override('db', mockDb)
```

Root und Geschwister-Scopes bleiben unverändert. Overrides eines Elterncontainers werden über die normale Elternsuche sichtbar.

