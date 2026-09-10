# Performance von InferDI

## Aufgezeichnetes Ergebnis

Im öffentlichen Lauf vom **17.08.2026** löste der geprüfte Standardmodus einen bereits gecachten Singleton im Median in **6.233 ns/op** auf. In genau diesem Szenario und mit den aufgezeichneten Paketversionen lagen die übrigen Container beim **1.76- bis 13.05-Fachen** dieses Medians. Gemessen wird Containeraufwand, nicht HTTP-Durchsatz oder die Gesamtleistung einer Anwendung. Das [Rohergebnis](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json) enthält alle acht Runden und Umgebungsdaten.

Ein warmer Zugriff liest `Map.get(key)`; ist eine Konstruktion nötig, wird `new Ctor(...)` direkt aufgerufen. Die Szenarien untersuchen folgende Laufzeitentscheidungen:

| Entscheidung | Wirkung |
|---|---|
| Explizite Registrierungen | Pro Service ein `Map.set`; keine Dekorator-Nebeneffekte, Parser für Konstruktorparameter oder Metadatentabellen. |
| Gecachte Singleton- und scoped Services | `cache.get(key)` läuft vor der Zyklus- und Lebensdauerbuchführung. `undefined` wird als `UNDEFINED_MARKER` gespeichert, damit ein Zugriff genügt. |
| Direkte Konstruktoraufrufe | 0–7 Abhängigkeiten verwenden `new Ctor(...)`, größere Konstruktoren `Reflect.construct`. |
| Asynchrone Factories | Das Promise wird unverändert gecacht. Gleichzeitige Aufrufer teilen die Initialisierung; `.get()` bleibt synchron. |
| Laufzeitvertrag | Standard/`fast: false` erhält Prüfungen und die exakte veränderbare Elternkette. `fast: true` deaktiviert Prüfungen und nutzt feste Scope-Topologie. |

## Benchmark-Suite

Der Vergleich misst `InferDI (fast)` und `InferDI (default)` neben InversifyJS v8, Awilix v13 in PROXY- und CLASSIC-Modus, TSyringe v4, TypeDI v0.10 und Typed Inject v5. Paketversionen und Rechnerumgebung stehen im Rohergebnis.

**Korrektheit vor Zeitmessung**

Vor Tinybench läuft die Vertragstestsuite der Benchmark-Adapter. Jeder muss denselben beobachtbaren Graphen bereitstellen:

- `Logger`, `Config`, `Repo` und `Service` sind Root-Singletons.
- Transiente Knoten erzeugen neue Instanzen.
- Jeder Scope cacht seinen eigenen `ScopedService` und teilt den Root-Logger.
- Lazy-Zugriff verschiebt die Zielauflösung.
- Jede deklarierte Freigabe-API ruft die Freigabe des scoped Services auf.

Damit verzerren Unterschiede in Lebensdauer oder Identität nicht den Zeitvergleich. Erst nach bestandenem Vertrag werden die Kosten gemessen.

**Messaufbau**

Der öffentliche Runner installiert mit festem Lockfile, prüft die Typen des Benchmark-Workspaces, baut InferDIs Produktions-ESM-Artefakt und testet dessen Vertrag. Danach gelten diese Messbedingungen:

1. Ein balancierter Lateinisches-Quadrat-Block umfasst acht Runden für acht Teilnehmer.
2. Jeder Teilnehmer belegt jede Prozessposition einmal und folgt jedem anderen einmal. `InferDI (fast)` läuft viermal vor und viermal nach `InferDI (default)`.
3. Jeder Teilnehmer startet in einem frischen Node-Prozess ohne geteiltes JIT-Feedback, Inline-Caches oder GC-Vorgeschichte.
4. Tinybench wärmt jedes Szenario 50 ms auf und misst 100 ms. Eine Stichprobe führt einen zur Operation passenden Batch aus.
5. Je Teilnehmer, Szenario und Runde wird die mediane Batchdauer durch die Batchgröße geteilt und als `ns/op` gespeichert.
6. Der Bericht fasst die acht Rundenwerte als Median und mediane absolute Abweichung (MAD) zusammen.

Weniger `ns/op` ist besser. MAD beschreibt die Streuung um den Median, kein Konfidenzintervall. Prozessisolation und balancierte Startreihenfolge reduzieren Verzerrungen, beseitigen aber weder Betriebssystem-Scheduling noch CPU-Taktwechsel, JIT-Entscheidungen oder GC-Effekte.

**Grenzen der Szenarien**

Jedes Szenario isoliert einen Teil der Containerarbeit. Produktionscode kombiniert je nach Lebensdauermodell mehrere dieser Schritte.

| Gruppe | Szenarien | Gemessene Containerarbeit |
|---|---|---|
| Warmer Zugriff | Singleton, scoped und Lazy-Auflösung | Cachezugriff oder Zugriff über vorhandenen Lazy-Wrapper |
| Objekterzeugung | Transiente Auflösung, tiefe und breite Graphen | Cachemisses, Abhängigkeitssuche, Argumentaufbau und Konstruktoren |
| Start und kalter Zugriff | Registrierung, erste Auflösung | Graphenaufbau und erstes Füllen des Caches |
| Scope-Lebenszyklus | Erstellung, erste scoped Auflösung, synchrone und asynchrone Freigabe | Verantwortung je Anfrage oder Job von Erstellung bis Freigabe |

Tinybench-Setup-Hooks bereiten kalte Graphen und Scopes außerhalb der Messung vor. Auch Freigaben bei Registrierungs- und Auflösungsszenarien liegen außerhalb der Zeitmessung. Nur die Freigabeszenarien messen das Aufräumen selbst.

TypeDI zeigt bei Registrierung `N/A`, weil vergleichbare Definitionen als Dekorator-Nebeneffekte während der ausgeschlossenen Modulevaluierung laufen. Freigabezeilen enthalten nur Bibliotheken mit äquivalentem öffentlichem Vertrag: InversifyJS zeigt `N/A`, TypeDI nimmt an synchroner Freigabe teil, Awilix, TSyringe und Typed Inject an asynchroner. InferDI bietet beide Formen.

**Öffentliches Ergebnis**

Jede Zelle zeigt `Median ± MAD` in `ns/op`. Der Klammerfaktor vergleicht den Median mit dem niedrigsten derselben Zeile.

![Benchmark](https://raw.githubusercontent.com/inferdi/inferdi/main/assets/benchmarking_results.jpg)

| Szenario                     |          InferDI (fast) |       InferDI (default) |               InversifyJS |              Awilix PROXY |            Awilix CLASSIC |                TSyringe |                   TypeDI |            Typed Inject |
|------------------------------|------------------------:|------------------------:|--------------------------:|--------------------------:|--------------------------:|------------------------:|-------------------------:|------------------------:|
| Singleton aus dem Cache        |   6.233 ± 0.091 (1.00×) |   6.233 ± 0.000 (1.00×) |    10.954 ± 0.321 (1.76×) |    40.425 ± 0.596 (6.49×) |    41.525 ± 0.367 (6.66×) | 81.354 ± 3.254 (13.05×) |  71.729 ± 0.962 (11.51×) |  48.354 ± 1.374 (7.76×) |
| Transiente Auflösung            |  41.798 ± 2.196 (1.00×) |  45.834 ± 1.284 (1.10×) |    79.566 ± 3.850 (1.90×) |    219.82 ± 8.250 (5.26×) |    227.15 ± 8.068 (5.43×) | 301.40 ± 16.682 (7.21×) |  519.75 ± 5.498 (12.43×) |  138.05 ± 1.464 (3.30×) |
| Tiefer Graph (10 Ebenen)       | 344.21 ± 11.460 (1.00×) | 445.50 ± 10.085 (1.29×) |    397.37 ± 7.795 (1.15×) |   1306.3 ± 16.500 (3.79×) |   1190.8 ± 12.375 (3.46×) | 1463.0 ± 34.835 (4.25×) | 4478.8 ± 26.582 (13.01×) |  717.75 ± 3.670 (2.09×) |
| Breiter Graph (4 Abhängigkeiten)  |  59.584 ± 1.282 (1.00×) |  71.316 ± 1.284 (1.20×) |    103.22 ± 2.932 (1.73×) |    331.10 ± 6.416 (5.56×) |    302.69 ± 5.498 (5.08×) | 457.97 ± 18.150 (7.69×) | 863.32 ± 12.832 (14.49×) |  197.63 ± 1.468 (3.32×) |
| Breiter Graph (10 Abhängigkeiten) |  188.37 ± 4.125 (1.00×) |  200.74 ± 4.130 (1.07×) |    394.63 ± 4.580 (2.09×) |   681.08 ± 21.080 (3.62×) |   571.54 ± 12.830 (3.03×) | 979.46 ± 15.125 (5.20×) | 2234.1 ± 25.888 (11.86×) |  321.29 ± 4.585 (1.71×) |
| Registrierung                 | 2007.5 ± 27.500 (1.00×) | 2158.8 ± 13.750 (1.08×) | 61274.6 ± 1537.7 (30.52×) | 74763.4 ± 1024.4 (37.24×) | 95225.6 ± 467.45 (47.43×) | 3762.9 ± 36.650 (1.87×) |                      N/A | 3593.3 ± 18.300 (1.79×) |
| Erste Auflösung                | 653.13 ± 24.745 (1.00×) |  794.98 ± 6.190 (1.22×) |  9967.4 ± 551.61 (15.26×) |   2434.9 ± 96.250 (3.73×) |   3044.2 ± 70.360 (4.66×) | 1236.8 ± 25.440 (1.89×) |  3322.9 ± 22.455 (5.09×) | 1275.3 ± 22.917 (1.95×) |
| Scope-Erstellung               |  79.750 ± 2.290 (1.00×) |  83.415 ± 5.505 (1.05×) |  6194.4 ± 167.98 (77.67×) |  1054.4 ± 16.960 (13.22×) |   1031.2 ± 7.790 (12.93×) | 503.26 ± 10.540 (6.31×) |   419.38 ± 3.210 (5.26×) |  164.08 ± 1.835 (2.06×) |
| Erste scoped Auflösung         |  115.05 ± 1.830 (1.00×) |  128.34 ± 1.835 (1.12×) |  3048.6 ± 32.765 (26.50×) |    352.92 ± 1.835 (3.07×) |    362.54 ± 4.590 (3.15×) | 373.54 ± 11.915 (3.25×) |   296.08 ± 4.125 (2.57×) |  203.05 ± 0.920 (1.76×) |
| Scoped Auflösung aus dem Cache          |   8.387 ± 0.092 (1.05×) |   8.250 ± 0.046 (1.03×) |    30.204 ± 0.367 (3.79×) |   90.841 ± 1.421 (11.39×) |   95.242 ± 1.421 (11.94×) |  78.375 ± 2.429 (9.83×) |  92.630 ± 0.458 (11.61×) |   7.975 ± 0.092 (1.00×) |
| Synchrone Freigabe                |  99.455 ± 1.370 (1.01×) |  98.085 ± 0.925 (1.00×) |                       N/A |                       N/A |                       N/A |                     N/A |   124.21 ± 3.665 (1.27×) |                     N/A |
| Asynchrone Freigabe               |  242.91 ± 3.210 (1.00×) |  249.34 ± 1.840 (1.03×) |                       N/A |   860.52 ± 20.170 (3.54×) |   886.87 ± 13.750 (3.65×) | 1311.8 ± 10.080 (5.40×) |                      N/A | 721.42 ± 19.935 (2.97×) |
| Lazy-Auflösung                 |  18.837 ± 0.458 (1.00×) |  19.020 ± 0.274 (1.01×) |    64.212 ± 3.621 (3.41×) |    115.68 ± 0.825 (6.14×) |    124.09 ± 3.231 (6.59×) |  155.01 ± 5.271 (8.23×) |  271.06 ± 3.941 (14.39×) |  76.496 ± 0.962 (4.06×) |

::: info Quelldaten
Diagramm und Tabelle verwenden [`public-2026-08-17T16-46-00-483Z.json`](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json). Dort stehen alle acht Runden, normalisierte Messungen, Tinybench-Statistiken, Umgebungsdaten und Abhängigkeitsversionen. Die [Benchmark-README](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) beschreibt Szenarien, Produktionsbezug und Berechnung.
:::

**Ergebnisse einordnen**

In 12 von 13 Szenarien erreicht mindestens ein InferDI-Modus den niedrigsten oder gleichauf niedrigsten Median. `InferDI (fast)` erreicht dies in 11 Szenarien. Am deutlichsten sind die Vorteile bei Registrierung, erster Auflösung, transienter Konstruktion und Graphenaufbau, Scope-Erstellung und erster scoped Auflösung. Dort wirken die flache Registrierung, direkte Konstruktoren und der kleine Cachemiss-Pfad.

Die Ausnahme ist die warme scoped Auflösung: Typed Inject erreicht 7.975 ns, InferDI default 8.250 ns und InferDI fast 8.387 ns. Diese Zeile misst einen gecachten Zugriff aus einem bestehenden Scope, ohne Erstellung, ersten Cachemiss oder Freigabe. Dieselbe Produktionsanfrage kann diese Kosten separat tragen.

**Warum `fast` nicht in jeder Zeile niedriger liegt**

`fast: true` verändert geprüfte Cachemisses, Konstruktion, Registrierungsinvalidierung und Elternsuche in festen Scope-Bäumen. Manche Szenarien führen diese Zweige nach dem Aufwärmen nicht aus:

- Ein warmer Singleton-Zugriff kehrt aus `cache.get(key)` zurück, bevor das `fast`-Flag gelesen wird. Beide Modi erreichen 6.233 ns.
- Warme scoped Auflösung verwendet denselben Cachetrefferpfad. 8.387 ns gegenüber 8.250 ns ergeben 0.137 ns Unterschied bei gleicher Implementierung, in der Größenordnung der MAD-Werte.
- Synchrone Freigabe verwendet in beiden Modi dieselbe Implementierung. Der Medianunterschied von 1.370 ns entspricht der MAD des Fast-Ergebnisses dieses Laufs.
- Asynchrone Freigabe und Lazy-Auflösung zeigen kleine Fast-Vorteile, profitieren im eingeschwungenen Zustand aber ebenfalls nicht direkt von deaktivierten Auflösungsprüfungen. Diese Abstände sind entsprechend vorsichtig zu lesen.

Unabhängige Node-Prozesse können für identische Pfade unterschiedlichen JIT-Code erzeugen oder anderes Scheduling und GC-Timing erleben. Acht-Runden-Median und balancierte Reihenfolge verringern diese Effekte, beseitigen sie aber nicht. Die kleinen Umkehrungen bei warmer scoped Auflösung und synchroner Freigabe beweisen keine Fast-Regression. Für Subnanosekunden- und kleine Prozentunterschiede sind Wiederholungen auf einem kontrollierten Rechner aussagekräftiger.

Größere Fast-/Standard-Abstände treten bei unterschiedlicher Implementierung auf: Der Standardmedian beträgt das 1.29-Fache beim zehn Ebenen tiefen transienten Graphen, 1.22-Fache bei erster Auflösung, 1.20-Fache beim Graphen mit vier Abhängigkeiten und 1.12-Fache bei erster scoped Auflösung. Das passt zu entfallener Zyklus- und Lebensdauerbuchführung sowie fester Scope-Suche.

**Szenarien zur Anwendung passend auswählen**

Der Bericht berechnet keine Gesamtnote: Anwendungen kombinieren Containerarbeit unterschiedlich. Ein langlebiger Prozess registriert vielleicht einmal und liest meist warme Singletons. Ein HTTP-Adapter erstellt, löst auf, liest aus dem Cache und gibt je Anfrage einen Scope frei. Ein Worker kann transiente Graphen ohne Scopes erzeugen.

Bilde keinen Durchschnitt der relativen Faktoren über Zeilen. Szenarien verwenden unterschiedliche Batchgrößen und unabhängige Zeitbereiche. Wähle die Zeilen, die zum gemessenen Auflösungsmuster passen, und profiliere anschließend die ganze Anwendung mit Framework und I/O.

Der Vergleich gilt für die aufgezeichneten Versionen, Adapter, Fixtures und den Rechner. Jede Bibliothek behält ihr öffentliches Lebenszyklusmodell. `N/A` bedeutet, dass keine äquivalente Operation gefunden wurde. Gemessen wird Containeraufwand, nicht die vollständige Anfragezeit.

## `fast: true` {#fast-true}

Die Konstruktorreferenz steht unter [Containeroptionen](../reference/api#container-options). Hier geht es um die Auswirkungen auf die Performance.

`new Container({ fast: true })` entfernt Zyklusbuchführung, Singleton-Stack-Verfolgung und das `try`/`finally` der geprüften Auflösung. Feste Scopes lesen direkt beim Registrierungsbesitzer und spiegeln delegierte Singletons im Scope-Cache. Standard-Scopes durchlaufen bei lokalen Fehlzugriffen die genaue Elternkette und sehen dadurch Änderungen. Fast-Container überspringen defensive Invalidierung bei Registrierung. Die identitätsbasierte Deduplizierung eigener Instanzen bleibt bei der Freigabe erhalten.

Standard-`new Container()` und `{fast: false}` behalten Sicherheitsprüfungen und einen veränderbaren Graphen.

Nutze `fast: true` erst nach Tests mit `fast: false`. TypeScript sieht nicht alle Singleton- oder transienten Zyklen, dynamischen Schlüssel, Casts oder Factories mit erfasstem weiterem Außencontainer. Registriere jeden Laufzeitschlüssel einmal in einer linearen Kette, schließe Registrierungen vor erster Auflösung oder Scope-Erstellung ab, halte den aktivierten Baum unveränderbar und gib Kinder vor Vorfahren frei.

Nach dieser Prüfung kann `{fast: true}` in einem profilierten Produktionsgraphen Registrierung, Cachemisses, Konstruktion und feste Scope-Suche verbilligen. Warme Cachetreffer und Freigabe teilen gemeinsame Pfade. Miss die dominierenden Schritte, bevor du den Vertrag wählst. Für Entwicklung, Tests, Hot Reload und nachträglich veränderte Bäume bleibt `fast: false` passend.

## Details des häufig ausgeführten Pfads

### Transiente Konstruktion

`registerClass` ist der Standard für transiente Services. Behalte es bei, solange Profiling nicht viele wiederholte Auflösungen unterschiedlicher transienter Klassen mit derselben Abhängigkeitsanzahl als Engpass zeigt.

Für genau diesen V8-Fall gibt eine explizite Factory jedem Service seine eigene Konstruktionsstelle:

```ts
const container = new Container()
  .declareScopeInputs<{ context: RequestContext }>()
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    ['context', 'schema'],
    'transient'
  )
```

Factories wiederholen die Verdrahtung; nutze diese Form erst nach Messung des Anwendungsartefakts. Ein gemeinsamer generischer Konstruktionshelfer hebt die getrennte Aufrufstelle und damit die Optimierung auf.

### Darstellung von Schlüsseln

Symbolschlüssel können enge Auflösungsschleifen beschleunigen, weil `Map` ihre Identität vergleicht. Strings benötigen Hashing und bei Kollision Zeichenvergleiche. Die meisten Anwendungen messen keinen Unterschied; wähle Symbole hier auf Basis von Profiling.

## Lokal reproduzieren

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run bench:quick   # local source check
pnpm run bench:public  # production artifact, fresh process per subject
```

Der Benchmark-Workspace ist bewusst vom Root-pnpm-Workspace getrennt und besitzt ein eigenes Lockfile. Die [Benchmark-README](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) erläutert Methodik, Vergleichbarkeit und Fixtures.
