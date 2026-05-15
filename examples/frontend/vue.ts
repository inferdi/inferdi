import { Container } from '@inferdi/inferdi'
import {
  defineComponent,
  inject,
  onUnmounted,
  provide,
  type InjectionKey,
} from 'vue'

class RouteContext {
  routeName = ''
}

class ApiClient {
  async dashboard() {
    return { total: 42 }
  }
}

class DashboardViewModel {
  constructor(
    private readonly route: RouteContext,
    private readonly api: ApiClient,
  ) {}

  async load() {
    return {
      route: this.route.routeName,
      dashboard: await this.api.dashboard(),
    }
  }
}

const root = new Container()
  .registerClass('route', RouteContext, [], 'scoped')
  .registerClass('api', ApiClient, [])
  .registerClass('dashboardVm', DashboardViewModel, ['route', 'api'], 'scoped')

type AppContainer = typeof root
type RouteContainer = ReturnType<typeof createDashboardRouteScope>

function createDashboardRouteScope(parent: AppContainer) {
  const scope = parent.createScope()
  try {
    scope.get('route').routeName = 'dashboard'
    return scope
  } catch (error) {
    scope.dispose().catch(console.error)
    throw error
  }
}

const RootDIKey: InjectionKey<AppContainer> = Symbol('InferDI.root')
const RouteDIKey: InjectionKey<RouteContainer> = Symbol('InferDI.route')

export const AppDIProvider = defineComponent({
  setup(_props, { slots }) {
    provide(RootDIKey, root)
    return () => slots.default?.()
  },
})

export const DashboardRouteProvider = defineComponent({
  setup(_props, { slots }) {
    const parent = inject(RootDIKey)
    if (parent === undefined) throw new Error('DI provider is missing')

    const scope = createDashboardRouteScope(parent)
    provide(RouteDIKey, scope)

    // Vue unmount hooks are synchronous; call async dispose explicitly.
    onUnmounted(() => {
      scope.dispose().catch(console.error)
    })

    return () => slots.default?.()
  },
})

export function useDashboardViewModel() {
  const container = inject(RouteDIKey)
  if (container === undefined) throw new Error('Dashboard route scope is missing')
  return container.get('dashboardVm')
}
