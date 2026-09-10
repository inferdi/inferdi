# Exemples full-stack

Les exemples full-stack utilisent des scopes pour les loaders, actions, gestionnaires de routes et Server Actions. En développement, la racine est conservée sur `globalThis` pour éviter de dupliquer les clients pendant le HMR.

Les deux exemples utilisent le même graphe. Compare la limite de l’opération dont chaque framework attend la fin. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Exemple | Contenu |
|---|---|
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Scopes de requête et de Server Action avec Next.js App Router |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Scopes de loader et d’action Remix |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

Fichier du dépôt : [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

Fichier du dépôt : [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
