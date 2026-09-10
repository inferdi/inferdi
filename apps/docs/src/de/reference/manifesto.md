# Architekturmanifest des InferDI-Kerns

Dieses Dokument legt die Regeln für `@inferdi/inferdi` in `packages/inferdi` fest. Lies es vor Reviews von PRs, die öffentliche API, Typsystem, `get()`-Auflösung, Registrierungsstruktur, Scope-Semantik oder Ressourcenfreigabe ändern.

## 1. Philosophie und Versprechen

### Mission

InferDI zeigt, dass Dependency Injection in TypeScript Laufzeitflexibilität und statische Garantien verbinden kann. Der Abhängigkeitsgraph ist ein TypeScript-Typ. Kann der Compiler eine Regel prüfen, muss InferDI sie in öffentlichen Signaturen ausdrücken. Laufzeitprüfungen sichern Casts mit `as`, erfasste Außencontainer, dynamische Schlüssel und andere Bereiche ab, in denen TypeScript den Graphen nicht sehen kann.

### Nutzen

Der Graph ist der Typ. Fehlende Schlüssel, falsche Konstruktorpositionen, doppelte Registrierungen und kurzlebiger Zustand in Singletons sollen vor dem Produktionslauf auffallen. Zugleich bleibt der Laufzeitvertrag klein: keine Laufzeitabhängigkeiten, Dekoratoren, Metadatenreflexion, Proxy-Traps oder Framework-Mechanik im Kern.

Ein Cachetreffer bleibt ein schneller Pfad mit genau einem `Map.get()`. Klassen werden für 0–7 Abhängigkeiten über explizite direkte `new Ctor(...)`-Zweige erzeugt; für 8 und mehr gibt es einen vermessenen Ausweichpfad.

Schwächt ein Feature diese Zusagen, gehört es nicht in den Kern.

## 2. Nicht verhandelbare Grundsätze

### 2.1 Durchgehende Typsicherheit

Öffentliche Signaturen müssen ungültige Graphenzustände unbeschreibbar machen, soweit TypeScript die betreffende Regel ausdrücken kann.

- `register*` akzeptiert `key: K & NoKeyOverlap<K, keyof T>`. `NoKeyOverlap` prüft `[K & keyof T]` nichtdistributiv. Literale, breite, Symbol- und Union-Schlüssel bleiben unterstützt. Jede Überlappung weist den gesamten Kandidaten zurück, statt still ein Union-Mitglied zu entfernen.
- `DepsOf<AllowedDeps<T, L>, A>` prüft `deps` gegen Konstruktorparameter nach Position und struktureller Zuweisbarkeit.
- `AllowedDeps<T, L>` beschränkt den Factory-Container. In einer Singleton-Factory ist `c.get('scoped')` ein Typfehler.
- Die Closure-Form von `registerFactory` erhält einen lebensdauergefilterten Container. Die `deps`-Überladung erhält einen auf deklarierte synchrone Schlüssel beschränkten Resolver; `registerAsyncFactory` erhält aufgelöste positionsgebundene Werte. Diese Verträge dürfen nicht vermischt werden.
- `Lazy`, `AsyncLazy`, `Lifetime`, `Spec`, `AsyncSpec`, `LazySpec`, `AsyncLazySpec`, `ScopeInputMap`, `WithRequirements`, `DependenciesMap`, `SpecMap`, `ContainerOptions`, `Module` sowie `Container.ReadyKeys`, `Container.SyncReadyKeys`, `Container.Resolve`, `Container.ResolveUnwrapped`, `Container.UnwrappedValue` und `Container.Providers` sind öffentliche Verträge. Änderungen ihrer Zuweisbarkeit oder Inferenz sind API-Änderungen, auch ohne Laufzeitänderung.
- Generische Resolver verwenden `Container.SyncReadyKeys<C>` für `get()` und `Container.ReadyKeys<C>` für `getAsync()`. `.has()` bestätigt nur Registrierung, weder Sync-Modus noch fehlende Scope-Eingaben.
- Neue oder geänderte öffentliche Typen benötigen positive und negative `// @ts-expect-error`-Tests in `container.test-d.ts` oder der deklarativen Async-Typsuite. Öffentliche Modul- und Scope-Diagnosen brauchen passende Compiler-Fixtures. Erzeugte Deklarationen müssen `consumer-dts.ts` weiterhin mit TypeScript 5.2 bestehen.

Bekannte TypeScript-Grenzen müssen dokumentiert werden. Strukturell gleiche Abhängigkeiten bleiben austauschbar; für nominale Unterscheidung kommen etwa `unique symbol`-Schlüssel und Marken in Werttypen infrage. Nominale Schlüssel allein unterscheiden jedoch keine strukturell identischen Konstruktorargumentwerte.

### 2.2 Keine Dekoratoren, keine Reflect-Metadaten

InferDI ist gewöhnliches TypeScript mit ES2022 als Ziel. Dekoratoren, `reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata`, TypeScript-Transformer und Transpiler-Plugins sind ausgeschlossen.

- Der Konstruktortyp bestimmt die Abhängigkeitstypen.
- Das explizite Tupel `deps` bestimmt die Argumentreihenfolge.
- Zur Laufzeit werden weder Parameternamen noch erzeugte Metadaten oder Klassenfelder untersucht.

Dekoratoren und Metadaten würden InferDI in eine andere Bibliothek verwandeln. Sie bringen Laufzeitzustand, Toolchain-Anforderungen und Kaltstartkosten mit, die der Kern bewusst ausschließt.

### 2.3 Lebensdauer ist Teil des Typs

Der Kern kennt `singleton`, `scoped` und `transient`. Jede Registrierung trägt ihre Lebensdauer über `Spec<V, L>` und dessen öffentliche Eigenschaft `lifetime`.

- Ein Singleton darf nicht direkt von scoped oder transienten Services abhängen. `AllowedDeps<T, L>` prüft dies statisch; der Standardvertrag zusätzlich zur Laufzeit bei Casts und dynamischen Registrierungen. Jede Lebensdauer-Union, die `'singleton'` enthalten kann, verwendet den Singleton-sicheren Filter. Nur Unions ohne Singleton dürfen kurzlebige Abhängigkeiten annehmen.
- `Lazy<V>` und `AsyncLazy<V>` erhalten die Ziellebensdauer. Singleton-Verbraucher dürfen nur verwaltete Begleiter injizieren, deren vollständiger Zielzustand `'singleton'` ist. Scoped, transiente, gemischte Lebensdauern sowie Unions aus verwalteten und unverwalteten Begleitern bleiben unzulässig.
- `Registration.lazy` darf nur bei Lazy-Begleitern mit Singleton-Ziel `true` sein.
- `Registration.owned` ist nur für Klassen-/Factory-Werte `true`, die dem Container gehören. Bei `registerValue`, `.override()`, Lazy-Begleitern, Scope-Eingaben und transienten Ergebnissen ist es `false`.
- Werte aus `registerValue`, `.override()` und Scope-Eingaben bleiben extern verwaltet; transiente Ergebnisse gehören dem Aufrufer. Keines davon kommt in die Freigabewarteschlange.
- `.override()` dient Tests. Es erhält `kind`, `lazy` und `async`, bleibt lokal und verbietet deklarierte Scope-Eingaben, unbekannte Schlüssel, freigegebene Container sowie Schlüssel im lokalen Cache. Der Cache-Schutz erfasst lokale Singleton-/scoped Auflösungen, `registerValue` und wiederholte Overrides, aber keine transienten Auflösungen oder über ein geprüftes Kind aufgelöste Werte von Vorfahren. Overrides müssen dennoch vor der Graphenauflösung erfolgen.
- `dispose()` betrifft nur eigene Instanzen. Eltern- und Kindcontainer geben einander nicht frei.

#### 2.3.1 Async-Modus als Typzustand

Deklarative asynchrone Services teilen Graph, Registrierungsmap, Cache, Scope-Suche, Ressourcenverantwortung und Freigabepfad mit synchronen Services.

- `registerAsyncFactory` speichert den fertigen Werttyp in `AsyncSpec<V, L>`, nicht `Promise<V>`. Das positionsgebundene Abhängigkeitstupel wird wie ein Konstruktortupel geprüft und bleibt readonly, weil die Registrierung klassifizierte Positionen behält.
- Asynchrone Singleton- und scoped Registrierungen cachen ein natives Promise. Gleichzeitige `getAsync()`-Aufrufe teilen so die Initialisierung. Die bloße Auflösung eines `AsyncLazy`-Wrappers darf das Ziel nicht starten.
- Klassen mit deklarativen asynchronen Abhängigkeiten werden transitiv asynchron. Das Ziel nutzt `getAsync()`, der verwaltete Begleiter wird `AsyncLazy`. Bei einer Sync-/Async-Schlüsselunion bleibt der Typ vorsichtig gemischt.
- `get()` verbietet deklarative Async-Schlüssel im Typsystem. `getAsync()` akzeptiert alle bereiten Schlüssel, liefert ein Promise und wandelt synchrone Resolverfehler in Ablehnungen um, ohne eine zweite Registrierung oder Auflösungsbahn einzuführen.
- Promise-wertige `registerFactory`-Einträge bleiben gewöhnliche synchrone Grapheneinträge. Ihr Vertrag darf nicht still zu `AsyncSpec` umklassifiziert werden.
- `Registration.async` ist angehängte Metainformation für die Klassifikation bei Registrierung. Der häufig ausgeführte Auflösungspfad darf sie nie lesen.

#### 2.3.2 Scope-Bereitschaft als Typzustand

Scope-Eingaben beschreiben anwendungseigene Werte, die erst beim Öffnen von Kind-Scopes verfügbar werden.

- `declareScopeInputs<Inputs>()` wirkt ausschließlich im Typsystem und darf den Laufzeitcontainer nicht verändern.
- Deklarationen akzeptieren endliche verpflichtende String- oder Symbolschlüssel. Numerische Schlüssel, `__proto__`, breite Indexsignaturen, optionale Eigenschaften, unterschiedliche Schlüsselmengen in Unions und Kollisionen werden abgelehnt.
- `createScope(inputs)` darf jede Teilmenge fehlender Eingaben bereitstellen. Bereitschaft wird an abhängige Registrierungen weitergegeben; verschachtelte Scopes erben vorhandene Eingaben. Nur bereite Schlüssel werden auflösbar.
- Werte werden flach in den Kind-Cache kopiert, bleiben anwendungseigen, dürfen weder überregistriert noch überschrieben werden und sind aus `Container.Providers<C>` ausgeschlossen.

#### 2.3.3 Module als Anforderungsverträge

`Module<TRequirements, TProvides>` beschreibt eine wiederverwendbare Graphentransformation, keinen exakten Alias für den gesamten Container.

- Zusätzliche Einträge sind erlaubt. Jede Anforderung muss aber in Service-Zuweisbarkeit, exakter Lebensdauer, Async-Modus, verwaltetem Lazy-Modus, Scope-Eingabeidentität und Bereitschaft passen.
- Der Callback sieht nur deklarierte Anforderungen. Der zurückgegebene Graph erhält alle tatsächlichen Einträge und ergänzt die deklarierten Ausgaben.
- Ausgabeschlüssel dürfen nicht mit dem tatsächlichen Graphen kollidieren. Bereits erfüllte Scope-Anforderungen verschwinden aus dem zurückgegebenen Anforderungszustand.
- Generische Helfer `<T>(c: Container<T>) => ...` können beliebige neue Schlüssel gegen die Obergrenze `DependenciesMap` nicht beweisen. Nutze Inline-Lambdas in `.use()` oder benannte Module.

### 2.4 Der Auflösungspfad bleibt klein

Die erste Operation in `get()` ist die lokale Cachesuche:

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

Vor diesem Zugriff darf keine zusätzliche Arbeit stehen.

- Explizites `undefined` wird durch `UNDEFINED_MARKER` repräsentiert. Kein zweites `cache.has(key)` im Cachetrefferpfad.
- `_disposed`, Registrierungs- und Elternsuche, Zyklus- und Lebensdauerprüfungen sowie Änderungen am Singleton-Stack folgen erst nach dem Cachepfad.
- Standardbäume prüfen lokale Registrierungen vor der exakten Elternkette. Ohne gespeicherte Elternsuchergebnisse bleiben Änderungen ohne Invalidierungsbuchführung oder zusätzliche Scope-Metadaten sichtbar.
- Konstruktoren mit 0–7 Argumenten behalten explizite direkte Zweige. Ab 8 nutzt der Code `Reflect.construct` mit einem per `push` aufgebauten gepackten Array.
- `get()` bleibt synchron. Das gemeinsame Array `resolving` und `singletonStack` funktionieren, weil jede Auflösung und jede deklarative Async-Vorprüfung atomar auf dem Aufrufstack läuft. `getAsync()` legt eine Promise-Grenze um denselben Resolver und verändert diese Stacks nie aus einer Fortsetzung heraus.
- Synchrone und asynchrone Registrierungen teilen `regs`, `cache`, Scope-Suche, Besitz und Freigabe. `Registration.async` bleibt kalte Registrierungsmetainformation; `get()` liest sie nie.
- `{fast: false}` ist der geprüfte veränderbare Standard. `{fast: true}` entfernt Prüfungen nach dem Cachepfad, liest direkt den Registrierungsbesitzer und spiegelt delegierte Singletons lokal. Alle `register*`, `.use()` und `.override()` müssen vor erster Auflösung oder `createScope()` beendet sein. Kinder werden vor Vorfahren freigegeben. Nur der Wert `true` aktiviert dies; unbekannte oder gecastete andere Werte fallen sicher auf den geprüften Vertrag zurück.
- Die häufig verwendeten Felder von `Registration` bleiben in der Reihenfolge `{kind, lazy, fn, owned}`. Der optionale `async`-Marker darf nur danach angehängt werden und gehört nicht in den Auflösungspfad.

`packages/inferdi/__tests__/container.bench.ts` wird nicht durch CI erzwungen. Reviews müssen Benchmarkausgaben für Änderungen an `get()`, Registrierungsstruktur, Cache, Scope-Suche, Lazy-Begleitern oder Konstruktoraufrufen verlangen. Eine lokale Verschlechterung von mehr als 5 % in einem relevanten Szenario blockiert den Merge ohne eng begrenzte schriftliche Begründung im PR.

### 2.5 Keine Laufzeitabhängigkeiten

`@inferdi/inferdi` besitzt keine Laufzeitabhängigkeiten. Das bleibt so.

Das veröffentlichte Bundle muss mit gzip strikt unter 3 KiB (3072 Byte) bleiben. CI prüft dies mit `pnpm run test:bundle-size`. Reviews müssen Größenänderungen bei zusätzlichem Kerncode oder öffentlichen Helfern trotzdem betrachten.

### 2.6 Freigabe setzt Verantwortung durch

Freigegeben werden nur Werte, die der aktuelle Container besitzt und cacht. Die Freigabe ist idempotent, gegen Wiedereintritt abgesichert und für Eltern und Kinder unabhängig.

- Zuerst den Container als freigegeben markieren, `owned` kopieren und deduplizieren. Dann `owned`, `cache`, `regs`, `scopeInputs` und `parent` leeren, bevor Benutzer-Disposer laufen. Wiedereintretende Auflösung muss sofort einen abgebauten Container sehen.
- LIFO nach erster Erzeugung erhalten. Doppelte Cacheeinträge und mehrere Async-Factories mit derselben fertigen Ressource dürfen sie nur einmal schließen.
- Asynchrones `dispose()` teilt ein laufendes Abschluss-Promise, entpackt gecachte Async-Factory-Promises, prüft `Symbol.asyncDispose` → `Symbol.dispose` → `.dispose()`, fährt nach Fehlern fort und wirft einen einzelnen Fehler oder bei mehreren ein `AggregateError`.
- Synchrones `[Symbol.dispose]()` verwendet nur synchrone Protokolle. Ein gecachtes Promise oder ein Promise aus gewöhnlichem `.dispose()` ist Fehlgebrauch; keine versteckte Hintergrundfreigabe zur Fehlerkaschierung.
- `registerValue`, `.override()`, Scope-Eingaben, Lazy-Wrapper und transiente Werte bleiben außerhalb der Containerfreigabe, da ihre Verantwortung nie übertragen wurde.

## 3. PR-Prüffragen

Für jeden PR an `packages/inferdi/src`, `packages/inferdi/package.json`, `packages/inferdi/jsr.json` oder Kerntests sind diese Fragen zu beantworten:

1. Bleiben statische Graphengarantien erhalten, oder wandert eine Regel ohne dokumentierte TypeScript-Grenze in Laufzeitprüfungen?
2. Ändert sich das Cachetrefferverhalten von `get()`, die Registrierungsstruktur, Scope-Suche, Lazy-Auflösung oder Konstruktoraufruf? Falls ja: Wo sind die Benchmarks?
3. Fügt der PR Laufzeitabhängigkeiten, Dekoratoren, Metadatenreflexion, Proxy-Auflösung oder Transpileranforderungen zum Kern hinzu?

PR ablehnen, wenn Frage 1 unbegründet statische Regeln abschwächt, Frage 2 ohne Benchmarkbelege bleibt oder Frage 3 mit Ja beantwortet wird.

## 4. Checkliste für besonders sensible Änderungen

Jeder folgende Punkt verlangt eine explizite Begründung im PR.

### Auflösungspfad und Laufzeitstruktur

- [ ] Zusätzliche Arbeit vor `cache.get(key)` in `get()`?
- [ ] Änderungen an `UNDEFINED_MARKER`, `cache`, `regs`, Elternsuche oder `Registration`?
- [ ] Feldreihenfolge `{kind, lazy, fn, owned}` geändert oder `async` davor verschoben?
- [ ] Lokale Registrierungssuche im geprüften Vertrag hinter die Elternsuche verschoben?
- [ ] `Proxy`, `Reflect.get`, `Object.defineProperty` oder Metadatensuche in der Auflösung ergänzt?
- [ ] `get()` asynchron gemacht?
- [ ] Liest `get()` nun `Registration.async` oder prüft Bereitschaft?
- [ ] Explizite Konstruktorzweige für 0–7 Argumente entfernt oder umgebaut?
- [ ] Lesen Fast-Scopes nicht mehr direkt den Besitzer oder spiegeln mehr als delegierte Singletons?

### Typsystem

- [ ] Doppelschlüsselschutz außerhalb von `.override()` abgeschwächt?
- [ ] Öffentliche Schlüsselgrenze von `string | symbol` auf `string` verengt?
- [ ] `AllowedDeps`, `LazySpec`, `AsyncLazySpec`, Async-Propagation, Bereitschaft oder Lebensdauerfilter geschwächt?
- [ ] `NoKeyOverlap`, `ScopeInputMap`, `WithRequirements`, Modulkompatibilität, `SpecMap` oder Namespace-Helfer geändert?
- [ ] Optionale, numerische, breite, unterschiedliche oder kollidierende Eingabeschlüssel erlaubt oder vor Bereitstellung auflösbar?
- [ ] Verbirgt ein Modul fehlende/unpassende Anforderungen oder erlaubt Ausgabekollisionen?
- [ ] Unsicheres `any`, `unknown as` oder `// @ts-ignore` in `src/` ergänzt?
- [ ] Öffentliches Typverhalten ohne positive/negative Typtests, nötige Diagnose-Fixtures und Deklarationsverbrauchertest geändert?

### Abhängigkeiten und Build

- [ ] Laufzeitabhängigkeit in `packages/inferdi/package.json` ergänzt?
- [ ] Peer-Abhängigkeit auf `reflect-metadata`, `tslib` oder Framework-Anbindung ergänzt?
- [ ] Striktes gzip-Budget `< 3 KiB` überschritten oder CI-Prüfung geschwächt?
- [ ] TypeScript-Plugin, Transformer, Dekoratorflag oder Metadatenausgabe erforderlich?

### Lebenszyklus und Freigabe

- [ ] Setzt `dispose()` oder `[Symbol.dispose]()` `_disposed` nicht mehr vor den Disposern?
- [ ] Leeren von `owned`, `cache`, `regs`, `scopeInputs` oder `parent` hinter Disposer verschoben?
- [ ] Trennung vom Elterncontainer entfernt?
- [ ] Erhält Deduplizierung nicht mehr LIFO nach erster Erzeugung?
- [ ] LIFO-Reihenfolge geändert?
- [ ] Reihenfolge `Symbol.asyncDispose` → `Symbol.dispose` → `.dispose()` geändert?
- [ ] Wird nicht mehr auf gecachte Async-Factory-Promises gewartet oder kann dieselbe Ressource doppelt freigegeben werden?
- [ ] Teilen parallele `dispose()`-Aufrufe kein gemeinsames Abschluss-Promise mehr?
- [ ] Werden mehrere Fehler nicht mehr zu `AggregateError`?
- [ ] Meldet synchrone Freigabe keinen asynchronen Fehlgebrauch mehr?

### Ausnahmen und dynamische Nutzung

- [ ] Lokale Cache-Zeitprüfung von `.override()` geschwächt oder Grenzen für transiente und vorfahreneigene Auflösungen verschwiegen?
- [ ] Erhält `.override()` `kind`, `lazy`, `async` nicht mehr, wirkt nichtlokal oder erlaubt Scope-Eingaben?
- [ ] Ist `.has()` ein Resolver geworden oder verändert Caches?
- [ ] Behauptet `.has()` Bereitschaft oder synchrone Auflösbarkeit?
- [ ] Ist der Fast-Baum nach Aktivierung veränderbar oder wurde die Kind-vor-Vorfahren-Freigabe abgeschwächt?
- [ ] Laufzeitkonstruierte Schlüssel zur bevorzugten API gemacht?
- [ ] Auto-Wiring, Auto-Injection, Parameternameninjektion, Dateisystemsuche oder Modulermittlung im Kern ergänzt?

## 5. Bewusste Kompromisse

Diese Entscheidungen dokumentieren, statt sie zu „reparieren“.

| Entscheidung | Grund |
|---|---|
| Kein ES5 oder Ziel vor ES2022 | `Map`, `Symbol`, `WeakRef`, `Reflect.construct` und Freigabesymbole sind grundlegend. Nur fehlende Freigabesymbole werden ergänzt. Node 16+ bleibt Minimum. |
| Keine Dekorator-API | Dekorator-DI wäre eine andere Bibliothek. |
| Keine Laufzeitmetadaten | Konstruktorsignaturen und `deps` liefern den Graphen. Introspektion brächte Abhängigkeiten und schwächere Fehlererkennung. |
| Keine nominale Unterscheidung gleicher Strukturen | `DepsOf` kennt keine semantische Absicht. Nutze Marken in Werten beziehungsweise `unique symbol` für nominale Schlüsselidentität. |
| Kein asynchrones `get()` | `getAsync()` umschließt denselben synchronen Resolver ohne zweite Registrierung, Cache oder Auflösungsbahn. |
| Promise-Werte von `registerFactory` bleiben synchron | Das Promise kann bewusst selbst der Service sein. Nur `registerAsyncFactory` erzeugt `AsyncSpec` und deklarative Async-Propagation. |
| Keine dynamischen Zyklen nach Promise-Grenzen erkennbar | Deklarative Kanten werden synchron vorgeprüft. Zugriffe aus alten Promise-Factories oder Außencontainern nach `await` erfolgen nach Leeren des Stacks. Zyklus trennen oder Initialisierung vorziehen. |
| Keine Laufzeit-Lebensdauerprüfung nach Async-Grenzen | `AllowedDeps` prüft Typen weiter; Casts und Außencontainer nach `await` laufen aber nach Leeren von `singletonStack`. Vollständige Absicherung bräuchte Async-Kontextverfolgung. Lies Abhängigkeiten im synchronen Factory-Anfang. |
| Keine automatische Zyklusauflösung | Zyklen sind Architekturfehler, außer eine Seite ist ein expliziter Lazy-Singleton-Begleiter. InferDI erkennt unterstützte Zyklen, erfindet aber keine Proxys oder Teilinstanzen. |
| Keine generischen `<T>(c: Container<T>) => ...`-Module | Im generischen Rumpf fällt `keyof T` auf die Obergrenze `DependenciesMap`. Nutze Inline-`.use()` oder benannte Module mit Anforderungen. |
| Keine implizite Quelle für Scope-Eingaben | Die Anwendung übergibt Werte explizit an `createScope(inputs)`. Der Kern liest weder Umgebungskontext noch `AsyncLocalStorage`. |
| Keine dynamische DI-Resolver-API | `.has(key)` prüft nur Registrierung. Bereite statische Schlüssel nutzen direkt `.get()` oder `.getAsync()`. |
| Keine Overrides als Produktionsstrategie | `.override()` dient Tests und Hot-Reload-Fixtures; die Zeitprüfung sieht nur den lokalen Cache. Produktionsauswahl gehört in `.use()` oder Builder-Code. |
| Fast-Modus verlangt festen Graphen | Flachere Suche und Singleton-Spiegelung vertrauen auf Topologie-, Lebenszyklus-, Zyklus- und Lebensdauerinvarianten. Der geprüfte veränderbare Vertrag bleibt Standard. |
| Keine kaskadierende Eltern-Kind-Freigabe | Jeder Container besitzt seine Instanzen. Kaskaden würden `dispose()` nichtlokal machen und Scope-Verantwortung verletzen. |
| Keine Hooks oder Middleware bei Auflösung | Das wäre AOP, belastete den häufigen Pfad und verwischte den Kernvertrag. |
| Keine Framework-Anbindung im Kern | Sie gehört in Adapterpakete. Der Kern bleibt unabhängig und ohne Abhängigkeiten. |
| Keine Graphenanalyse im Kern | `@inferdi/graph` ist nur ein Vorschlag im Repository. Künftige Dev-/CI-Begleiter dürfen Produktionsauflösung und Registrierungsstruktur nicht verändern. |

## 6. Keine Projektziele

InferDI wird nicht zu:

- einem universellen IoC-Framework
- einem Dekorator- oder Reflection-Container
- einem Request-Kontextsystem oder Ersatz für `AsyncLocalStorage`
- einem Auto-Wiring-Scanner
- einer Provider-DSL oder Laufzeit-Modulerkennung
- einer Graphenanalyse-, Regel-, Berichts- oder Snapshot-Engine im Produktionskern
- einem Plugin-Host für Auflösungsmiddleware
- einer Kompatibilitätsschicht für ältere DI-Container

Es gilt: Der Graph ist der Typ, und der Typ ist der Vertrag.

