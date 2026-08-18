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
  const scope = createRequestScope(root, {
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID()
  })

  try {
    const users = await scope.getAsync('users')
    const profile = await users.profile('me')

    /*
     * `completed` settles after Deno finishes sending the response. Attach
     * disposal there so streaming responses retain their request scope.
     */
    void info.completed
      .then(() => scope.dispose())
      .catch((error) => {
        console.error('Failed to dispose Deno request scope', error)
      })

    return Response.json(profile)
  } catch (error) {
    await scope.dispose()
    throw error
  }
})
