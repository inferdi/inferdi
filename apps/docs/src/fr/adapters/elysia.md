# Adaptateur Elysia

[`@inferdi/elysia`](https://github.com/inferdi/inferdi/tree/main/packages/elysia) est un plugin Elysia v1. En mode scoped, il crée un scope de requête, l’expose dans le contexte Elysia, le laisse disponible pour les gestionnaires d’erreurs et le libère via `onAfterResponse`.

## Installation

```bash
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

```ts
import { Elysia } from 'elysia'
import { Container } from '@inferdi/inferdi'
import { inferdiElysia } from '@inferdi/elysia'
```

## Scope de requête

```ts
type RequestContext = {
  requestId: string
  userId?: string
}

class Users {
  constructor(readonly request: RequestContext) {}

  profile(id: string) {
    return { id, userId: this.request.userId }
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('users', Users, ['request'], 'scoped')

const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    createScope: (_root, { request }) => root.createScope({
      request: {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      }
    })
  }))
  .get('/users/:id', ({ di, params }) =>
    di.get('users').profile(params.id),
  )
```

Pour une clé de contexte personnalisée :

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    key: 'container',
    createScope: (_root, { request }) => root.createScope({
      request: {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      }
    })
  }))
  .get('/users/:id', ({ container, params }) =>
    container.get('users').profile(params.id),
  )
```

Enregistre les routes après `.use(inferdiElysia(...))` dans la chaîne Elysia typée.

## Options

| Option | Valeur par défaut | Description |
|---|---|---|
| `container` | obligatoire | Conteneur racine. |
| `key` | `'di'` | Clé dans le contexte du framework. |
| `scopePerRequest` | `true` | Avec `false`, expose uniquement la racine. |
| `createScope` | `root.createScope()` | Création personnalisée du scope de requête. |
| `setupScope` | aucune | Après la création et avant la validation. |
| `setupValidatedScope` | aucune | Après la validation Elysia. |
| `disposeScope` | `scope.dispose()` | Libération personnalisée. |
| `autoDispose` | `true` | `false`, ou un prédicat renvoyant `false`, transfère la responsabilité à l’application. |
| `onDisposeError` | `console.error` | Destinataire des erreurs de libération. |

## Mode racine seule

```ts
const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    scopePerRequest: false,
  }))
  .get('/health', ({ di }) => di.get('health').check())
```

Ce mode expose la racine sans installer de hooks de cycle de vie des scopes de requête. Les options réservées au mode scoped sont refusées statiquement.

## Notes sur le cycle de vie

La libération dépend de `onAfterResponse`. Si Elysia n’atteint jamais ce hook, l’adaptateur ne peut pas libérer les ressources du scope de requête. Les données de suivi sont conservées par références faibles, mais la libération des ressources exige l’exécution du hook.

Utilise `setupScope` pour les valeurs nécessaires avant validation. Utilise `setupValidatedScope` pour celles issues du body, des paramètres de requête ou de route, des headers ou des cookies validés.

## Streaming

Elysia peut produire une `Response` en streaming avant que le flux soit entièrement consommé. Si les services scoped restent utilisés après le retour de la route, appelle `skipInferdiDispose(context)` et libère le scope toi-même.

```ts
import { skipInferdiDispose } from '@inferdi/elysia'

app.get('/events', (context) => {
  skipInferdiDispose(context)

  const scope = context.di
  const events = scope.get('events')

  return new Response(new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        for await (const event of events.subscribe()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } finally {
        await scope.dispose()
      }
    },
  }))
})
```

`skipInferdiDispose` ne supprime que la libération sur succès. Les chemins d’erreur libèrent toujours le scope.

