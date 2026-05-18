// @ts-check

import { Container } from '@inferdi/inferdi'

class PageContext {
  constructor() {
    this.pageName = ''
  }
}

class ApiClient {
  async listProjects() {
    return [{ id: 'project_1', name: 'Docs' }]
  }
}

class ProjectsViewModel {
  /**
   * @param {PageContext} page
   * @param {ApiClient} api
   */
  constructor(page, api) {
    this.page = page
    this.api = api
  }

  async load() {
    return {
      page: this.page.pageName,
      projects: await this.api.listProjects(),
    }
  }
}

const root = new Container()
  .registerClass('page', PageContext, [], 'scoped')
  .registerClass('api', ApiClient, [])
  .registerClass('projectsVm', ProjectsViewModel, ['page', 'api'], 'scoped')

// Uncomment in an editor with JavaScript type checking enabled:
// new Container()
//   .registerClass('page', PageContext, [], 'scoped')
//   .registerClass('api', ApiClient, [])
//   .registerClass('projectsVm', ProjectsViewModel, ['api', 'page'], 'scoped')

export function createProjectsPageScope() {
  const scope = root.createScope()

  try {
    scope.get('page').pageName = 'projects'
    return scope
  } catch (error) {
    scope.dispose().catch(console.error)
    throw error
  }
}

/**
 * @param {HTMLElement} element
 */
export async function renderProjectsList(element) {
  const scope = createProjectsPageScope()

  try {
    const vm = scope.get('projectsVm')
    const data = await vm.load()

    element.textContent = `${data.page}: ${data.projects.map((project) => project.name).join(', ')}`
  } finally {
    await scope.dispose()
  }
}
