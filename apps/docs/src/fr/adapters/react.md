# Intégration React

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) fournit des contextes et hooks React 19 pour les types exacts de conteneurs InferDI. Il gère aussi les scopes enfants créés côté client sans construire de ressources pendant le rendu.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

React `19.2.8` ou une version plus récente de la branche 19 est requis. L’adaptateur n’importe pas `react-dom` : l’application garde le choix de son moteur de rendu.

## Lier un type exact de conteneur

Déclare les liaisons au niveau du module. Chaque appel possède son contexte React et un état de graphe InferDI exact.

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

Une liaison pour une racine dont certaines entrées manquent ne peut pas accepter un scope enfant affiné. Crée une liaison distincte à partir du type de retour exact de la fonction qui fournit ces entrées.

## Providers externes

`Provider` expose un conteneur appartenant à l’appelant et ne le libère jamais. Utilise-le pour les racines d’application, scopes de requête créés sur le serveur et fixtures de test.

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

Remplacer `container` suit la sémantique habituelle du contexte React. Les providers imbriqués sélectionnent le conteneur le plus proche. Le code de démarrage ou de requête gère la libération après le démontage ou la fin du flux.

## Scopes enfants gérés

Crée une liaison gérée à partir de celle du parent. `ScopeProvider` crée l’enfant dans un Effect après le commit, l’expose après le setup facultatif et exécute toujours sa libération configurée.

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

Il n’existe pas d’option pour désactiver cette libération. Si le travail doit survivre au composant, crée et gère le scope hors de React et passe-le à `Provider`.

## Hooks de services et Suspense

`useService` accepte les clés synchrones prêtes de durée de vie singleton ou scoped. `useAsyncService` et `useAsyncServices` acceptent les clés prêtes asynchrones déclaratives ou mixtes et transmettent des promesses stables en cache à `use` de React.

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

Le hook de tuple démarre tous les services avant la première suspension. Les rejets atteignent l’Error Boundary la plus proche. Les clés transient sont refusées : les tentatives de rendu pourraient allouer des instances dont React ne peut pas gérer la responsabilité. Résous-les plutôt dans un événement ou un Effect.

## Identité et libération

L’objet conteneur parent et `scopeKey` définissent une génération gérée. `input` est un instantané des données lu au démarrage réel de cette génération. Modifier seulement `input` ne recrée ni ne met à jour le scope.

Changer `scopeKey` sur le même provider affiche immédiatement le fallback, attend la fin de l’ancien setup et de sa libération, puis crée le remplacement. La propriété spéciale `key` de React remonte le composant et crée un domaine indépendant de coordination séquentielle.

Les descendants gérés terminent leur libération avant leur ancêtre géré. Le propriétaire d’un parent externe doit maintenir son conteneur en vie jusqu’à la fin de sa propre coordination d’arrêt des enfants. Un hook de setup, de libération ou d’erreur qui ne se termine jamais maintient les générations suivantes sur le fallback.

## Strict Mode et Activity

L’adaptateur ne crée aucun scope pendant le rendu, l’initialisation différée d’un état ou l’évaluation d’un module. La répétition des Effects en Strict Mode crée des générations distinctes et attend la libération de la première avant de créer la seconde.

Masquer avec React `Activity` déconnecte les Effects et termine la génération gérée, même si React conserve l’état du composant. La réapparition crée une nouvelle génération. Place un `Provider` externe hors de cette limite si le scope doit survivre au masquage.

## Rendu serveur

Les Effects gérés ne s’exécutent pas sur le serveur. `ScopeProvider` affiche son fallback côté serveur et pendant le premier rendu d’hydratation, puis crée le scope après le commit client.

Pour un SSR classique complet, laisse le gestionnaire HTTP posséder un scope de requête affiné exact :

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

L’intégration HTTP doit interrompre le rendu si nécessaire et libérer le scope après la fin du flux ou une déconnexion. Les conteneurs ne sont pas sérialisés dans le HTML. Les React Server Components et les utilitaires de cycle de vie propres à Next.js ne font pas partie de ce paquet.

## Erreurs

Un échec courant de création ou de setup atteint l’Error Boundary la plus proche. Un échec du setup libère d’abord le scope partiellement construit et reste l’erreur exposée si la libération échoue aussi. Les erreurs de libération vont à `onDisposeError`, ou à `console.error` sans gestionnaire. Les erreurs de setup devenues obsolètes sont journalisées, car aucune boundary active ne peut plus les recevoir.

