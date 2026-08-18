import { Container } from '@inferdi/inferdi'

/*
 * `Env` and the Worker runtime types come from `pnpm wrangler types`.
 * The Wrangler config declares a D1 binding named DB and a Queue producer
 * binding named AUDIT_QUEUE.
 */

type RequestContext = {
  readonly requestId: string
}

type AuditMessage = {
  readonly event: string
  readonly requestId: string
  readonly url: string
}

class ProfilesService {
  constructor(
    private readonly request: RequestContext,
    private readonly db: D1Database
  ) {}

  async get(id: string) {
    const profile = await this.db
      .prepare('select id, name from users where id = ?1')
      .bind(id)
      .first<{ id: string; name: string }>()

    return profile ?? { id, name: 'Unknown' }
  }

  auditMessage(url: string): AuditMessage {
    return {
      event: 'profile.read',
      requestId: this.request.requestId,
      url
    }
  }
}

const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    db: D1Database
  }>()
  .registerClass('profiles', ProfilesService, ['request', 'db'], 'scoped')

export default {
  async fetch(request, env, ctx): Promise<Response> {
    await using scope = root.createScope({
      request: {
        requestId: request.headers.get('cf-ray') ?? crypto.randomUUID()
      },
      db: env.DB
    })

    const profiles = scope.get('profiles')
    const profile = await profiles.get('me')

    ctx.waitUntil(
      env.AUDIT_QUEUE
        .send(profiles.auditMessage(request.url))
        .catch((error) => {
          console.error(JSON.stringify({
            event: 'audit.enqueue.failed',
            requestId: request.headers.get('cf-ray'),
            error: String(error)
          }))
        })
    )

    return Response.json(profile)
  }
} satisfies ExportedHandler<Env>
