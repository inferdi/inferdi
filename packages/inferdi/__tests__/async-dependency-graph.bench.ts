import {bench, describe} from 'vitest'
import {Container} from '../src/Container'

class Database {
  public readonly ready = true
}

class Repository {
  constructor(public readonly db: Database) {}
}

class WideService {
  constructor(
    public readonly db: Database,
    public readonly a: number,
    public readonly b: number,
    public readonly c: number,
    public readonly d: number
  ) {}
}

describe('async graph sync isolation', () => {
  const mixed = new Container()
    .registerValue('sync', {value: 1})
    .registerValue('syncDb', new Database())
    .registerFactory('transient', () => ({value: 1}), 'transient')
    .registerClass('syncClass', Repository, ['syncDb'], 'transient')
    .registerAsyncFactory('async', async () => new Database(), [])
  mixed.get('sync')

  bench('sync cache hit in mixed container', () => {
    mixed.get('sync')
  })

  bench('sync transient resolve in mixed container', () => {
    mixed.get('transient')
  })

  bench('sync class cold resolve in mixed container', () => {
    mixed.get('syncClass')
  })

  bench('sync local cache miss in mixed container', () => {
    const c = new Container()
      .registerFactory('sync', () => ({value: 1}))
      .registerAsyncFactory('async', async () => new Database(), [])
    c.get('sync')
  })
})

describe('async graph resolution', () => {
  const warm = new Container()
    .registerAsyncFactory('db', async () => new Database(), [])
  warm.getAsync('db')

  bench('async singleton warm resolve', async () => {
    await warm.getAsync('db')
  })

  bench('async singleton cold resolve', async () => {
    const c = new Container()
      .registerAsyncFactory('db', async () => new Database(), [])
    await c.getAsync('db')
  }, {iterations: 1000})

  const scopedRoot = new Container()
    .registerAsyncFactory('db', async () => new Database(), [], 'scoped')

  bench('async scoped cold resolve', async () => {
    await scopedRoot.createScope().getAsync('db')
  }, {iterations: 1000})

  const oneDep = new Container()
    .registerValue('a', 1)
    .registerAsyncFactory('value', async (a) => a, ['a'], 'transient')

  bench('async transient with one warmed dependency', async () => {
    await oneDep.getAsync('value')
  })

  const fiveDeps = new Container()
    .registerValue('a', 1)
    .registerValue('b', 2)
    .registerValue('c', 3)
    .registerValue('d', 4)
    .registerValue('e', 5)
    .registerAsyncFactory(
      'value',
      async (a, b, c, d, e) => a + b + c + d + e,
      ['a', 'b', 'c', 'd', 'e'],
      'transient'
    )

  bench('async transient with five warmed dependencies', async () => {
    await fiveDeps.getAsync('value')
  })

  const oneClass = new Container()
    .registerAsyncFactory('db', async () => new Database(), [])
    .registerClass('repository', Repository, ['db'], 'transient')

  bench('async class with one dependency', async () => {
    await oneClass.getAsync('repository')
  })

  const wideClass = new Container()
    .registerAsyncFactory('db', async () => new Database(), [])
    .registerValue('a', 1)
    .registerValue('b', 2)
    .registerValue('c', 3)
    .registerValue('d', 4)
    .registerClass('service', WideService, ['db', 'a', 'b', 'c', 'd'], 'transient')

  bench('async class with five mixed dependencies', async () => {
    await wideClass.getAsync('service')
  })

  bench('100-way singleton single-flight', async () => {
    const c = new Container()
      .registerAsyncFactory('db', async () => new Database(), [])
    await Promise.all(Array.from({length: 100}, () => c.getAsync('db')))
  }, {iterations: 100})
})

describe('AsyncLazy overhead', () => {
  bench('register async factory + get wrapper', () => {
    new Container()
      .registerAsyncFactory('db', () => new Database(), [], undefined, 'dbLazy')
      .get('dbLazy')
  })

  bench('register async factory + first wrapper.get()', async () => {
    const wrapper = new Container()
      .registerAsyncFactory('db', () => new Database(), [], undefined, 'dbLazy')
      .get('dbLazy')
    await wrapper.get()
  }, {iterations: 1000})

  bench('register async factory + direct getAsync(target)', async () => {
    const c = new Container()
      .registerAsyncFactory('db', () => new Database(), [])
    await c.getAsync('db')
  }, {iterations: 1000})

  const warm = new Container()
    .registerAsyncFactory('db', () => new Database(), [], undefined, 'dbLazy')
  const wrapper = warm.get('dbLazy')
  wrapper.get()

  bench('warm singleton AsyncLazy.get()', async () => {
    await wrapper.get()
  })
})

describe('registration-time async classification', () => {
  bench('register sync class with zero dependencies', () => {
    new Container().registerClass('db', Database, [])
  })

  bench('register async factory with zero dependencies', () => {
    new Container().registerAsyncFactory('value', () => 1, [])
  })

  bench('register async class with one dependency', () => {
    new Container()
      .registerAsyncFactory('db', () => new Database(), [])
      .registerClass('repository', Repository, ['db'])
  })

  bench('register async class with five dependencies', () => {
    new Container()
      .registerAsyncFactory('db', () => new Database(), [])
      .registerValue('a', 1)
      .registerValue('b', 2)
      .registerValue('c', 3)
      .registerValue('d', 4)
      .registerClass('service', WideService, ['db', 'a', 'b', 'c', 'd'])
  })
})
