# Warum InferDI?

Konstruktorinjektion von Hand ist ein guter Einstieg: Abhängigkeiten bleiben sichtbar, und TypeScript prüft jeden Konstruktoraufruf. InferDI hilft, sobald der Anwendungsgraph größer wird und auch Lebensdauern, Scopes, asynchrone Initialisierung, Modulverträge und Ressourcenfreigabe zusammenpassen müssen.

## Die gesamte Zusammensetzung prüfen

Jede Registrierung liefert einen neuen Containertyp. Er hält Schlüssel, Servicetypen, Lebensdauern, den Async-Status und fehlende Scope-Eingaben fest. Weitere Registrierungen können deshalb keine unbekannten Schlüssel, unpassenden Konstruktorargumente oder doppelten Schlüssel unbemerkt einführen. Auch ein Singleton darf keinen kurzlebigeren Zustand festhalten.

```ts twoslash
import { Container } from '@inferdi/inferdi'

class Database {
  find(id: string) {
    return { id }
  }
}

class UserService {
  constructor(readonly database: Database) {}
}

const app = new Container()
  .registerClass('database', Database, [])
  .registerClass('users', UserService, ['database'])

const users = app.get('users')
//    ^?
```

Dieser schrittweise aufgebaute Typ bildet den Graphen ab. Wird die Zusammensetzung auf mehrere Dateien verteilt, bleiben diese Anforderungen in den Modulverträgen erhalten.

## Was gegenüber manueller Verdrahtung hinzukommt

TypeScript prüft bereits `new UserService(database)`. Manuelle Verdrahtung allein erfasst aber weder die Lebensdauer einer Registrierung noch die Weitergabe asynchroner Abhängigkeiten, passende Modulanforderungen oder die Ressourcen, die ein Scope besitzt. InferDI ergänzt diese Regeln für den gesamten Graphen und übernimmt die zugehörige Lebenszyklusverwaltung.

Den Code zum Zusammenstellen der Anwendung schreibst du weiterhin selbst. So bleibt im Review erkennbar, welche Implementierung gewählt wurde und in welcher Reihenfolge ihre Abhängigkeiten übergeben werden.

## Eine kleine Laufzeit mit klaren Aufgaben

Der Kern hat keine Laufzeitabhängigkeiten, benötigt weder Dekoratoren noch Metadatenreflexion und löst Services ohne Proxys auf. Für das Produktionsbundle gilt eine geprüfte Grenze von unter 3 KiB mit gzip. Ein Cachetreffer beginnt mit genau einem `Map.get()`; explizites `undefined` wird durch einen internen Marker dargestellt.

Die Typen verschwinden beim Kompilieren. Zur Laufzeit registriert der Container weiterhin Provider, erzeugt Objekte, verwaltet Caches, meldet Fehler und gibt eigene Ressourcen frei. Der Standardmodus prüft Zyklen und Lebensdauerverletzungen. `{ fast: true }` setzt einen festen Graphen voraus und lässt einen Teil dieser Prüfungen weg.

## Geschäftslogik bleibt gewöhnlicher TypeScript-Code

Fachliche Services erhalten normale Konstruktor- oder Funktionsargumente. Sie müssen weder InferDI importieren noch einen Resolver entgegennehmen. Der Container gehört in den Composition Root und an die Lebenszyklusgrenzen, an denen die Anwendung Implementierungen auswählt und Scopes öffnet.

Ein Unit-Test kann den Service dann direkt mit einer Testabhängigkeit erzeugen. Bei einem Austausch von InferDI müssten Registrierungen und Framework-Anbindung angepasst werden; die fachlichen Regeln können unverändert bleiben, wenn diese Grenze eingehalten wurde. [Composition Root](./composition-root) zeigt die vollständige Aufteilung.

## Explizite Scopes und Ressourcenverantwortung

Ein Scope kann eine HTTP-Anfrage, einen Job, einen Mandantenvorgang oder eine andere begrenzte Arbeitseinheit abbilden. Der Container gibt gecachte Klassen- und Factory-Ergebnisse frei, die ihm gehören. Werte, Overrides, Scope-Eingaben und transiente Ergebnisse bleiben in der Verantwortung des Aufrufers. Eltern und Kinder geben einander nie automatisch frei.

Framework-Adapter verbinden diese Regeln mit React, Fastify, Hono, Koa, Express und Elysia. Der Kern selbst bleibt frameworkunabhängig.

## Grenzen der Garantien

TypeScript typisiert strukturell: Gleich aufgebaute Typen sind ohne zusätzliche Marken austauschbar. `any` und Typumwandlungen können Prüfungen umgehen; breite Laufzeitschlüssel verringern die Genauigkeit des Graphentyps. Dynamische Abhängigkeitszugriffe nach einem `await` nehmen nicht an der synchronen Zyklusverfolgung teil.

InferDI entwirft keine Architektur, repariert keine Zyklen und verhindert weder jedes Ressourcenleck noch garantiert es schnellere Anwendungen. Es prüft die deklarierten Beziehungen mit einer kleinen Laufzeitimplementierung. Weiter geht es mit dem [Schnellstart](./quick-start) oder den konkreten Diagnosen zur [Typsicherheit](../core/type-safety).

