import { waitUntil } from '@vercel/functions'
import { Container } from '@inferdi/inferdi'

export const runtime = 'edge'

type RequestContext = {
  readonly requestId: string
}

class ProfilesService {
  constructor(private readonly request: RequestContext) {}

  async get(id: string) {
    return { id, requestId: this.request.requestId, name: 'Edge User' }
  }
}

class AuditService {
  record(event: string, meta: Record<string, unknown>) {
    console.info(event, meta)
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('audit', AuditService, [])
  .registerClass('profiles', ProfilesService, ['request'], 'scoped')

export async function GET(request: Request) {
  await using scope = root.createScope({
    request: {
      requestId: request.headers.get('x-vercel-id') ?? crypto.randomUUID()
    }
  })

  const profile = await scope.get('profiles').get('me')
  const audit = scope.get('audit')

  /*
   * The background task captures a root singleton and plain data. It does not
   * retain the request scope after this bounded handler returns.
   */
  waitUntil(
    Promise.resolve()
      .then(() => audit.record('request.completed', { url: request.url }))
      .catch((error) => {
        console.error('Failed to record request completion', error)
      })
  )

  return Response.json(profile)
}
