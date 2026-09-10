# Typische Fehler

Verwende stets die Referenz, die der letzte `register*`-Aufruf zurückgegeben hat. Eine ältere Referenz trägt einen älteren Graphentyp, obwohl sie auf denselben Laufzeitcontainer zeigt.

## Eine alte Builder-Referenz wiederverwenden {#stale-builder-references}

Jede `register*`-Methode verändert den Container und liefert dasselbe Objekt mit einem erweiterten generischen Typ zurück. TypeScript erweitert den Rückgabewert, nicht die Typen zuvor erstellter Referenzen.

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// Compiles because base still has the type Container<{}>.
base.registerAsyncFactory('dependency', async () => 2, [])

// Typed as number, but the new registration supplies Promise<number>.
syncGraph.get('consumer').dependency
```

`base` und `syncGraph` zeigen auf dasselbe Objekt. Die letzte Registrierung überschreibt zur Laufzeit `dependency`, während der Typ von `syncGraph` weiterhin den ursprünglichen synchronen Graphen beschreibt. Bereits registrierte Klassen behalten ihre frühere Abhängigkeitsklassifikation.

## Warum der Compiler das erlaubt

Die Prüfung doppelter Schlüssel verwendet den Graphentyp der aufrufenden Referenz. `syncGraph` enthält `dependency`, daher wäre eine erneute Registrierung darüber ein Typfehler. `base` bleibt dagegen `Container<{}>`, bei dem `keyof T` gleich `never` ist.

TypeScript aktualisiert generische Argumente nicht über Aliase eines veränderbaren Objekts hinweg. Es kennt auch keine linearen oder affinen Typen, die `base` nach einer Registrierung als verbraucht markieren könnten. InferDI prüft veraltete Aliase nicht bei jeder Registrierung per Laufzeitsuche, weil dies auch gültige Graphenaufbauten verteuern würde.

## Die zuletzt zurückgegebene Referenz behalten

Baue den Graphen in einer Kette auf und verwende ihr Ergebnis:

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

Ignoriere den Rückgabewert von `register*` nicht, um anschließend mit einer älteren Referenz weiterzuarbeiten. Auch ein Modul muss den Container seiner letzten Registrierung zurückgeben. Siehe [Module](./modules).

## `register*` nicht zum Ersetzen verwenden

Wähle jede Produktionsregistrierung genau einmal beim Aufbau des Graphen. Wenn die Konfiguration zwischen Implementierungen auswählt, nutze normalen Kontrollfluss oder `.use()`.

Tests können vor der Auflösung `.override()` einsetzen, sofern Lebensdauer, Lazy-Modus und Async-Modus erhalten bleiben. `.override()` kann eine synchrone Registrierung nicht deklarativ asynchron machen. Siehe [Tests und Overrides](./testing).

## Service Locator in der Geschäftslogik

Ein Container als Argument eines fachlichen Services verbirgt dessen wirkliche Abhängigkeiten und verschiebt Fehler durch fehlende Schlüssel an die Aufrufstelle. Übergib stattdessen den benötigten Service:

```ts
class UserController {
  constructor(
    private readonly container: AppContainer // [!code --]
    private readonly users: UserRepo // [!code ++]
  ) {}

  show(id: string) {
    return this.container.get('users').find(id) // [!code --]
    return this.users.find(id) // [!code ++]
  }
}
```

Factories mit Resolverzugriff gehören in den Composition Root, wenn der Kompositionscode sie tatsächlich braucht.

## Globaler Request-Scope

Ein veränderbarer globaler Scope kann Werte einer Anfrage in eine gleichzeitig laufende andere Anfrage übertragen. Erstelle und schließe Scopes innerhalb der Request-Grenze:

```ts
let currentScope = root.createScope({ request }) // [!code warning]

async function handle(request: Request) {
  const scope = root.createScope({ request }) // [!code focus]
  try {
    return await scope.getAsync('handler')
  } finally {
    await scope.dispose()
  }
}
```

Framework-Adapter automatisieren diese Grenze unter denselben Verantwortungsregeln.

## Den konkreten Containertyp verlieren

Eine Annotation wie `Container` verwirft den aufgebauten Graphenzustand. Lass den Rückgabetyp des Builders ableiten und bilde daraus Typaliase:

```ts
const buildContainer = (): Container => new Container() // [!code --]
const buildContainer = () => new Container() // [!code ++]
  .registerClass('users', UserRepo, [])

type AppContainer = ReturnType<typeof buildContainer>
```

Nutze `ReturnType` für anwendungseigene Container- und Scope-Aliase, statt ihre generischen Argumente nachzubauen.

## Ressourcenverantwortung verlieren

Ein Scope ohne passenden Freigabepfad hinterlässt eigene scoped Instanzen. Platziere die Freigabe an derselben Lebenszyklusgrenze wie die Erstellung:

```ts
const scope = root.createScope({ request }) // [!code warning]
return scope.get('handler').run()

await using ownedScope = root.createScope({ request }) // [!code focus]
return ownedScope.get('handler').run()
```

Ist `await using` nicht verfügbar, verwende `try/finally` mit `await scope.dispose()`. Werte, Overrides, Scope-Eingaben und transiente Ergebnisse bleiben beim Aufrufer und brauchen eine eigene Freigabestrategie.

