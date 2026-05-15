import Koa, { type Context, type Next } from 'koa'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    container: RequestContainer
  }
}

async function withContainer(ctx: Context, next: Next) {
  const scope = await createRequestScope(root, {
    requestId: crypto.randomUUID(),
    ip: ctx.ip,
    userId: ctx.get('x-user-id') || undefined,
  })

  ctx.state.container = scope

  let disposed = false
  const cleanup = () => {
    if (disposed) return
    disposed = true
    scope.dispose().catch((err) => {
      console.error('Failed to dispose request scope', err)
    })
  }

  // Koa may start streaming ctx.body after the middleware chain resolves.
  // Tie disposal to the underlying Node response, not to `await next()`.
  ctx.res.once('finish', cleanup)
  ctx.res.once('close', cleanup)

  await next()
}

export const app = new Koa()

app.use(withContainer)
app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.container.get('users').profile(id)
})
