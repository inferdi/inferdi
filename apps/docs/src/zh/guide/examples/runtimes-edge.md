# 运行时与边缘平台

运行时示例使用模块级的根容器，并为每个请求创建一个作用域。有界限的处理函数可以使用 `await using`；流式或后台工作应在该工作完成后再释放。

大多数示例共用 [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)。Cloudflare Workers 和 Supabase Edge Functions 围绕平台绑定构建本地容器图。

| 示例 | 展示内容 |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | 底层 Node HTTP 生命周期，配合响应清理 |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Bun `serve` 请求作用域 |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Deno HTTP 请求作用域 |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Wrangler 生成的绑定类型、D1、Queues 和带错误处理的 `ctx.waitUntil` |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Vercel Edge 请求作用域与后台清理 |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | 通过 `Deno.ServeHandlerInfo.completed` 清理 Deno Deploy 作用域 |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | 使用自定义工厂替换的 Supabase Edge Functions |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

仓库文件：[`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

仓库文件：[`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

仓库文件：[`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

在 `wrangler.jsonc` 中配置 `DB` 和 `AUDIT_QUEUE` 绑定，然后运行 `pnpm wrangler types`。示例使用生成的 `Env` 接口，后台任务不会保留请求作用域。

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

仓库文件：[`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

仓库文件：[`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

仓库文件：[`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

仓库文件：[`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
