import Fastify, { type FastifyInstance } from 'fastify'
import { inferdiFastify } from '@inferdi/fastify'

import {
  buildRootContainer,
  createRequestScope,
  type RootContainer,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

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
  const app = Fastify()

  app.register(inferdiFastify, {
    container: root,
    createScope: (root, request) =>
      createRequestScope(root, {
        requestId: request.id,
        ip: request.ip,
        userId: normalizeHeader(request.headers['x-user-id']),
      }),
  })

  app.get('/users/:id', async (request) => {
    const { id } = request.params as { id: string }
    return request.di.get('users').profile(id)
  })

  return app
}
