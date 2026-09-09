import { Container } from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'
import {type PropsWithChildren} from 'react'

/*
 * Frontend examples keep their own minimal builder because the browser does
 * not have the `Database` / `process.env` shape that `_shared/container.ts`
 * uses on the server. The patterns are the same: scoped `FeatureContext`,
 * singleton services on the root, page-level scope after commit
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

const AppDI = inferdiReact<AppContainer>()
const PageDI = AppDI.createScope({
  createScope: (parent): PageContainer => createProjectsPageScope(parent),
  onDisposeError: (error) => console.error(error)
})

export function AppDIProvider({ children }: PropsWithChildren) {
  return <AppDI.Provider container={root}>{children}</AppDI.Provider>
}

export function ProjectsPage({ children }: PropsWithChildren) {
  return <PageDI.ScopeProvider>{children}</PageDI.ScopeProvider>
}

export function useProjectsViewModel() {
  return PageDI.useService('projectsVm')
}
