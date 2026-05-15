import { waitUntil } from '@vercel/functions'

import {
  buildRootContainer,
  createRequestScope,
} from '../_shared/container.js'

export const runtime = 'edge'

const root = buildRootContainer()

export async function GET(request: Request) {
  const scope = await createRequestScope(root, {
    requestId: request.headers.get('x-vercel-id') ?? crypto.randomUUID(),
  })

  try {
    const profile = await scope.get('users').profile('me')

    // Background work that touches scoped services must complete BEFORE the
    // scope is disposed. Chaining via `.finally` ensures the background
    // promise (which still reads RequestContext / Logger from the scope)
    // is sequenced before the dispose — never in parallel with it.
    const background = (async () => {
      scope.get('audit').record('request.completed', { url: request.url })
    })()
    waitUntil(background.finally(() => scope.dispose()))

    return Response.json(profile)
  } catch (error) {
    await scope.dispose()
    throw error
  }
}
