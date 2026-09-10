# Fehler

InferDI meldet fehlerhafte Graphen- und Lebenszyklusoperationen ausdrücklich. Halte diese Meldungen in Tests sichtbar, damit Registrierungsfehler früh auffallen.

| Auslöser | Meldung |
|---|---|
| `.get(k)` mit unbekanntem Schlüssel | `Key "k" not found` |
| Auflösung auf freigegebenem Container | `Container is disposed (key: "k")` |
| Auflösung über freigegebenen Vorfahren | `Ancestor container is disposed (key: "k")` |
| `createScope()` nach Freigabe | `Cannot create scope from a disposed container` |
| Registrierung nach Freigabe | `Cannot register on a disposed container (key: "k")` |
| Scoped Auflösung aus dem Root bei `fast: false` | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| Lebensdauerverletzung eines Singletons | `Singleton "x" cannot depend on scoped "y"...` |
| Synchroner Zyklus | `Circular dependency detected: a -> b -> a...` |
| Synchrone Freigabe asynchroner Ressource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Synchrone Freigabe gecachter asynchroner Initialisierung | `Sync [Symbol.dispose] called on a container that cached a Promise from an async factory...` |
| Zu spätes Override | `Cannot override "k" because it has already been resolved...` |
| Override auf freigegebenem Container | `Cannot override on a disposed container (key: "k")` |

Vor dem Melden eines synchronen Freigabefehlers beobachtet InferDI die Ablehnung eines gecachten nativen Promise. Eine spätere Ablehnung führt dadurch nicht zu `unhandledRejection`; die synchrone Freigabe kann die Ressource trotzdem weder abwarten noch schließen. Bei eigenen Promise-ähnlichen Werten wird `.then()` nicht aufgerufen.

Bei asynchroner Freigabe können eine fehlgeschlagene Abhängigkeit und ihre Verbraucher mit demselben `Error`-Objekt ablehnen. InferDI meldet dieses Objekt einmal. Separate Fehlerobjekte bleiben separate Ursachen im `AggregateError`, auch bei identischen Meldungen.

## Zyklen in asynchronen Factories

Deklarative Kanten in `registerAsyncFactory(..., deps, ...)` werden synchron vorgeprüft. Die bestehende Zykluserkennung weist Zyklen zurück, bevor ein Factory-Rumpf startet.

Zyklen nach einer Promise-Grenze werden nicht erkannt. Dazu zählen Zugriffe aus Promise-wertigen `registerFactory`-Callbacks und über erfasste Container nach `await`. Warten beide Seiten aufeinander, bleibt das Promise dauerhaft ausstehend.

Behebe asynchrone Zyklen in der Architektur:

- gemeinsame Initialisierung abtrennen
- eine Seite in einen früher initialisierten Service verlagern
- `Lazy<singleton>` nur für synchrone Singleton-Kanten verwenden
- verdächtige oberste `await`-Aufrufe während der Entwicklung mit einem Timeout überwachen

## Freigabefehler in Adaptern

Nach Erzeugung einer Antwort werden Freigabefehler nie an den Client weitergereicht. Sie gehen an `onDisposeError` oder den Standardempfänger des Adapters.

Setup-Fehler sind anders: Der ursprüngliche Fehler wird weitergereicht. Ein zusätzlicher Fehler bei der Freigabe während des Setup-Abbruchs wird separat gemeldet und nicht mit dem sichtbaren Fehler aggregiert.

