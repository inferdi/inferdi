/*
 * Deno Deploy / Deno consumers: see ../_shared/container.ts and map the bare
 * specifier in your `deno.json` import map:
 *   { "imports": { "@inferdi/inferdi": "npm:@inferdi/inferdi" } }
 */
import {
  buildRootContainer,
  createRequestScope
} from '../_shared/container.ts'

const root = buildRootContainer()

Deno.serve(async (request, info) => {
  const scope = await createRequestScope(root, {
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID()
  })

  try {
    const profile = await scope.get('users').profile('me')

    /*
     * Async background work that uses scoped services. MUST finish before
     * dispose — chaining via `.finally` guarantees that. Running it in
     * `Promise.all([background, scope.dispose()])` would tear down the
     * scope while the background promise is still reading from it
     */
    const background = (async () => {
      scope.get('audit').record('request.completed', { path: new URL(request.url).pathname })
    })()

    info.waitUntil(background.finally(() => scope.dispose()))

    return Response.json(profile)
  } catch (error) {
    await scope.dispose()
    throw error
  }
})
