import { Container } from '@inferdi/inferdi'
import { getContext, onDestroy, setContext } from 'svelte'

class RouteContext {
  routeName = ''
}

class ApiClient {
  async loadInbox() {
    return [{ id: 'msg_1', subject: 'Hello' }]
  }
}

class InboxViewModel {
  constructor(
    private readonly route: RouteContext,
    private readonly api: ApiClient
  ) {}

  async load() {
    return {
      route: this.route.routeName,
      messages: await this.api.loadInbox()
    }
  }
}

const root = new Container()
  .registerClass('route', RouteContext, [], 'scoped')
  .registerClass('api', ApiClient, [])
  .registerClass('inboxVm', InboxViewModel, ['route', 'api'], 'scoped')

type AppContainer = typeof root
type RouteContainer = ReturnType<typeof createInboxRouteScope>

const RootDIKey = Symbol('InferDI.root')
const RouteDIKey = Symbol('InferDI.route')

function createInboxRouteScope(parent: AppContainer) {
  const scope = parent.createScope()
  try {
    scope.get('route').routeName = 'inbox'
    return scope
  } catch (error) {
    scope.dispose().catch(console.error)
    throw error
  }
}

export function provideRootContainer() {
  setContext(RootDIKey, root)
}

export function provideInboxRouteScope() {
  const parent = getContext<AppContainer | undefined>(RootDIKey)
  if (parent === undefined) {
    throw new Error('InferDI root context is missing — call provideRootContainer() in a parent layout')
  }
  const scope = createInboxRouteScope(parent)

  setContext(RouteDIKey, scope)

  // Svelte onDestroy is synchronous; start async cleanup and report failures
  onDestroy(() => {
    scope.dispose().catch(console.error)
  })
}

export function getInboxViewModel() {
  const scope = getContext<RouteContainer | undefined>(RouteDIKey)
  if (scope === undefined) {
    throw new Error('Inbox route scope is missing — call provideInboxRouteScope() in this route')
  }
  return scope.get('inboxVm')
}
