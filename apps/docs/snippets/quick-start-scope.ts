import { Container } from '@inferdi/inferdi'

type RequestContext = {
  requestId: string
}

class RequestLog {
  constructor(readonly request: RequestContext) {}

  dispose() {
    console.info(`closed ${this.request.requestId}`)
  }
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('requestLog', RequestLog, ['request'], 'scoped')

export async function handle(request: RequestContext) {
  const scope = root.createScope({ request })

  try {
    return scope.get('requestLog')
  } finally {
    await scope.dispose()
  }
}
