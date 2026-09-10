# Lebensdauern

InferDI kennt drei Lebensdauern:

| Lebensdauer | Erzeugung | Cache | Freigabe durch Container |
|---|---|---|---|
| `singleton` | einmal je besitzendem Container | besitzender Container | ja |
| `scoped` | einmal je Kind-Scope | Kind-Scope | ja |
| `transient` | bei jeder Auflösung | keiner | nein |

Löse `scoped`-Schlüssel in einem mit `createScope()` erzeugten Kind auf. Der Standardmodus weist die Auflösung aus dem Root-Container zurück.

## Die Lebensdauerregel

Ein Singleton darf nicht direkt von einem `scoped`- oder `transient`-Service abhängen. Es wird einmal erzeugt und über alle Anfragen geteilt. Hält es den Kontext, Benutzer oder die Transaktion einer einzelnen Anfrage fest, gelangt dieser Zustand unbemerkt in andere Anfragen. InferDI verhindert diese Beziehung bereits im Typsystem.

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

TypeScript weist die Registrierung in jedem Laufzeitmodus zurück. Wird das Typsystem durch einen Cast umgangen, lehnt der Standardmodus die Beziehung zusätzlich zur Laufzeit ab.

Deklarierte Scope-Eingaben zählen als scoped Abhängigkeiten. Registriere Verbraucher von Request-, Auth-, Mandanten- oder Jobdaten als `scoped` oder `transient`; einen Singleton-Verbraucher weist der Compiler zurück. Siehe [Scope-Eingaben](./scope-inputs).

Die Laufzeitdurchsetzung hängt vom Containervertrag ab. [Containeroptionen](../reference/api#container-options) beschreibt den Standard- und den `fast`-Modus.

