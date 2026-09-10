# Frameworks frontend

Les exemples frontend créent des scopes pour les pages, routes, écrans ou fonctionnalités. Ils utilisent leurs propres petits constructeurs de graphe plutôt que le module serveur partagé.

Compare la création du scope, sa transmission aux enfants et sa libération au démontage.

| Exemple | Contenu |
|---|---|
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | Scope de fonctionnalité React géré par `@inferdi/react` |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | Scope d’écran React Native |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Limite de scope avec provide/inject de Vue 3 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Limite de scope via le contexte Svelte |

## React

<<< ../../../../../../examples/frontend/react.tsx

Fichier du dépôt : [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

Fichier du dépôt : [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

Fichier du dépôt : [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

Fichier du dépôt : [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)

