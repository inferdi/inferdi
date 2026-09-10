# React-Integration

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) stellt React-19-Kontexte und Hooks für exakte InferDI-Containertypen bereit. Außerdem verwaltet es clientseitig erstellte Kind-Scopes, ohne während des Renderns Ressourcen anzulegen.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

Erforderlich ist React `19.2.8` oder neuer innerhalb der React-19-Reihe. Der Adapter importiert `react-dom` nicht; die Anwendung wählt ihren Renderer selbst.

## Einen exakten Containertyp binden

Deklariere Bindings auf Modulebene. Jeder Aufruf erzeugt einen eigenen React-Kontext für genau einen InferDI-Graphenzustand.

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

Ein Binding für einen Root mit fehlenden Scope-Eingaben akzeptiert keinen verfeinerten Kind-Scope. Erzeuge dafür ein eigenes Binding aus dem exakten Rückgabetyp der Funktion, die diese Eingaben bereitstellt.

## Externe Provider

`Provider` stellt einen vom Aufrufer verwalteten Container bereit und gibt ihn nie frei. Nutze ihn für Anwendungsroots, serverseitig erstellte Request-Scopes und Test-Fixtures.

```tsx
createRoot(document.getElementById('root')!).render(
  <AppDI.Provider container={root}>
    <App />
  </AppDI.Provider>
)

function UserMenu() {
  const session = AppDI.useService('session')
  return <span>{session.user.name}</span>
}
```

Ein Austausch von `container` folgt der normalen React-Kontextsemantik. Verschachtelte Provider wählen den nächstgelegenen Container. Bootstrap- oder Request-Code ist nach Unmount oder Stream-Ende für die Freigabe zuständig.

## Verwaltete Kind-Scopes

Erzeuge ein verwaltetes Binding aus seinem Eltern-Binding. `ScopeProvider` erstellt das Kind in einem Effect nach dem Commit, veröffentlicht es nach optionalem Setup und führt immer die konfigurierte Freigabe aus.

```tsx
type ScopeInput = {
  request: RequestContext
}

const RequestDI = AppDI.createScope({
  createScope: (parent, input: ScopeInput) => parent.createScope(input),
  setupScope: async (scope) => {
    await scope.getAsync('requestSession')
  },
  onDisposeError: (error, _scope, input) => {
    reportCleanupError(error, input.request.id)
  }
})

function RequestArea({request}: {request: RequestContext}) {
  return (
    <RequestDI.ScopeProvider
      input={{request}}
      scopeKey={request.id}
      fallback={<RequestSkeleton />}
    >
      <RequestScreen />
    </RequestDI.ScopeProvider>
  )
}
```

Die Freigabe lässt sich nicht abschalten. Muss Arbeit die Komponente überleben, erstelle und verwalte den Scope außerhalb von React und übergib ihn an `Provider`.

## Service-Hooks und Suspense

`useService` akzeptiert bereite synchrone Singleton- und scoped Schlüssel. `useAsyncService` und `useAsyncServices` akzeptieren bereite deklarativ asynchrone oder gemischte Sync-/Async-Schlüssel und übergeben stabile gecachte Promises an React `use`.

```tsx
function RequestScreen() {
  const [session, repository] = RequestDI.useAsyncServices(
    'requestSession',
    'repository'
  )

  return <Dashboard session={session} repository={repository} />
}

<AppErrorBoundary>
  <Suspense fallback={<Loading />}>
    <RequestArea request={request} />
  </Suspense>
</AppErrorBoundary>
```

Der Tupel-Hook startet alle Services vor der ersten Suspendierung. Abgelehnte Services erreichen die nächste Error Boundary. Transiente Schlüssel sind ausgeschlossen, da Render-Wiederholungen Instanzen anlegen könnten, die React nicht verwalten kann. Löse sie stattdessen in einem Event oder Effect auf.

## Identität und Freigabe

Das Elterncontainer-Objekt und `scopeKey` bestimmen eine verwaltete Generation. `input` wird als Nutzdaten-Momentaufnahme gelesen, wenn diese Generation tatsächlich startet. Eine Änderung nur an `input` aktualisiert oder erneuert den Scope nicht.

Eine Änderung von `scopeKey` am selben Provider zeigt sofort den Fallback, wartet auf Abschluss des bisherigen Setups und der Freigabe und erstellt dann den Ersatz. Reacts spezielles `key` mountet die Komponente neu und erzeugt einen unabhängigen Bereich für die serielle Lebenszykluskoordination.

Verwaltete Nachfahren schließen ihre Freigabe vor ihrem verwalteten Vorfahren ab. Bei einem extern verwalteten Elterncontainer muss dessen Besitzer ihn bis zum Abschluss seiner eigenen Koordination der Kind-Freigaben am Leben halten. Ein Setup-, Freigabe- oder Fehlerhook, der nie abschließt, lässt spätere Generationen beim Fallback warten.

## Strict Mode und Activity

Der Adapter erstellt keine Scopes beim Rendern, in verzögerter State-Initialisierung oder bei Modulevaluierung. Das Wiederholen von Effects im Strict Mode erzeugt getrennte Generationen und wartet auf die Freigabe der ersten, bevor die zweite entsteht.

Das Verbergen über React `Activity` trennt Effects und beendet die verwaltete Generation, obwohl React den Komponentenzustand behält. Beim Anzeigen entsteht eine neue Generation. Soll der Scope das Verbergen überleben, platziere einen externen `Provider` außerhalb dieser Grenze.

## Server-Rendering

Verwaltete Effects laufen auf dem Server nicht. `ScopeProvider` zeigt serverseitig und beim ersten Hydrationsrender den Fallback und erstellt den Scope erst nach dem Client-Commit.

Für vollständiges klassisches SSR sollte der HTTP-Handler einen exakt verfeinerten Request-Scope verwalten:

```tsx
function createRequestScope(request: RequestContext) {
  return root.createScope({request})
}

type RequestContainer = ReturnType<typeof createRequestScope>
const RequestDI = inferdiReact<RequestContainer>()

renderToPipeableStream(
  <RequestDI.Provider container={scope}>
    <App />
  </RequestDI.Provider>,
  streamOptions
)
```

Die HTTP-Integration muss das Rendering bei Bedarf abbrechen und den Scope nach Stream-Ende oder Verbindungsabbruch freigeben. Container werden nicht in HTML serialisiert. React Server Components und Next.js-spezifische Lebenszyklushilfen gehören nicht zu diesem Paket.

## Fehler

Aktuelle Fehler beim Erstellen oder Setup erreichen die nächste Error Boundary. Bei Setup-Fehlern wird zuerst der halb aufgebaute Scope freigegeben; auch wenn das scheitert, bleibt der Setup-Fehler der sichtbare Fehler. Freigabefehler gehen an `onDisposeError`, andernfalls an `console.error`. Veraltete Setup-Fehler werden protokolliert, weil keine aktive Boundary mehr dafür existiert.

