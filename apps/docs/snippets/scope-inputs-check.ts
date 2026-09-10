import { Container } from '@inferdi/inferdi'

type RequestContext = { requestId: string }

class Handler {
  constructor(readonly request: RequestContext) {}
}

const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('handler', Handler, ['request'], 'scoped')

// @ts-expect-error handler is not ready on the root
root.get('handler')

const scope = root.createScope({ request: { requestId: 'req-1' } })
scope.get('handler')
