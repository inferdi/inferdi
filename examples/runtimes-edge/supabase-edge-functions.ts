/*
 * Supabase Edge Functions / Deno consumers: see ../_shared/container.ts and
 * map the bare specifier in your `deno.json` import map:
 *   { "imports": { "@inferdi/inferdi": "jsr:@inferdi/inferdi" } }
 *
 * This example uses its own root container with a Supabase-specific factory
 * instead of the shared one — it shows how an InferDI root can be customized
 * per deployment target while keeping the rest of the request-scope shape
 */
import { Container } from '@inferdi/inferdi'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js'

/*
 * EdgeRuntime is a Supabase-provided global; declare its shape locally so
 * this file typechecks under a regular Deno LSP without Supabase ambient types
 */
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void
}

class RequestContext {
  requestId = ''
}

function readSupabaseEnv() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required')
  }
  return { url, key }
}

class ProfilesService {
  constructor(
    private readonly request: RequestContext,
    private readonly supabase: SupabaseClient
  ) {}

  async list() {
    const { data, error } = await this.supabase.from('profiles').select('*')
    if (error) throw error
    return { requestId: this.request.requestId, data }
  }

  async audit(event: string) {
    await this.supabase.from('request_log').insert({
      request_id: this.request.requestId,
      event
    })
  }
}

const root = new Container()
  .registerValue('supabaseEnv', readSupabaseEnv())
  .registerFactory('supabase', (c) => {
    const { url, key } = c.get('supabaseEnv')
    return createClient(url, key)
  })
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('profiles', ProfilesService, ['request', 'supabase'], 'scoped')

Deno.serve(async (request) => {
  const scope = root.createScope()
  try {
    scope.get('request').requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()

    const profiles = scope.get('profiles')
    const result = await profiles.list()

    /*
     * Background work that uses scoped services. `EdgeRuntime.waitUntil` keeps
     * the function instance alive until the promise settles, so we sequence
     * dispose AFTER the audit write — never in parallel with it. Without the
     * `.finally(scope.dispose)` the scoped supabase client and RequestContext
     * would be torn down while the audit write is still in flight
     */
    EdgeRuntime.waitUntil(
      profiles.audit('profiles.listed').finally(() => scope.dispose())
    )

    return Response.json(result)
  } catch (error) {
    await scope.dispose()
    throw error
  }
})

/*
 * Optional: flush in-flight state when Supabase signals worker shutdown.
 * `beforeunload` fires when the runtime is about to terminate the instance
 * (e.g. resource limit, deploy). Avoid heavy work here — the window is short
 */
addEventListener('beforeunload', () => {
  // e.g. flush a small in-memory queue to a singleton-owned destination
})
