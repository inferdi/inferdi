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

type FeatureContext = {
  readonly featureName: string
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
  .declareScopeInputs<{ feature: FeatureContext }>()
  .registerClass('api', ApiClient, [])
  .registerClass('projectsVm', ProjectsViewModel, ['feature', 'api'], 'scoped')

type AppContainer = typeof root
type PageContainer = ReturnType<typeof createProjectsPageScope>

function createProjectsPageScope(parent: AppContainer) {
  return parent.createScope({
    feature: { featureName: 'projects' }
  })
}

const RootDIContext = createContext<AppContainer | null>(null)
const PageDIContext = createContext<PageContainer | null>(null)

export function AppDIProvider({ children }: PropsWithChildren) {
  return <RootDIContext.Provider value={root}>{children}</RootDIContext.Provider>
}

export function ProjectsPage({ children }: PropsWithChildren) {
  const parent = useContext(RootDIContext)
  if (parent === null) throw new Error('DI provider is missing')

  const [scope, setScope] = useState<PageContainer | null>(null)

  useEffect(() => {
    const nextScope = createProjectsPageScope(parent)
    setScope(nextScope)

    /*
     * React may replay effects in Strict Mode. Each setup owns the scope that
     * its cleanup disposes, including the development-only replay.
     */
    return () => {
      nextScope.dispose().catch(console.error)
    }
  }, [parent])

  if (scope === null) return null

  return <PageDIContext.Provider value={scope}>{children}</PageDIContext.Provider>
}

export function useProjectsViewModel() {
  const container = useContext(PageDIContext)
  if (container === null) throw new Error('Projects page scope is missing')
  return container.get('projectsVm')
}
