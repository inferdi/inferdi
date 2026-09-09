import {Container} from '@inferdi/inferdi'
import {
  inferdiReact,
  type InferdiReactBinding,
  type InferdiService,
  type InferdiStableAsyncKey,
  type InferdiStableSyncKey
} from '../dist/index.js'

class Service {
  readonly ready = true
}

const container = new Container()
  .registerClass('service', Service, [])
  .registerAsyncFactory('asyncService', async () => new Service(), [])

const binding: InferdiReactBinding<typeof container> = inferdiReact<typeof container>()
type SyncKey = InferdiStableSyncKey<typeof container>
type AsyncKey = InferdiStableAsyncKey<typeof container>
type Resolved = InferdiService<typeof container, 'service'>

const syncKey: SyncKey = 'service'
const asyncKey: AsyncKey = 'asyncService'
const resolved: Resolved = container.get(syncKey)

void binding
void asyncKey
void resolved
