import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from '@remix-run/node'
import { json } from '@remix-run/node'

import {
  buildRootContainer,
  createRequestScope,
  type RootContainer,
} from '../_shared/container.js'

// Remix dev can re-evaluate modules during HMR while globalThis survives.
// Cache the root so the async Database factory is not re-run on every save.
const globalForInferDI = globalThis as typeof globalThis & {
  __inferdiRemixRoot?: RootContainer
}

export const root: RootContainer =
  process.env.NODE_ENV === 'production'
    ? buildRootContainer()
    : (globalForInferDI.__inferdiRemixRoot ??= buildRootContainer())

async function scopeFor(request: Request) {
  return createRequestScope(root, {
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    userId: request.headers.get('x-user-id') ?? undefined,
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Loader / action functions are bounded async operations that Remix awaits
  // before serializing the response. `await using` ties scope disposal to
  // the same boundary — Remix never streams data out of a loader after it
  // returns, so the scope is safe to tear down here.
  await using scope = await scopeFor(request)
  return json(await scope.get('users').profile('me'))
}

export async function action({ request }: ActionFunctionArgs) {
  await using scope = await scopeFor(request)
  const form = await request.formData()
  return json({ ok: true, fields: [...form.keys()] })
}
