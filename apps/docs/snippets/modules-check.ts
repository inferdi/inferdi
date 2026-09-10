import { Container, type Module, type SpecMap } from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ feature: string }>

const addFeature: Module<Requirements, Provides> = (container) =>
  container.registerFactory('feature', (c) => c.get('config').env, ['config'])

// @ts-expect-error addFeature requires config
new Container().use(addFeature)

new Container()
  .registerValue('config', { env: 'test' })
  .use(addFeature)
