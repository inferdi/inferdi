import { Hono } from 'hono'
import { inferdiHono, type InferdiHonoEnv } from '@inferdi/hono'

import { buildRootContainer } from '../_shared/container.js'

const root = buildRootContainer()
type AppEnv = InferdiHonoEnv<typeof root>

export const app = new Hono<AppEnv>()

app.use('*', inferdiHono({
  container: root,
  setupScope: (scope, c) => {
    const request = scope.get('request')
    request.requestId = crypto.randomUUID()
    request.userId = c.req.header('x-user-id')
  }
}))

app.get('/users/:id', async (c) => {
  const user = await c.var.di.get('users').profile(c.req.param('id'))
  return c.json(user)
})
