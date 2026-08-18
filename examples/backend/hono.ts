import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoScopeEnv } from '@inferdi/hono'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer
} from '../_shared/container.js'

const root = buildRootContainer()
type AppEnv = InferdiHonoScopeEnv<RequestContainer>

export const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  createScope: (_root, c) => createRequestScope(root, {
    requestId: crypto.randomUUID(),
    userId: c.req.header('x-user-id')
  })
}))

app.get('/users/:id', async (c) => {
  const users = await c.var.di.getAsync('users')
  const user = await users.profile(c.req.param('id'))
  return c.json(user)
})
