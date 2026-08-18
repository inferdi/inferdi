import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'

import {
  buildRootContainer,
  createRequestScope,
  type RootContainer,
  type RequestContainer
} from '../_shared/container.js'

declare module 'fastify' {
  interface FastifyInstance {
    di: RootContainer
  }

  interface FastifyRequest {
    di: RequestContainer
  }
}

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function buildServer(): FastifyInstance {
  const root = buildRootContainer()
  const app = Fastify()

  app.register(inferdiFastify, {
    container: root,
    // Annotate hook params: `app.register` cannot infer the plugin's generics
    createScope: (root: RootContainer, request: FastifyRequest) =>
      createRequestScope(root, {
        requestId: request.id,
        ip: request.ip,
        userId: normalizeHeader(request.headers['x-user-id'])
      }),
    disposeRootOnClose: true
  })

  app.get('/users/:id', async (request) => {
    const { id } = request.params as { id: string }
    const users = await request.di.getAsync('users')
    return users.profile(id)
  })

  return app
}
