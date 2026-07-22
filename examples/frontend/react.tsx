import { Container } from '@inferdi/inferdi'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState
} from 'react'

/*
 * Frontend examples keep their own minimal builder because the browser does
 * not have the `Database` / `process.env` shape that `_shared/container.ts`
 * uses on the server. The patterns are the same: scoped `FeatureContext`,
 * singleton services on the root, page-level scope on mount
 */

class FeatureContext {
  featureName = ''
}

class ApiClient {
  async listProjects() {
    return [{ id: 'project_1', name: 'Docs' }]
  }
}

class ProjectsViewModel {
  constructor(
    private readonly feature: FeatureContext,
    private readonly api: ApiClient
  ) {}

  async load() {
    return {
      feature: this.feature.featureName,
      projects: await this.api.listProjects()
    }
  }
}

const root = new Container()
  .registerClass('feature', FeatureContext, [], 'scoped')
  .registerClass('api', ApiClient, [])
  .registerClass('projectsVm', ProjectsViewModel, ['feature', 'api'], 'scoped')

type AppContainer = typeof root
type PageContainer = ReturnType<typeof createProjectsPageScope>

function createProjectsPageScope(parent: AppContainer) {
  const scope = parent.createScope()
  try {
    scope.get('feature').featureName = 'projects'
    return scope
  } catch (error) {
    scope.dispose().catch(console.error)
    throw error
  }
}

const RootDIContext = createContext<AppContainer | null>(null)
const PageDIContext = createContext<PageContainer | null>(null)

export function AppDIProvider({ children }: PropsWithChildren) {
  return <RootDIContext.Provider value={root}>{children}</RootDIContext.Provider>
}

export function ProjectsPage({ children }: PropsWithChildren) {
  const parent = useContext(RootDIContext)
  if (parent === null) throw new Error('DI provider is missing')

  /*
   * useState with a lazy initializer is the correct primitive for "create
   * exactly once per mounted instance". `useMemo` is documented as an
   * optimization, not a guarantee — under concurrent rendering React may
   * re-run the factory at any time and the discarded scope would leak
   * because `useEffect` cleanup only runs on the kept render
   */
  const [scope] = useState(() => createProjectsPageScope(parent))

  useEffect(() => {
    /*
     * React cleanup is synchronous. Use async dispose explicitly so scopes
     * with async factories/disposers do not go through sync [Symbol.dispose]()
     */
    return () => {
      scope.dispose().catch(console.error)
    }
  }, [scope])

  return <PageDIContext.Provider value={scope}>{children}</PageDIContext.Provider>
}

export function useProjectsViewModel() {
  const container = useContext(PageDIContext)
  if (container === null) throw new Error('Projects page scope is missing')
  return container.get('projectsVm')
}
