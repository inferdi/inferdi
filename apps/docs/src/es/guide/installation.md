# Instalación

InferDI se publica en npm y JSR con nombres de paquete y versiones coincidentes. Usa instalaciones compatibles con npm para Node y Bun, o JSR para Deno y runtimes que prefieran las fuentes en TypeScript.

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

También puedes importar directamente:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Requisitos

| Runtime | Requisito |
| --- | --- |
| Node.js | 16 o más reciente para el paquete del núcleo |
| Bun | 1.0 o más reciente |
| Deno | 1.40 o más reciente |
| TypeScript | 5.2 o posterior |

En versiones de Node anteriores a `Symbol.dispose` y `Symbol.asyncDispose` nativos, InferDI instala un polyfill de símbolos al importar para que la interoperabilidad con Explicit Resource Management siga funcionando.

Las declaraciones publicadas referencian por sí mismas la biblioteca de tipos de Explicit Resource Management. Los consumidores que apunten a ES2022 no necesitan añadir `ESNext.Disposable` a la configuración `lib` de TypeScript.

## Instalación de adaptadores

Instala el paquete del núcleo, el paquete del adaptador y el peer del framework:

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

Cada adaptador tiene una página dedicada con sus reglas de tiempo de vida y su configuración de tipos.
