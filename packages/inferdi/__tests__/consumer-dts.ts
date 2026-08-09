import {
  Container,
  type DependenciesMap,
  type Module,
  type ScopeInputMap,
  type Spec,
  type WithRequirements
} from '../dist/index.js'

using container = new Container().registerValue('answer', 42)

const answer: number = container.get('answer')

await using scope = container.createScope()

const scopedAnswer: number = scope.get('answer')

void answer
void scopedAnswer

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

function resolveReady<
  T extends DependenciesMap,
  K extends Container.ReadyKeys<Container<T>>
>(container: Container<T>, key: K): T[K]['type'] {
  return container.get(key)
}

const resolvedHandler: Handler = resolveReady(requestScope, 'handler')

void handler
void resolvedHandler
