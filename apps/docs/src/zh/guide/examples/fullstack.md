# 全栈框架

全栈示例为 loader、action、路由处理函数以及 server action 使用作用域。开发构建会将根容器缓存在 `globalThis` 上，以避免在 HMR 期间产生重复的客户端实例。

这两个示例共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。请对比每个框架所等待的操作边界。

| 示例 | 展示内容 |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Next.js App Router 的请求与 Server Action 作用域边界 |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Remix 的 loader 与 action 作用域边界 |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

仓库文件：[`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

仓库文件：[`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
