# Module

Mit `.use()` lässt sich ein großer Container-Builder in kleinere Teile zerlegen, ohne die Typinferenz entlang der Aufrufkette zu verlieren.

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

Inline-Lambdas sind die einfachste Form. Ihr Containertyp wird am Aufrufort abgeleitet und kennt die zuvor registrierten Schlüssel.

## Benannte Module

Wiederverwendbare Module deklarieren mit `Module<TRequirements, TProvides>` nur ihre Anforderungen und Ergebnisse. Zusätzliche Registrierungen des tatsächlichen Graphen bleiben erhalten.

```ts
import {
  Container,
  type Module,
  type SpecMap
} from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Requirements, Provides> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

const app = new Container()
  .registerValue('config', { env: 'test' })
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

Der Callback sieht ausschließlich `Container<TRequirements>`. Anforderungen müssen bezüglich Servicetyp, exakter Lebensdauer, Sync-/Async-Modus, verwaltetem Lazy-Modus und Bereitschaft der Scope-Eingaben passen. Ausgaben dürfen mit keinem tatsächlichen Schlüssel kollidieren. Fehlende oder unpassende Anforderungen sowie Kollisionen erzeugen benannte Diagnosen.

## Dynamische Imports

Nutze `import()`, wenn ein optionales oder routenspezifisches Modul in einem separaten JavaScript-Chunk geladen werden soll.

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

Die Laufzeit lädt und evaluiert `reports.module`, bevor `.use()` ausgeführt wird. Danach führt `.use()` das Modul synchron aus, fügt Registrierungen hinzu und liefert den abgeleiteten Containertyp. Ein dynamischer Import macht die Services nicht asynchron; dafür ist `registerAsyncFactory` zuständig.

Im Browser eignet sich dies an Routen- oder Feature-Grenzen, sofern der Bundler einen separaten Chunk erzeugt, der nirgendwo statisch importiert wird. Baue den Feature-Container erst nach dem Laden auf. Auf dem Server sind statische Imports beim normalen Start meist passender. Dynamische Imports helfen bei optionalen Deployment-Features oder Serverless-Pfaden, deren Kaltstart keine ungenutzten Abhängigkeiten laden soll. In beiden Fällen muss die Zusammensetzung vor der ersten Auflösung oder `createScope()` abgeschlossen sein; verändere den Anwendungscontainer nicht je Anfrage.

Prüfe zur Laufzeit gewählte Schlüssel vor der Auflösung mit dem [`.has()`-Type-Guard](./type-safety#dynamic-keys).

## Compilerprüfung

Ein benanntes Modul lässt sich erst installieren, wenn seine deklarierten Anforderungen erfüllt sind:

```ts twoslash
// @errors: 2345
import { Container, type Module, type SpecMap } from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ feature: string }>

const addFeature: Module<Requirements, Provides> = (container) =>
  container.registerFactory('feature', (c) => c.get('config').env, ['config'])

new Container().use(addFeature) // [!code error]

const app = new Container()
  .registerValue('config', { env: 'test' })
  .use(addFeature)

const feature = app.get('feature')
//    ^?
```

