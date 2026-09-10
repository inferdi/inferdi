# Installer InferDI

InferDI est publié sur npm et JSR avec les mêmes noms de paquets et les mêmes versions. Utilise une installation compatible npm pour Node et Bun, ou JSR pour Deno et les environnements qui privilégient les sources TypeScript.

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

L’import direct est également possible :

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Prérequis

| Environnement | Version minimale |
|---|---|
| Node.js | 16 pour le cœur |
| Bun | 1.0 |
| Deno | 1.40 |
| TypeScript | 5.2 |

Sur les versions de Node dépourvues de `Symbol.dispose` et `Symbol.asyncDispose` natifs, InferDI ajoute ces symboles à l’import grâce à un polyfill, afin de rester compatible avec Explicit Resource Management.

Les déclarations publiées référencent elles-mêmes la bibliothèque de gestion explicite des ressources. Une application ciblant ES2022 n’a donc pas besoin d’ajouter `ESNext.Disposable` à sa configuration TypeScript `lib`.

## Installer les adaptateurs

Installe le cœur, le paquet de l’adaptateur et le framework requis comme dépendance pair :

```bash
pnpm add @inferdi/inferdi @inferdi/react react
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

Chaque adaptateur dispose d’une page dédiée à son cycle de vie et à sa configuration des types.

