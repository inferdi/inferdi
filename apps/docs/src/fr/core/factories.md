# Fabriques

Utilise `registerClass` lorsque la construction se résume à `new Ctor(...deps)`. Choisis `registerFactory` si elle nécessite de la configuration, une API tierce, une liaison à une interface ou une autre logique explicite.

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

Le type de retour devient le type du service enregistré.

## Fabriques avec accès au conteneur

Le callback de base reçoit un conteneur filtré par durée de vie. Une fabrique singleton ne peut résoudre que des dépendances compatibles avec cette durée de vie ; TypeScript refuse les clés scoped et transient.

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

Cette forme convient aux résolutions conditionnelles ou en plusieurs étapes. Garde tous les appels `.get()` synchrones. Pour une initialisation asynchrone qui doit se propager dans le graphe, utilise `registerAsyncFactory`.

## Dépendances déclarées d’une fabrique

La surcharge avec `deps` rend les exigences visibles dans le graphe et limite le résolveur du callback à ces clés :

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

Les dépendances déclarées transmettent les exigences d’entrées de scope et de durée de vie à travers les modules et les autres enregistrements. Contrairement à `registerAsyncFactory`, ce callback reçoit un résolveur, pas des valeurs positionnelles.

## Durées de vie des fabriques

Les fabriques utilisent les mêmes durées de vie que les classes :

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

Les résultats singleton et scoped sont mis en cache et appartiennent à leur conteneur. InferDI ne conserve ni ne libère les résultats transient.

Passe `lazyKey` en quatrième argument pour créer un enregistrement compagnon différé de même durée de vie :

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

Un compagnon exige une durée de vie explicite, y compris `'singleton'`. Voir [Injection différée](./lazy-injection) pour les règles de durée de vie et de libération.

## Lier des interfaces

Une interface n’a pas de constructeur à l’exécution. Donne un type de service explicite à la fabrique si les consommateurs doivent dépendre d’une abstraction :

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

Les consommateurs de `mailer` voient désormais `Mailer`, et non `SendGridMailer`.

## Choisir le contrat des promesses

Une promesse renvoyée par `registerFactory` est la valeur du service elle-même : `.get()` renvoie `Promise<T>` et les fabriques dépendantes reçoivent cette même promesse. Réserve ce cas aux promesses qui appartiennent au graphe synchrone.

Utilise `registerAsyncFactory` lorsque `T` est le service et que la promesse représente son initialisation. Cette forme propage l’état asynchrone et se résout via `.getAsync()`. La page [Dépendances asynchrones](./async-dependencies) couvre les deux contrats, le cache, les compagnons différés, les erreurs et la libération.

