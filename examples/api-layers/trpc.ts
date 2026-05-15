import { initTRPC } from '@trpc/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

type Ctx = { container: RequestContainer }

const t = initTRPC.context<Ctx>().create()

export const router = t.router({
  me: t.procedure.query(({ ctx }) => ctx.container.get('users').profile('me')),
})

// HTTP-level scope. One scope per HTTP request — NOT per procedure.
// tRPC's batched-link sends multiple procedure calls in a single HTTP request;
// `fetchRequestHandler` resolves them all under one `createContext` call. We
// dispose ONCE after the response is built, which is the only correct moment.
//
// (A procedure-level middleware that disposes the container would dispose the
// scope between batched procedures on the same request, breaking later calls.)
export async function handleTrpcRequest(req: Request): Promise<Response> {
  await using scope = await createRequestScope(root, {
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
    userId: req.headers.get('authorization') ?? undefined,
  })

  return fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router,
    createContext: () => ({ container: scope }),
  })
}
