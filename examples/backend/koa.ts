import Koa from 'koa'
import { inferdiKoa } from '@inferdi/koa'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

declare module 'koa' {
  interface DefaultState {
    di: RequestContainer
  }
}

export const app = new Koa()

app.use(inferdiKoa({
  container: root,
  createScope: (root, ctx) =>
    createRequestScope(root, {
      requestId: crypto.randomUUID(),
      ip: ctx.ip,
      userId: ctx.get('x-user-id') || undefined,
    }),
}))
app.use(async (ctx) => {
  const id = ctx.path.split('/').pop() ?? ''
  ctx.body = await ctx.state.di.get('users').profile(id)
})
