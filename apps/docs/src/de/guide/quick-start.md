# Schnellstart

Beginne mit zwei gewöhnlichen Klassen und einer expliziten Registrierungskette. Request-Scopes kommen hinzu, sobald der grundlegende Graph steht.

## Installieren

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## Den Graphen aufbauen

<<< ../../../snippets/quick-start-sync.ts

`UserService` importiert InferDI nicht. Der Kompositionscode wählt `Logger`, benennt beide Registrierungen und legt die Reihenfolge der Konstruktorargumente fest. Der zurückgegebene Typ von `root` kennt nun beide Services.

Änderst du den Konstruktor, ohne den Graphen anzupassen, schlägt die Registrierung direkt beim Zusammenstellen der Anwendung fehl:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class UserService {
  constructor(readonly logger: Logger, readonly region: string) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger']) // [!code error]
```

Genau das bedeutet, den Graphenzustand im Typ abzubilden: Registrierungen verfeinern den Containertyp, und spätere Operationen müssen zum bereits deklarierten Graphen passen.

## Services auflösen

`root.get('users')` liefert synchron einen `UserService`. Die Standardlebensdauer ist Singleton; wiederholte Aufrufe liefern daher dieselbe gecachte Instanz.

Anfragedaten benötigen eine kürzere Lebensdauer. Deklariere sie als Scope-Eingabe und übergib sie beim Öffnen eines Kind-Scopes:

<<< ../../../snippets/quick-start-scope.ts

Der `finally`-Block schließt das Kind auch bei einem Fehler. `scope.dispose()` gibt den scoped `RequestLog` frei; der übergebene Wert `request` bleibt in der Verantwortung der Anwendung. Unterstützt deine TypeScript-Toolchain Explicit Resource Management, kannst du stattdessen `await using` verwenden.

## Lebensdauern wählen

| Lebensdauer | Instanzregel | Cache gehört | Freigabe durch |
|---|---|---|---|
| `singleton` | eine Instanz je Registrierungsbesitzer | Root oder Registrierungsbesitzer | diesen Container |
| `scoped` | eine Instanz je auflösendem Scope | Kind-Scope | diesen Scope |
| `transient` | eine Instanz je Auflösung | kein Cache | Aufrufer |

Werte aus `registerValue`, `.override()` und Scope-Eingaben bleiben ebenfalls anwendungseigen. Ein Singleton darf nicht direkt von einem scoped oder transienten Service abhängen. InferDI weist diese deklarierte Beziehung im Typsystem zurück und prüft sie im Standardmodus zusätzlich zur Laufzeit.

## Wie es weitergeht

[Warum InferDI?](./why-inferdi) erläutert die Entwurfsentscheidungen, [Typsicherheit](../core/type-safety) die Graphenprüfungen. [Scopes und Freigabe](../core/scopes) erklärt die Ressourcenverantwortung; [Framework-Adapter](../adapters/) verbinden Scopes mit dem Lebenszyklus der Anwendung.

