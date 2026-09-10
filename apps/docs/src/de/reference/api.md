# API-Übersicht

Diese Seite fasst die öffentliche Kern-API zusammen. Die exakten generischen Definitionen stehen in der Paket-README und den TypeScript-Deklarationen.

## Container

```ts
import {
  Container,
  type ContainerOptions,
  type DependenciesMap,
  type Lazy,
  type AsyncLazy,
  type LazySpec,
  type AsyncLazySpec,
  type AsyncSpec,
  type Module,
  type Lifetime,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '@inferdi/inferdi'
```

```ts
class Container<T extends DependenciesMap = Record<never, never>> {
  constructor(options?: ContainerOptions)

  declareScopeInputs<Inputs>()
  registerClass(key, Ctor, deps, lifetime?, lazyKey?)
  registerFactory(key, factory, lifetime?)
  registerFactory(key, factory, lifetime, lazyKey)
  registerFactory(key, factory, deps, lifetime?)
  registerFactory(key, factory, deps, lifetime, lazyKey)
  registerAsyncFactory(key, factory, deps, lifetime?, lazyKey?)
  registerValue(key, value)
  override(key, value)
  use(fn)

  createScope(inputs?)
  get(syncReadyKey)
  getAsync(readyKey): Promise
  has(key): key is keyof T

  get disposed(): boolean
  dispose(): Promise<void>
  [Symbol.dispose](): void
  [Symbol.asyncDispose](): Promise<void>
}
```

## Containeroptionen {#container-options}

Der Konstruktor akzeptiert eine optionale Einstellung:

| Option | Typ | Standard | Zweck |
|---|---|---|---|
| `fast` | `boolean` | `false` | Wählt den geprüften veränderbaren oder den ungeprüften festen Graphenvertrag |

```ts
const checked = new Container()
const explicitChecked = new Container({ fast: false })
const fast = new Container({ fast: true })
```

Standard und explizites `false` behalten Laufzeitprüfungen für Zyklen und Lebensdauern, verbieten scoped Auflösung aus dem Root und bewahren die exakte veränderbare Elternkette. Nutze diesen Vertrag für Entwicklung, Tests, Hot Reload und Graphen, die sich nach dem Start ändern können.

Das Literal `{fast: true}` erhält alle Compilerprüfungen, deaktiviert aber die Laufzeitbuchführung für Zyklen und Lebensdauern einschließlich der Root-Scope-Prüfung. Es setzt einen festen Containerbaum voraus, sucht direkt beim Registrierungsbesitzer und spiegelt delegierte Singletons in lokale Scope-Caches. Kind-Scopes erben die Root-Konfiguration.

In einem Fast-Baum müssen alle `register*`-, `.use()`- und `.override()`-Aufrufe vor der ersten Auflösung oder `createScope()` abgeschlossen sein. Ändere den aktivierten Baum nicht und gib Kinder vor Vorfahren frei. Nur der literale Wert `true` aktiviert diesen Vertrag; andere Laufzeitwerte fallen auf den geprüften Vertrag zurück. [Performance](../guide/performance#fast-true) erläutert Nutzen und Kosten.

## Registrierungsmethoden

| Methode | Callback-Eingabe | Graphentyp | Auflösung |
|---|---|---|---|
| `registerClass` | Konstruktorargumente aus `deps` | `Spec` oder propagierter `AsyncSpec` | `get` oder `getAsync` |
| `registerFactory(key, factory, ...)` | nach Lebensdauer gefilterter Container | `Spec<ReturnType>` | `get` |
| `registerFactory(key, factory, deps, ...)` | auf `deps` beschränkter Resolver | `Spec` mit Anforderungen | `get` |
| `registerAsyncFactory` | positionsgebundene Werte; deklarative Async-Abhängigkeiten werden abgewartet | `AsyncSpec<Awaited<ReturnType>>` | `getAsync` |
| `registerValue` | keine | extern verwalteter Singleton-`Spec` | `get` |

`registerClass`, `registerFactory` und `registerAsyncFactory` akzeptieren `singleton`, `scoped` und `transient`. Ein Begleiter von `registerFactory` erfordert eine explizite Lebensdauer, auch bei `'singleton'`. `registerValue` ist stets Singleton und bleibt extern verwaltet.

Ein `lazyKey` bei `registerClass` oder `registerFactory` ergänzt einen verwalteten `LazySpec`. Bei asynchron propagierten Klassen entsteht stattdessen `AsyncLazySpec`. Ein Promise-Wert von `registerFactory` bleibt synchroner `Spec<Promise<T>>`, sein Begleiter bleibt `Lazy<Promise<T>>`. Soll der Graph den fertigen Servicetyp speichern, nutze `registerAsyncFactory`.

`registerAsyncFactory` akzeptiert dieselben Lebensdauern und optional ein fünftes Argument `lazyKey`. Es speichert den fertigen Servicetyp als `AsyncSpec`; der Begleiter ist `AsyncLazySpec<Awaited<ReturnType>, L>`. Abhängige Klassen übernehmen den Async-Status des Ziels; Verbraucher des Wrappers bleiben synchron. Nutze `getAsync()` für das Ziel und `get()` für den Wrapper.

`registerAsyncFactory` und `registerClass` mit möglicherweise asynchronen Schlüsseln verlangen readonly Abhängigkeitstupel. InferDI klassifiziert asynchrone Positionen einmal und behält die Tupelreferenz. Inline-Literale ergeben readonly Tupel; rein synchrone `registerClass`-Aufrufe bleiben mit veränderbaren Tupeln kompatibel.

`registerFactory` mit `deps` und `registerAsyncFactory` verwenden dieselbe Argumentreihenfolge, aber verschiedene Callback-Verträge: Die erste Form liefert einen auf `deps` beschränkten Resolver, die zweite positionsgebundene Werte.

```ts
registerFactory(key, resolverFactory, deps, lifetime, lazyKey)
registerAsyncFactory(key, valueFactory, deps, lifetime, lazyKey)
```

`override` ersetzt eine vorhandene Registrierung, die keine Scope-Eingabe ist; `use` wendet einen Modul-Builder an. Die zeitliche Schutzprüfung von `override` sieht nur den lokalen Cache: lokale Singletons und scoped Werte, `registerValue` und wiederholte Overrides. Transiente Auflösungen erfasst sie nie. Im geprüften Modus erfasst sie auch keine Singletons von Vorfahren, die über ein Kind aufgelöst wurden. Ein Fast-Kind spiegelt diese dagegen lokal, sodass die Prüfung sie erkennt. Wende Overrides vor der Auflösung des Graphen an.

## Scope-Eingaben und Auflösung

`declareScopeInputs<Inputs>()` ergänzt rein typseitige scoped Einträge. `createScope(inputs)` liefert beliebige Teilmengen fehlender Werte; der zurückgegebene Typ berücksichtigt die bereitgestellten Pflichtfelder. Eingabewerte bleiben anwendungseigen.

| API | Zulässige Schlüssel |
|---|---|
| `get()` | bereite Schlüssel ohne `AsyncSpec` |
| `getAsync()` | alle bereiten synchronen und deklarativ asynchronen Schlüssel |
| `has()` | beliebige Strings oder Symbole; bestätigt nur die Registrierung |

`has()` beweist weder Bereitschaft noch Synchronität. Deklarierte Scope-Eingaben sind keine Registrierungen: `has()` liefert für sie auch dann `false`, wenn `createScope(inputs)` ihren Wert bereitgestellt hat. Siehe [Scope-Eingaben](../core/scope-inputs) und [Asynchrone Abhängigkeiten](../core/async-dependencies).

## Namespace-Typen

```ts
namespace Container {
  type ReadyKeys<C>
  type SyncReadyKeys<C>
  type Resolve<C>
  type ResolveUnwrapped<C>
  type UnwrappedValue<C, K>
  type Providers<C>
}
```

| Typ | Verwendung |
|---|---|
| `Container.ReadyKeys<C>` | Schlüssel mit erfüllten Scope-Anforderungen; für generische Aufrufe von `getAsync`. |
| `Container.SyncReadyKeys<C>` | Bereite nichtasynchrone Schlüssel für generische Aufrufe von `get`. |
| `Container.Resolve<C>` | Flache Abbildung `{ key: Value }` eines fertigen Containers. |
| `Container.ResolveUnwrapped<C>` | Wie `Resolve`, entpackt verwaltete `LazySpec`- und `AsyncLazySpec`-Einträge distributiv zu `T`; unverwaltete Wrapper bleiben unverändert. |
| `Container.UnwrappedValue<C, K>` | Ein einzelner entpackter Servicetyp. |
| `Container.Providers<C>` | Abbildung auf Provider-Funktionen für Tests; deklarierte Scope-Eingaben sind ausgeschlossen. |

Generische v6-Resolver müssen die erlaubte Schlüsselmenge erhalten. Nutze `Container.SyncReadyKeys<C>` mit `get()` und `Container.ReadyKeys<C>` mit `getAsync()` statt unbeschränktem `keyof T`.

## Öffentliche Typen

```ts
type Lazy<T> = { readonly get: () => T }
type AsyncLazy<T> = { readonly get: () => Promise<T> }
type Lifetime = 'singleton' | 'scoped' | 'transient'
type DependenciesMap = Record<
  string | symbol,
  Spec<unknown, Lifetime>
>

interface ContainerOptions {
  readonly fast?: boolean
}

interface Spec<V, L extends Lifetime = 'singleton'> {
  readonly type: V
  readonly lifetime: L
}

interface AsyncSpec<V, L extends Lifetime = 'singleton'>
  extends Spec<V, L> {
  readonly async: true
}

interface LazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

interface AsyncLazySpec<V, TargetLifetime extends Lifetime>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetLifetime
}

type SpecMap<M, L extends Lifetime = 'singleton'> = {
  [P in keyof M]: Spec<M[P], L>
}

type Module<TRequirements extends DependenciesMap, TProvides extends DependenciesMap> =
  (c: Container<TRequirements>) => Container<TRequirements & TProvides>
```

`LazySpec` und `AsyncLazySpec` tragen in den veröffentlichten Deklarationen einen privaten, rein typseitigen Modus-Diskriminanten. Verwende diese benannten Interfaces für verwaltete Begleiter in expliziten `Container`- und `Module`-Typen. Der Diskriminant hat kein Laufzeitfeld und wird nicht exportiert.

`Spec`, `AsyncSpec`, `LazySpec` und `AsyncLazySpec` beschreiben Einträge des Typgraphen. Ihre Felder werden aufgelösten Servicewerten nicht als Eigenschaften hinzugefügt.

`ScopeInputMap<M>` bildet endliche verpflichtende String- und Symboleigenschaften auf scoped Eingaben ab. Es verbietet optionale oder numerische Schlüssel, `__proto__`, breite Indexsignaturen und Unions unterschiedlicher Schlüsselmengen. `WithRequirements<S, K>` ergänzt benötigte Eingabeschlüssel an einem Grapheneintrag, etwa in benannten Modulausgaben. Die genauen bedingten Typdefinitionen stehen in den veröffentlichten Deklarationen.

## Adapter-APIs

### HTTP-Adapter

Fastify, Hono, Koa, Express und Elysia exportieren:

- die Integrationsfunktion, etwa `inferdiFastify`
- `skipInferdiDispose`
- `MaybePromise`
- die strukturellen Helfertypen `InferdiScope`, `InferdiRoot` und `InferdiScopeOf`
- frameworkspezifische Options- und Kontexttypen

### React-Adapter

React exportiert `inferdiReact` sowie Typen für Bindings, den externen `Provider`, den verwalteten `ScopeProvider`, Service-Hooks, Graphenextraktion, stabile Sync-/Async-Schlüssel und Scope-Lebenszyklusoptionen. Es exportiert kein `skipInferdiDispose`: Komponenten-Scopes folgen React-Commits und Effect-Freigaben statt HTTP-Anfragen.

Die Adapterseiten nennen die exakten Namen und Lebenszyklusdetails.
