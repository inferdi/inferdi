import {
  Container,
  type AsyncLazy,
  type AsyncLazySpec,
  type AsyncSpec,
  type DependenciesMap,
  type Lazy,
  type Lifetime,
  type Module,
  type LazySpec,
  type ContainerOptions,
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '../dist/index.js'
// @ts-expect-error — the companion mode discriminant stays package-internal
import type {lazyMode} from '../dist/index.js'

using container = new Container().registerValue('answer', 42)

const answer: number = container.get('answer')

await using scope = container.createScope()

const scopedAnswer: number = scope.get('answer')

void answer
void scopedAnswer

const lifetime: Lifetime = 'scoped'
const options: ContainerOptions = {fast: true}
const factoryContainer = new Container(options)
  .registerValue('source', 1)
  .registerFactory(
    'derived',
    (c) => c.get('source') + 1,
    ['source'],
    'singleton',
    'derivedLazy'
  )
const derived: number = factoryContainer.get('derivedLazy').get()

interface RequestContext {
  readonly requestId: string
}

class Handler {
  constructor(readonly request: RequestContext) {}
}

type RequestInputs = ScopeInputMap<{request: RequestContext}>
type RequestOutput = {
  handler: WithRequirements<Spec<Handler, 'scoped'>, 'request'>
}

const requestModule: Module<RequestInputs, RequestOutput> = (c) =>
  c.registerClass('handler', Handler, ['request'], 'scoped')

const requestRoot = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .use(requestModule)
const zeroArgumentScope: ReturnType<typeof requestRoot.createScope> =
  requestRoot.createScope()

// @ts-expect-error — ReturnType resolves to the final zero-argument overload
zeroArgumentScope.get('request')

const requestScope = requestRoot.createScope({
  request: {requestId: 'request'}
})
const handler: Handler = requestScope.get('handler')

function resolveSync<
  T extends DependenciesMap,
  K extends Container.SyncReadyKeys<Container<T>>
>(container: Container<T>, key: K): T[K]['type'] {
  return container.get(key)
}

const syncHandler: Handler = resolveSync(requestScope, 'handler')

function resolveReady<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K): Promise<Awaited<T[K]['type']>> {
  return container.getAsync(key)
}

const resolvedHandler: Handler = await resolveReady(requestScope, 'handler')

class Database {}
class Repository {
  constructor(readonly database: Database) {}
}

type AsyncOutput = {database: AsyncSpec<Database>}
const databaseModule: Module<Record<never, never>, AsyncOutput> = (c) =>
  c.registerAsyncFactory('database', async () => new Database(), [])
const asyncContainer = new Container()
  .use(databaseModule)
  .registerClass('repository', Repository, ['database'])
const database: Database = await asyncContainer.getAsync('database')
const repository: Repository = await asyncContainer.getAsync('repository')

type LazyOutput = {
  database: AsyncSpec<Database>
  databaseLazy: AsyncLazySpec<Database, 'singleton'>
}
const lazyDatabaseModule: Module<Record<never, never>, LazyOutput> = (c) =>
  c.registerAsyncFactory(
    'database',
    async () => new Database(),
    [],
    undefined,
    'databaseLazy'
  )
const lazyContainer = new Container().use(lazyDatabaseModule)
const databaseLazy: AsyncLazy<Database> = lazyContainer.get('databaseLazy')
const lazyDatabase: Database = await databaseLazy.get()

const mixedDatabaseKey: 'localDatabase' | 'remoteDatabase' = Math.random() > 0.5
  ? 'localDatabase'
  : 'remoteDatabase'
const mixedContainer = new Container()
  .registerValue('localDatabase', new Database())
  .registerAsyncFactory('remoteDatabase', async () => new Database(), [])
  .registerClass(
    'repository',
    Repository,
    [mixedDatabaseKey],
    'singleton',
    'repositoryLazy'
  )
const mixedRepositoryLazy: Lazy<Repository> | AsyncLazy<Repository> =
  mixedContainer.get('repositoryLazy')

function acceptsSyncCompanion(
  container: Container<{
    clock: Spec<Database, 'singleton'>
    clockLazy: LazySpec<Database, 'singleton'>
  }>
): void {
  container.get('clockLazy')
}

// @ts-expect-error — declarative async keys are not accepted by get()
asyncContainer.get('database')
// @ts-expect-error — async status propagates through registerClass()
asyncContainer.get('repository')

void handler
void syncHandler
void resolvedHandler
void database
void repository
void lazyDatabase
void mixedRepositoryLazy
void acceptsSyncCompanion
void lifetime
void derived
