# Exemples

Choisis la limite de cycle de vie de ton application et compare la création, l’exposition et la libération des scopes dans chaque écosystème. Chaque groupe correspond à un répertoire de [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples).

## Par où commencer

Lis d’abord [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). La plupart des exemples serveur utilisent ce constructeur de graphe pour se concentrer sur l’intégration au framework.

| Groupe | Points à comparer |
|---|---|
| [JavaScript](/fr/guide/examples/javascript) | Node ESM, CommonJS et bundlers pour navigateur |
| [Frameworks backend](/fr/guide/examples/backend) | Adaptateurs de scope de requête pour Fastify, Hono, Koa, Express et Elysia |
| [Couches API](/fr/guide/examples/api-layers) | Scopes de requête avec tRPC, Apollo Server et GraphQL Yoga |
| [Frameworks full-stack](/fr/guide/examples/fullstack) | Next.js App Router, loaders et actions Remix |
| [Environnements et plateformes edge](/fr/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy et Supabase Edge |
| [Frameworks frontend](/fr/guide/examples/frontend) | Scopes de fonctionnalité avec React, React Native, Vue et Svelte |
| [Bots, files et CLI](/fr/guide/examples/workers-cli) | Scopes d’opération avec Telegraf, Grammy, BullMQ, Commander et Yargs |

## Comment lire ces groupes

`examples/_shared/container.ts` fournit le graphe des exemples serveur. Les pages de groupe expliquent où le scope est créé, où il est exposé et qui le libère.

Pour les serveurs et les workers, compare les hooks de cycle de vie de la plateforme. Côté frontend, compare les limites de montage et de démontage.

::: info Extraits de référence
`pnpm run examples:typecheck` vérifie `examples/_shared/container.ts` et `examples/_shared/testing.ts`. Il ne vérifie pas tous les extraits de frameworks, car le workspace racine n’installe pas toutes leurs dépendances. Reprends le modèle utile dans ton application, installe ses dépendances et adapte le graphe partagé à tes types.
:::

