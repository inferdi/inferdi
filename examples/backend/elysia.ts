import { Elysia } from 'elysia'
import { inferdiElysia } from '@inferdi/elysia'

import {
  buildRootContainer,
  createRequestScope
} from '../_shared/container.js'

const root = buildRootContainer()

export const app = new Elysia()
  .use(inferdiElysia({
    container: root,
    createScope: (root, { request }) =>
      createRequestScope(root, {
        requestId: crypto.randomUUID(),
        userId: request.headers.get('x-user-id') ?? undefined
      })
  }))
  .get('/users/:id', async ({ params, di }) => {
    const users = await di.getAsync('users')
    return users.profile(params.id)
  })
