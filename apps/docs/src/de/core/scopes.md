# Scopes und Freigabe

Ein Scope begrenzt die Lebensdauer anfragelokaler Services auf eine Arbeitseinheit. Ein Kind-Scope erbt alle Registrierungen seiner Eltern, hält aber eigene scoped Instanzen im Cache und verantwortet deren Freigabe. Damit bleibt anfragelokaler Zustand getrennt, sofern die Anwendung die Scope-Grenzen korrekt einhält.

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('db', Db, [])
  .registerClass('handler', RequestHandler, ['request', 'db'], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope({ request })
  return scope.get('handler').run()
}
```

`db` ist ein Root-Singleton. Die Anfrage ist eine anwendungseigene Scope-Eingabe; `handler` wird vom Request-Scope erzeugt und gehört ihm.

`scoped`-Registrierungen sind für Kind-Scopes vorgesehen. Mit `fast: false` (Standard) wirft die Auflösung aus dem Root den Fehler `Scoped "key" cannot be resolved from the root container. Use createScope().` Rufe zuerst `createScope()` auf und löse den Schlüssel über dessen Ergebnis auf. `fast: true` überspringt diese Laufzeitprüfung.

## Scope-Eingaben

Scope-Eingaben sind externe Werte, die erst beim Öffnen eines Scopes vorliegen, etwa Request, Authentifizierungskontext, Mandant oder Jobdaten. Deklariere sie einmal und übergib die benötigte Teilmenge mit `createScope(inputs)`:

```ts
const root = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerClass('service', RequestService, ['request'], 'scoped')

await using scope = root.createScope({request})
scope.get('service')
```

Der Containertyp verfolgt bereitgestellte Eingaben und erlaubt die Auflösung abhängiger Services erst, wenn sie bereit sind. [Scope-Eingaben](./scope-inputs) behandelt benannte Profile, verschachtelte Verfeinerung, Factories mit `deps`, wiederverwendbare Typen und Validierungsregeln.

## Ressourcenverantwortung

Wem eine Ressource gehört, hängt von der Registrierungsart ab, nicht allein davon, welcher Code ihren Konstruktor aufgerufen hat.

| Wert | Verantwortung und Freigabe |
|---|---|
| Singleton-Ergebnis einer Factory oder Klasse | Container, dem die Registrierung gehört |
| Scoped Ergebnis einer Factory oder Klasse | Scope, der es auflöst und cacht |
| Transientes Factory- oder Klassenergebnis | Aufrufer; InferDI hält es nicht zur Freigabe fest |
| `registerValue`-Wert | Anwendung |
| `.override()`-Wert | Anwendung oder Test-Fixture |
| Scope-Eingabe | Code, der den Scope öffnet |

`root.dispose()` gibt bestehende Kind-Scopes nicht automatisch frei. Schließe jeden Scope an seiner eigenen Lebenszyklusgrenze.

## Native Ressourcenverwaltung

Der Container implementiert beide Freigabesymbole:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Nutze `await using` oder `await container.dispose()`, sobald eine eigene Ressource asynchron sein kann.

## Freigabeprotokoll

Eigene Instanzen werden in umgekehrter Erzeugungsreihenfolge freigegeben. Der Container prüft nacheinander:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

Scheitern mehrere Freigaben, sammelt InferDI die Fehler in einem `AggregateError`. Eine fehlerhafte Freigabe verhindert somit nicht, dass weitere Ressourcen geschlossen werden.

