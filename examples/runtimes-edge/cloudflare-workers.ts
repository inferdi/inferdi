import {
  buildRootContainer,
  createRequestScope,
  type RootContainer
} from '../_shared/container.js'

type Env = Record<string, string | undefined>

/*
 * Workers re-uses the module-scope between requests for as long as the
 * isolate is warm. Lazily build the root once per isolate from the bindings
 * passed into `fetch`. `env` typically contains DATABASE_URL/LOG_LEVEL so
 * `readConfig(env)` validates inside buildRootContainer
 */
let root: RootContainer | undefined

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    root ??= buildRootContainer(env)

    const scope = await createRequestScope(root, {
      requestId: request.headers.get('cf-ray') ?? crypto.randomUUID()
    })

    try {
      const profile = await scope.get('users').profile('me')

      /*
       * Background work that touches scoped services must complete BEFORE the
       * scope is disposed. `.finally` sequences disposal after the background
       * work, so the scoped `RequestContext` / async `Database` are still alive
       * while the audit record is being written
       */
      const background = (async () => {
        scope.get('audit').record('request.completed', { url: request.url })
      })()
      ctx.waitUntil(background.finally(() => scope.dispose()))

      return Response.json(profile)
    } catch (error) {
      await scope.dispose()
      throw error
    }
  }
}
