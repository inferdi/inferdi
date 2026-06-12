# 安装

InferDI 以一致的包名和一致的版本号发布到 npm 和 JSR。在 Node 和 Bun 上使用兼容 npm 的安装方式，或在 Deno 以及偏好 TypeScript 源码的运行时上使用 JSR。

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

你也可以直接导入：

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## 环境要求

| 运行时 | 要求 |
| --- | --- |
| Node.js | 内核包需要 16 或更高版本 |
| Bun | 1.0 或更高版本 |
| Deno | 1.40 或更高版本 |
| TypeScript | 推荐 5.2+ 以支持 `using` / `await using` 语法 |

在原生 `Symbol.dispose` 和 `Symbol.asyncDispose` 出现之前的 Node 版本上，InferDI 会在导入时安装一个 symbol polyfill，使显式资源管理（Explicit Resource Management）的互操作仍能正常工作。

## 适配器安装

安装内核包、适配器包以及框架对等依赖：

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

每个适配器都有专门的页面，介绍其生命周期规则和类型配置。
