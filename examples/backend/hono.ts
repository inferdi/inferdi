import { Hono } from 'hono'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

type Bindings = {
  Variables: {
    container: RequestContainer
  }
}

export const app = new Hono<Bindings>()

app.use(async (c, next) => {
  const scope = await createRequestScope(root, {
    requestId: crypto.randomUUID(),
    userId: c.req.header('x-user-id'),
  })
  c.set('container', scope)

  // This try/finally is correct for bounded, non-streaming Hono responses.
  // For c.stream() / ReadableStream responses, the Response can be returned
  // before the stream is consumed. In that case, wrap the stream's lifecycle
  // or schedule cleanup with c.executionCtx.waitUntil(...) after stream work.
  try {
    await next()
  } finally {
    await scope.dispose()
  }
})

app.get('/users/:id', async (c) => {
  const user = await c.get('container').get('users').profile(c.req.param('id'))
  return c.json(user)
})
