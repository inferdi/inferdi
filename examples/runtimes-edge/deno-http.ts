/*
 * Deno consumers: `../_shared/container.ts` imports from `@inferdi/inferdi`.
 * Map the bare specifier in your `deno.json` import map:
 *   { "imports": { "@inferdi/inferdi": "npm:@inferdi/inferdi" } }
 */
import {
  buildRootContainer,
  createRequestScope
} from '../_shared/container.ts'

const root = buildRootContainer()

Deno.serve(async (request) => {
  await using scope = await createRequestScope(root, {
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID()
  })

  /*
   * The handler is a bounded async unit for non-streaming responses, so
   * `await using` is the compact form of try/finally + async dispose
   */
  const profile = await scope.get('users').profile('me')
  return Response.json(profile)
})
