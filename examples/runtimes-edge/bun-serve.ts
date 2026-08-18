import {
  buildRootContainer,
  createRequestScope
} from '../_shared/container.js'

const root = buildRootContainer()

export default Bun.serve({
  async fetch(request) {
    await using scope = createRequestScope(root, {
      requestId: request.headers.get('x-request-id') ?? crypto.randomUUID()
    })

    /*
     * `Response.json(value)` serializes synchronously, so the response body is
     * ready before the handler exits and `await using` is safe. For streaming
     * responses, move disposal into the stream's `cancel`/`close` path
     */
    const users = await scope.getAsync('users')
    const profile = await users.profile('me')
    return Response.json(profile)
  }
})
