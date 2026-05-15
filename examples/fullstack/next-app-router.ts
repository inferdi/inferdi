'use server'

import { revalidatePath } from 'next/cache'

import { buildRootContainer, type RootContainer } from '../_shared/container.js'

// In development, HMR can reload this module without resetting globalThis.
// Reusing the root avoids leaking DB/cache clients on every file save and
// guarantees that across reloads `buildRootContainer()` runs ONCE, so the
// async `Database` factory in `_shared/container.ts` is initialized once.
const globalForInferDI = globalThis as typeof globalThis & {
  __inferdiNextRoot?: RootContainer
}

export const root: RootContainer =
  process.env.NODE_ENV === 'production'
    ? buildRootContainer()
    : (globalForInferDI.__inferdiNextRoot ??= buildRootContainer())

// Server Actions run as a single bounded async unit and Next awaits the
// function before returning to the client. `await using` is the right tool
// here: the scope is asyncDispose'd exactly when the action finishes,
// including on thrown errors.
export async function getProfileAction(formData: FormData) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
  ctx.requestId = crypto.randomUUID()
  ctx.userId = String(formData.get('userId') ?? '') || undefined

  const profile = await scope.get('users').profile(ctx.userId ?? 'me')
  revalidatePath('/profile')
  return profile
}
