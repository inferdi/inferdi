# Der Composition Root

Der Composition Root ist die Stelle am Rand der Anwendung, an der konkrete Implementierungen ausgewählt und verbunden werden. Fachlicher Code beschreibt seine Anforderungen; Infrastruktur liefert die Implementierung. InferDI kommt nur im Kompositionscode vor.

## Vertrag der Fachdomäne

Das Interface gehört zur Domäne, weil der Anwendungsfall davon abhängt. Diese Datei importiert weder Container noch Framework.

::: code-group

<<< ../../../snippets/composition/domain.ts [domain.ts]

:::

## Implementierung in der Infrastruktur

Die Infrastruktur implementiert den Domänenvertrag. Ein echter Adapter würde einen Datenbankclient verwenden; das kleine Beispiel hält den Aufruf übersichtlich.

::: code-group

<<< ../../../snippets/composition/infrastructure.ts [infrastructure.ts]

:::

## Die Anwendung zusammensetzen

Nur diese Datei importiert InferDI. Sie wählt `PostgresUserStore`, übergibt dessen DSN und verbindet ihn mit `GetGreeting`.

::: code-group

<<< ../../../snippets/composition/container.ts [container.ts]

:::

Das Registrierungstupel wird gegen den jeweiligen Konstruktor geprüft. Änderungen an `GetGreeting` oder `PostgresUserStore` machen eine veraltete Verdrahtung an dieser Grenze sichtbar.

## Den Service an der Anwendungsgrenze verwenden

Eine HTTP-Route, ein CLI-Befehl oder ein Queue-Consumer löst den obersten Service auf. Die fachliche Operation wird weiterhin über dessen gewöhnliche Methode aufgerufen.

::: code-group

<<< ../../../snippets/composition/entry.ts [entry.ts]

:::

Benötigt die Operation Anfrage- oder Jobdaten, öffne hier einen Kind-Scope. Gib ihn an derselben Grenze frei oder überlasse die Anbindung an den Framework-Lebenszyklus einem Adapter.

## Die Domäne direkt testen

Der Unit-Test baut keinen Container auf. Er übergibt einen `UserStore`-Fake an dieselbe Klasse `GetGreeting`, die auch produktiv verwendet wird.

::: code-group

<<< ../../../snippets/composition/domain.test.ts [domain.test.ts]

:::

Nutze `.override()` für Integrationstests, die den echten Graphen mit einer ausgetauschten Implementierung prüfen sollen. Für einen einzelnen fachlichen Service ist direkte Konstruktion meist klarer. Mehr dazu unter [Tests und Overrides](../core/testing).
