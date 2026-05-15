import { Elysia } from 'elysia'

import {
  buildRootContainer,
  createRequestScope,
} from '../_shared/container.js'

const root = buildRootContainer()

export const app = new Elysia()
  // `.derive` is type-aware: TypeScript propagates `container` into the
  // downstream handler's destructured context. No cast needed at call sites.
  .derive(async ({ request }) => ({
    container: await createRequestScope(root, {
      requestId: crypto.randomUUID(),
      userId: request.headers.get('x-user-id') ?? undefined,
    }),
  }))
  .onAfterResponse(({ container }) => {
    // Elysia awaits async lifecycle hooks; returning the promise here lets the
    // runtime surface disposal errors instead of swallowing them on the event loop.
    return container.dispose()
  })
  .get('/users/:id', ({ params, container }) =>
    container.get('users').profile(params.id),
  )
