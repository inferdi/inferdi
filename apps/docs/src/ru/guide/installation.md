# Установка

InferDI публикуется в npm и JSR с одинаковыми именами пакетов и версиями. Для Node и Bun используйте npm-совместимую установку, для Deno и сред, которым удобнее исходники TypeScript, используйте JSR.

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

Можно импортировать напрямую:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Требования

| Среда | Требование |
| --- | --- |
| Node.js | 16 или новее для основного пакета |
| Bun | 1.0 или новее |
| Deno | 1.40 или новее |
| TypeScript | 5.2+ рекомендуется для `using` / `await using` |

На версиях Node без нативных `Symbol.dispose` и `Symbol.asyncDispose` InferDI при импорте устанавливает полифил символов, чтобы `using` и `await using` продолжали работать.

## Установка адаптеров

Установите основной пакет, пакет адаптера и peer-зависимость фреймворка:

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

У каждого адаптера есть отдельная страница с правилами жизненного цикла и настройкой типов.
