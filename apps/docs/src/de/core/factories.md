# Services mit Factories erstellen

Nutze `registerClass`, wenn die Konstruktion genau `new Ctor(...deps)` entspricht. `registerFactory` eignet sich für Konfiguration, Drittanbieter-APIs, Interface-Bindungen oder andere explizite Initialisierungslogik.

```ts
const container = new Container()
  .registerValue('config', {
    dsn: 'postgres://localhost/app',
    poolSize: 10
  })
  .registerFactory('pool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepository, ['pool'])
```

Der Rückgabetyp wird zum registrierten Servicetyp.

## Factories mit Containerzugriff

Der einfache Callback erhält einen nach Lebensdauer gefilterten Container. Eine Singleton-Factory kann nur Abhängigkeiten auflösen, die für Singletons zulässig sind; scoped und transiente Schlüssel weist TypeScript zurück.

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

Diese Form eignet sich für bedingte oder mehrstufige Auflösung. Führe alle `.get()`-Aufrufe synchron aus. Soll eine asynchrone Initialisierung durch den Graphen weitergegeben werden, nutze `registerAsyncFactory`.

## Deklarierte Factory-Abhängigkeiten

Die Überladung mit `deps` macht Anforderungen im Graphen sichtbar und beschränkt den Resolver des Callbacks auf diese Schlüssel:

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('logger', Logger, [])
  .registerFactory(
    'requestLog',
    (deps) => new RequestLog(
      deps.get('request'),
      deps.get('logger')
    ),
    ['request', 'logger'],
    'scoped'
  )
```

Deklarierte Abhängigkeiten geben Scope-Eingaben und Lebensdaueranforderungen durch Module und weitere Registrierungen weiter. Anders als bei `registerAsyncFactory` erhält der Callback einen Resolver, keine positionsgebundenen Werte.

## Lebensdauern von Factories

Factories verwenden dieselben Lebensdauern wie Klassen:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

Singleton- und scoped Ergebnisse werden gecacht und gehören ihrem Container. Transiente Ergebnisse werden von InferDI weder gecacht noch freigegeben.

Mit einem vierten Argument `lazyKey` entsteht eine Lazy-Begleitregistrierung mit derselben Lebensdauer:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

Eine Begleitregistrierung erfordert eine explizite Lebensdauer, auch bei `'singleton'`. Die Regeln stehen unter [Lazy Injection](./lazy-injection).

## Interfaces binden

Interfaces besitzen zur Laufzeit keinen Konstruktor. Gib der Factory einen expliziten Servicetyp, wenn Verbraucher von einer Abstraktion abhängen sollen:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>(
    'mailer',
    () => new SendGridMailer()
  )
```

Verbraucher von `mailer` sehen nun `Mailer` statt `SendGridMailer`.

## Den Promise-Vertrag wählen

Ein von `registerFactory` zurückgegebenes Promise ist selbst der Servicewert: `.get()` liefert `Promise<T>`, und abhängige Factories erhalten dasselbe Promise. Nutze dies nur, wenn das Promise zum synchronen Graphen gehören soll.

Verwende `registerAsyncFactory`, wenn `T` der Service ist und das Promise dessen Initialisierung darstellt. Diese Form propagiert den Async-Status und wird mit `.getAsync()` aufgelöst. [Asynchrone Abhängigkeiten](./async-dependencies) beschreibt beide Verträge, Caching, Lazy-Begleiter, Fehler und Freigabe.
