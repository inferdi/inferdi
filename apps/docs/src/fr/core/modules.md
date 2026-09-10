# Composer avec des modules

Utilise `.use()` pour découper un grand constructeur de conteneur en parties plus petites tout en conservant l’inférence des types dans la chaîne d’appels.

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

Les lambdas en ligne sont la forme la plus simple. Le type du conteneur est inféré au point d’appel et inclut les clés déjà enregistrées.

## Modules nommés

Les modules réutilisables déclarent seulement leurs exigences et leurs résultats avec `Module<TRequirements, TProvides>`. Le graphe réel peut contenir d’autres enregistrements, qui sont conservés dans le résultat.

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

Le callback ne voit que `Container<TRequirements>`. Les exigences doivent correspondre au type du service, à la durée de vie exacte, au mode synchrone ou asynchrone, au mode différé géré et à la disponibilité des entrées de scope. Les sorties ne peuvent entrer en collision avec aucune clé réelle. Les exigences manquantes ou incompatibles et les collisions produisent des diagnostics nommés.

## Imports dynamiques

Utilise `import()` lorsqu’un module facultatif ou propre à une route doit être chargé dans un chunk JavaScript séparé.

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

L’environnement charge et évalue `reports.module` avant l’appel à `.use()`. Celui-ci exécute ensuite le module de façon synchrone, ajoute ses enregistrements et renvoie le type de conteneur inféré. Un import dynamique ne rend pas les services asynchrones ; utilise `registerAsyncFactory` si leur initialisation l’est.

Dans le navigateur, applique ce modèle à la limite d’une route ou d’une fonctionnalité, uniquement si le bundler produit un chunk séparé qui n’est importé statiquement nulle part. Construis le conteneur de la fonctionnalité après le chargement. Côté serveur, privilégie les imports statiques au démarrage normal. Un import dynamique est utile pour les fonctionnalités optionnelles selon le déploiement ou les chemins serverless sensibles au démarrage à froid. Dans tous les cas, assemble le conteneur avant sa première résolution ou son premier `createScope()` ; ne le modifie pas à chaque requête.

Pour les clés choisies à l’exécution, utilise la [garde de type `.has()`](./type-safety#dynamic-keys) avant la résolution.

## Vérification par le compilateur

Un module nommé ne peut être installé tant que ses exigences déclarées ne sont pas satisfaites :

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
