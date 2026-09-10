# Scope-Eingaben

Scope-Eingaben sind Werte, die der Code beim Öffnen eines Scopes bereitstellt: HTTP-Anfrage, angemeldeter Benutzer, Mandant, Jobdaten oder Trace-Kontext. InferDI trägt diese Anforderungen durch den Graphen und verhindert die Auflösung abhängiger Services, solange ihre Eingaben fehlen.

## Eingaben deklarieren

`declareScopeInputs()` ergänzt Schlüssel ausschließlich im Typgraphen. Es erzeugt weder Laufzeitregistrierungen noch Werte.

```ts
interface RequestContext {
  requestId: string
}

interface AuthContext {
  userId: string
}

class PublicService {
  constructor(readonly request: RequestContext) {}
}

class AccountService {
  constructor(
    readonly request: RequestContext,
    readonly auth: AuthContext
  ) {}
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass(
    'accountService',
    AccountService,
    ['request', 'auth'],
    'scoped'
  )
```

Scope-Eingaben haben die Lebensdauer scoped. Ein Singleton darf nicht davon abhängen; der Compiler lehnt daher für beide gezeigten Services eine weggelassene oder explizite `'singleton'`-Lebensdauer ab.

## Typisierte Profile öffnen

`createScope(inputs)` akzeptiert beliebige Teilmengen fehlender Eingaben. Der zurückgegebene Containertyp hält fest, welche Anforderungen nun erfüllt sind.

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: auth has not been provided
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')
```

Gib den Profilen deiner Anwendung über Funktionen einen Namen. Deren abgeleitete Rückgabetypen erhalten die exakte Menge bereiter Schlüssel ohne manuelle Containerannotationen.

```ts
const openPublicScope = (request: RequestContext) =>
  root.createScope({request})

const openAuthenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})

type PublicScope = ReturnType<typeof openPublicScope>
type AuthenticatedScope = ReturnType<typeof openAuthenticatedScope>
```

Öffne das Profil an der Grenze einer Anfrage, Nachricht oder eines Jobs. Halte den Root-Graphen unabhängig von Framework-Objekten.

## Anforderungen folgen dem Graphen

InferDI propagiert Eingabeanforderungen durch Klassen, Lazy-Begleiter, synchrone Factories mit `deps` und deklarative asynchrone Factories.

```ts
const app = root
  .registerFactory(
    'requestId',
    (c) => c.get('request').requestId,
    ['request'],
    'scoped'
  )
  .registerAsyncFactory(
    'session',
    async (auth: AuthContext) => loadSession(auth.userId),
    ['auth'],
    'scoped'
  )
```

Das Abhängigkeitstupel der `registerFactory`-Überladung mit `deps` deklariert Kanten im Typsystem und beschränkt den Callback auf einen Resolver für diese Schlüssel. Der Callback erhält weiterhin diesen Resolver. `registerAsyncFactory` funktioniert anders: Es löst das Tupel auf und übergibt dem Callback die Werte positionsweise.

Auch die Argumentreihenfolge unterscheidet sich:

```ts
registerFactory(key, factory, deps, lifetime)
registerAsyncFactory(key, factory, deps, lifetime)
```

## Verantwortung bei verschachtelten Scopes

Ein Kind erbt Eingabewerte und erstellt eigene scoped Instanzen. Die Eingabewerte bleiben anwendungseigen und werden vom Container nicht freigegeben.

```ts
await using publicScope = openPublicScope(request)
await using authenticatedScope = publicScope.createScope({auth})

await authenticatedScope.getAsync('session')
```

JavaScript gibt diese Deklarationen in umgekehrter Reihenfolge frei; das verfeinerte Kind wird vor seinem Eltern-Scope geschlossen. `root.dispose()` schließt keinen der beiden Scopes.

## Wiederverwendbare Typverträge

`ScopeInputMap` beschreibt Eingaben eines benannten `Module`. `WithRequirements` fügt einem Modulergebnis Eingabeanforderungen hinzu.

```ts
import {
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '@inferdi/inferdi'

type RequestInputs = ScopeInputMap<{
  request: RequestContext
  auth: AuthContext
}>

type RequestServices = {
  accountService: WithRequirements<
    Spec<AccountService, 'scoped'>,
    'request' | 'auth'
  >
}
```

Auch generische Helfer müssen die Bereitschaft erhalten:

```ts
function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.get(key)
}

function resolveAny<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K) {
  return container.getAsync(key)
}
```

## Eingabevertrag

- Deklarationen erfordern endliche, verpflichtende String- oder Symbolschlüssel. Optionale und numerische Schlüssel, `__proto__`, breite Indexsignaturen und Unions mit unterschiedlichen Schlüsselmengen werden abgelehnt.
- Ein vorhandenes Pflichtfeld mit Wert `undefined` gilt als bereitgestellt. Entscheidend ist die Existenz der Eigenschaft, nicht ihr Wahrheitswert.
- `createScope(inputs)` erstellt eine flache Momentaufnahme aufzählbarer eigener String- und Symboleigenschaften. Getter und Proxy-Traps werden dabei ausgeführt; übergib daher ein passives Datenobjekt.
- Das Eingabeschema existiert nur in TypeScript. JavaScript, `any` oder Casts können unbekannte Schlüssel hinzufügen oder eine Registrierung im Kind-Cache überschatten.
- `{fast: true}` unterstützt Eingabeverfeinerung, behält aber seinen festen Graphen: Beende Registrierungen vor dem ersten `.get()` oder `.createScope()`.

[Scopes und Freigabe](./scopes) erläutert die Ressourcenverantwortung, [Asynchrone Abhängigkeiten](./async-dependencies) behandelt asynchrone Services mit Scope-Eingaben.

## Compilerprüfung

Derselbe Graph erhält weitere bereite Schlüssel, sobald die Eingabe bereitgestellt wird:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Handler {
  constructor(readonly request: RequestContext) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('handler', Handler, ['request'], 'scoped')

root.get('handler') // [!code error]

const scope = root.createScope({ request: { requestId: 'req-1' } })
const handler = scope.get('handler')
//    ^?
```

