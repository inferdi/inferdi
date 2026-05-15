import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

declare module 'fastify' {
  interface FastifyRequest {
    container?: RequestContainer
  }
}

async function disposeScope(request: FastifyRequest, _reply: FastifyReply) {
  if (request.container === undefined) return

  try {
    await request.container.dispose()
  } catch (error) {
    request.log.error({ err: error }, 'Failed to dispose request scope')
  }
}

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function buildServer(): FastifyInstance {
  const app = Fastify()

  app.addHook('onRequest', async (request) => {
    request.container = await createRequestScope(root, {
      requestId: request.id,
      ip: request.ip,
      userId: normalizeHeader(request.headers['x-user-id']),
    })
  })

  // onResponse fires at the end of the request lifecycle, including requests
  // that passed through Fastify's error handler. Do not dispose in onError:
  // that hook runs before the error handler builds its response, and the
  // handler may still need request.container for logging/localization.
  app.addHook('onResponse', disposeScope)

  app.get('/users/:id', async (request) => {
    const { id } = request.params as { id: string }
    return request.container!.get('users').profile(id)
  })

  return app
}
