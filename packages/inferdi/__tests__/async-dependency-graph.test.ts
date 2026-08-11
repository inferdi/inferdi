import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {Container} from '../src/Container'
import {
  OrderedDisposable,
  Throwing,
  TrackableAsync
} from './helpers'

class Database {
  constructor(public readonly id = 1) {}
}

class Repository {
  constructor(public readonly db: Database) {}
}

class Service {
  constructor(public readonly repository: Repository) {}
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (reason: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {promise, resolve, reject}
}

const turn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

describe('compact async dependency graph — resolution', () => {
  it('always defers user factory code behind a native Promise', async () => {
    let calls = 0
    const c = new Container().registerAsyncFactory(
      'db',
      () => {
        calls++
        return new Database()
      },
      []
    )

    const pending = c.getAsync('db')

    expect(pending).toBeInstanceOf(Promise)
    expect(calls).toBe(0)
    await expect(pending).resolves.toBeInstanceOf(Database)
    expect(calls).toBe(1)
  })

  it('injects sync and async dependencies in positional order', async () => {
    const db = new Database()
    const c = new Container()
      .registerValue('config', {url: 'postgres://localhost/app'})
      .registerAsyncFactory('db', async () => db, [])
      .registerAsyncFactory(
        'service',
        (config, resolvedDb) => ({config, resolvedDb}),
        ['config', 'db']
      )

    await expect(c.getAsync('service')).resolves.toEqual({
      config: {url: 'postgres://localhost/app'},
      resolvedDb: db
    })
  })

  it('starts independent dependencies before waiting for all of them', async () => {
    const a = deferred<number>()
    const b = deferred<number>()
    const started: string[] = []
    const c = new Container()
      .registerAsyncFactory('a', (_prelude: number) => {
        started.push('a')
        return a.promise
      }, [])
      .registerAsyncFactory('b', () => {
        started.push('b')
        return b.promise
      }, [])
      .registerAsyncFactory('sum', (av, bv) => av + bv, ['a', 'b'])

    const result = c.getAsync('sum')
    await Promise.resolve()
    await Promise.resolve()
    expect(started).toEqual(['a', 'b'])

    a.resolve(2)
    b.resolve(3)
    await expect(result).resolves.toBe(5)
  })

  it('assimilates a custom factory result thenable', async () => {
    const db = new Database()
    const events: string[] = []
    const thenable = {
      get then() {
        events.push('get then')
        return (resolve: (value: Database) => void) => {
          events.push('call then')
          resolve(db)
        }
      }
    } as unknown as PromiseLike<Database>
    const c = new Container().registerAsyncFactory('db', () => thenable, [])

    await expect(c.getAsync('db')).resolves.toBe(db)
    expect(events).toEqual(['get then', 'call then'])
  })

  it('passes an unmarked legacy Promise through by identity during injection', async () => {
    const legacy = Promise.resolve(new Database())
    let injected: Promise<Database> | undefined
    const c = new Container()
      .registerFactory('legacy', () => legacy)
      .registerAsyncFactory(
        'service',
        (value: Promise<Database>) => {
          injected = value
          return {value}
        },
        ['legacy']
      )

    const service = await c.getAsync('service')

    expect(injected).toBe(legacy)
    expect(service.value).toBe(legacy)
    expect(c.get('legacy')).toBe(legacy)
  })

  it('passes an unmarked legacy Promise through an async class by identity', async () => {
    class Holder {
      constructor(
        public readonly db: Database,
        public readonly legacy: Promise<Database>
      ) {}
    }
    const db = new Database()
    const legacy = Promise.resolve(new Database(2))
    const c = new Container()
      .registerAsyncFactory('db', async () => db, [])
      .registerFactory('legacy', () => legacy)
      .registerClass('holder', Holder, ['db', 'legacy'])

    const holder = await c.getAsync('holder')

    expect(holder.db).toBe(db)
    expect(holder.legacy).toBe(legacy)
  })

  it('applies normal await semantics to a top-level Promise-valued sync key', async () => {
    const db = new Database()
    const c = new Container().registerFactory('legacy', () => Promise.resolve(db))

    await expect(c.getAsync('legacy')).resolves.toBe(db)
  })

  it('turns synchronous factory and lookup errors into rejections', async () => {
    const factoryError = new Error('factory failed')
    const c = new Container().registerAsyncFactory('db', () => {
      throw factoryError
    }, [])

    await expect(c.getAsync('db')).rejects.toBe(factoryError)
    await expect(c.getAsync('db')).rejects.toBe(factoryError)

    await expect(
      (new Container() as unknown as {getAsync(key: string): Promise<unknown>})
        .getAsync('missing')
    ).rejects.toThrow('Key "missing" not found')
  })
})

describe('compact async dependency graph — single-flight and lifetimes', () => {
  it('shares one singleton initialization across 100 callers', async () => {
    let calls = 0
    const c = new Container().registerAsyncFactory('db', async () => {
      calls++
      await Promise.resolve()
      return new Database()
    }, [])

    const values = await Promise.all(
      Array.from({length: 100}, () => c.getAsync('db'))
    )

    expect(calls).toBe(1)
    expect(new Set(values).size).toBe(1)
  })

  it('shares scoped initialization inside one scope and isolates two scopes', async () => {
    let singletonCalls = 0
    let scopedCalls = 0
    const root = new Container()
      .registerAsyncFactory('db', async () => {
        singletonCalls++
        return new Database(singletonCalls)
      }, [])
      .registerAsyncFactory('repository', async (db) => {
        scopedCalls++
        return {db, id: scopedCalls}
      }, ['db'], 'scoped')
    const a = root.createScope()
    const b = root.createScope()

    const [a1, a2, b1] = await Promise.all([
      a.getAsync('repository'),
      a.getAsync('repository'),
      b.getAsync('repository')
    ])

    expect(singletonCalls).toBe(1)
    expect(scopedCalls).toBe(2)
    expect(a1).toBe(a2)
    expect(a1).not.toBe(b1)
    expect(a1.db).toBe(b1.db)
  })

  it('runs transient initialization per resolve and leaves ownership to the caller', async () => {
    const created: TrackableAsync[] = []
    const c = new Container().registerAsyncFactory('resource', () => {
      const value = new TrackableAsync()
      created.push(value)
      return value
    }, [], 'transient')

    const [a, b] = await Promise.all([
      c.getAsync('resource'),
      c.getAsync('resource')
    ])
    await c.dispose()

    expect(created).toHaveLength(2)
    expect(a).not.toBe(b)
    expect(created.map((value) => value.asyncDisposeCalls)).toEqual([0, 0])
  })

  it('keeps a rejected singleton Promise as stable failed state', async () => {
    const error = new Error('connect failed')
    let calls = 0
    const c = new Container().registerAsyncFactory('db', async () => {
      calls++
      throw error
    }, [])

    const first = c.getAsync('db')
    const second = c.getAsync('db')

    expect(first).toBe(second)
    await expect(first).rejects.toBe(error)
    await expect(second).rejects.toBe(error)
    expect(calls).toBe(1)
  })

  it('uses the same compact path in fast mode', async () => {
    const c = new Container({strict: false})
      .registerAsyncFactory('db', async () => new Database(), [])
      .registerClass('repository', Repository, ['db'])

    await expect(c.getAsync('repository')).resolves.toBeInstanceOf(Repository)
  })
})

describe('compact async dependency graph — aborted preflight', () => {
  let rejections: unknown[] = []
  let handler: (reason: unknown) => void

  beforeEach(() => {
    rejections = []
    handler = (reason) => rejections.push(reason)
    process.on('unhandledRejection', handler)
  })

  afterEach(() => {
    process.off('unhandledRejection', handler)
  })

  it('stops at a synchronous sibling error and observes an earlier async rejection', async () => {
    const asyncError = new Error('async dependency failed')
    const siblingError = new Error('sibling failed')
    const visited: string[] = []
    const gate = deferred<Database>()
    const c = new Container()
      .registerFactory('aPrelude', () => {
        visited.push('a')
        return 1
      })
      .registerAsyncFactory('a', () => {
        return gate.promise
      }, ['aPrelude'])
      .registerFactory('b', (): number => {
        visited.push('b')
        throw siblingError
      }, 'transient')
      .registerFactory('c', () => {
        visited.push('c')
        return 3
      }, 'transient')
      .registerAsyncFactory(
        'parent',
        (_a: Database, _b: number, _c: number) => 'unreachable',
        ['a', 'b', 'c'],
        'transient'
      )

    await expect(c.getAsync('parent')).rejects.toBe(siblingError)
    expect(visited).toEqual(['a', 'b'])

    gate.reject(asyncError)
    await turn()
    await turn()

    expect(rejections).toEqual([])
    await expect(c.getAsync('a')).rejects.toBe(asyncError)
    await expect(c.dispose()).rejects.toBe(asyncError)
  })

  it('observes an earlier legacy Promise without replacing its identity', async () => {
    const asyncError = new Error('legacy failed')
    const siblingError = new Error('sibling failed')
    const legacy = deferred<Database>()
    const c = new Container()
      .registerFactory('legacy', () => legacy.promise)
      .registerFactory('b', (): number => {
        throw siblingError
      }, 'transient')
      .registerAsyncFactory(
        'parent',
        (_legacy: Promise<Database>, _b: number) => 'unreachable',
        ['legacy', 'b'],
        'transient'
      )

    await expect(c.getAsync('parent')).rejects.toBe(siblingError)
    expect(c.get('legacy')).toBe(legacy.promise)

    legacy.reject(asyncError)
    await turn()
    await turn()

    expect(rejections).toEqual([])
    await expect(c.get('legacy')).rejects.toBe(asyncError)
    await expect(c.dispose()).rejects.toBe(asyncError)
  })

  it('does not roll back or take ownership of an earlier async transient', async () => {
    const siblingError = new Error('sibling failed')
    const gate = deferred<TrackableAsync>()
    const resource = new TrackableAsync()
    let starts = 0
    const c = new Container()
      .registerAsyncFactory('a', () => {
        starts++
        return gate.promise
      }, [], 'transient')
      .registerFactory('b', (): number => {
        throw siblingError
      }, 'transient')
      .registerAsyncFactory(
        'parent',
        (_a: TrackableAsync, _b: number) => 'unreachable',
        ['a', 'b'],
        'transient'
      )

    await expect(c.getAsync('parent')).rejects.toBe(siblingError)
    gate.resolve(resource)
    await turn()
    await c.dispose()

    expect(starts).toBe(1)
    expect(resource.asyncDisposeCalls).toBe(0)
  })

  it('retries synchronous parent preflight without caching a failed parent state', async () => {
    let siblingCalls = 0
    let parentCalls = 0
    const c = new Container()
      .registerFactory('bad', (): number => {
        siblingCalls++
        throw new Error('bad dependency')
      })
      .registerAsyncFactory('parent', (_bad: number) => {
        parentCalls++
        return 'unreachable'
      }, ['bad'])

    await expect(c.getAsync('parent')).rejects.toThrow('bad dependency')
    await expect(c.getAsync('parent')).rejects.toThrow('bad dependency')

    expect(siblingCalls).toBe(2)
    expect(parentCalls).toBe(0)
  })

  it('leaves already-collected ready values untouched on aborted preflight', async () => {
    const error = new Error('sibling failed')
    const c = new Container()
      .registerValue('ready', 1)
      .registerFactory('bad', (): number => {
        throw error
      })
      .registerAsyncFactory(
        'parent',
        (_ready: number, _bad: number) => 'unreachable',
        ['ready', 'bad']
      )

    await expect(c.getAsync('parent')).rejects.toBe(error)
    expect(c.get('ready')).toBe(1)
  })
})

describe('compact async dependency graph — classes and guards', () => {
  it('propagates async values through multiple class levels', async () => {
    const db = new Database()
    const c = new Container()
      .registerAsyncFactory('db', async () => db, [])
      .registerClass('repository', Repository, ['db'])
      .registerClass('service', Service, ['repository'])

    const service = await c.getAsync('service')

    expect(service).toBeInstanceOf(Service)
    expect(service.repository).toBeInstanceOf(Repository)
    expect(service.repository.db).toBe(db)
  })

  it('detects a declared async cycle during synchronous preflight', async () => {
    const c = new Container() as unknown as {
      registerAsyncFactory(
        key: string,
        factory: (...args: unknown[]) => unknown,
        deps: string[]
      ): unknown
      getAsync(key: string): Promise<unknown>
    }

    c.registerAsyncFactory('a', (b) => b, ['b'])
    c.registerAsyncFactory('b', (a) => a, ['a'])

    await expect(c.getAsync('a')).rejects.toThrow(
      /Circular dependency detected: a -> b -> a/
    )
  })

  it('shares a pending singleton in a diamond graph without a false cycle', async () => {
    let sharedCalls = 0
    const c = new Container()
      .registerAsyncFactory('shared', async () => {
        sharedCalls++
        return new Database()
      }, [])
      .registerAsyncFactory('left', (shared) => ({shared, side: 'left'}), ['shared'])
      .registerAsyncFactory('right', (shared) => ({shared, side: 'right'}), ['shared'])
      .registerAsyncFactory('top', (left, right) => ({left, right}), ['left', 'right'])

    const top = await c.getAsync('top')

    expect(sharedCalls).toBe(1)
    expect(top.left.shared).toBe(top.right.shared)
  })

  it('rejects a cold async scoped dependency captured by a cast singleton', async () => {
    const root = new Container()
      .registerAsyncFactory('requestDb', async () => new Database(), [], 'scoped')
    const scope = root.createScope()
    const unsafe = scope as unknown as {
      registerAsyncFactory(
        key: string,
        factory: (...args: unknown[]) => unknown,
        deps: string[],
        kind: 'singleton'
      ): void
      getAsync(key: string): Promise<unknown>
    }

    unsafe.registerAsyncFactory('bad', (db) => db, ['requestDb'], 'singleton')

    await expect(unsafe.getAsync('bad')).rejects.toThrow(
      /Singleton "bad" cannot depend on scoped "requestDb"/
    )
  })

  it('preserves the existing warmed-dependency cache-first lifetime boundary', async () => {
    const root = new Container()
      .registerAsyncFactory('requestDb', async () => new Database(), [], 'scoped')
    const scope = root.createScope()
    const warmed = await scope.getAsync('requestDb')
    const unsafe = scope as unknown as {
      registerAsyncFactory(
        key: string,
        factory: (...args: unknown[]) => unknown,
        deps: string[],
        kind: 'singleton'
      ): void
      getAsync(key: string): Promise<unknown>
    }

    unsafe.registerAsyncFactory('allowedByCache', (db) => db, ['requestDb'], 'singleton')

    await expect(unsafe.getAsync('allowedByCache')).resolves.toBe(warmed)
  })

  it('accepts a synchronous Lazy singleton dependency', async () => {
    const c = new Container()
      .registerClass('db', Database, [], 'singleton', 'dbLazy')
      .registerAsyncFactory('holder', (lazy) => ({lazy}), ['dbLazy'])

    const holder = await c.getAsync('holder')

    expect(holder.lazy.get()).toBe(c.get('db'))
  })

  it('rejects an actual async lazy companion atomically before registration', async () => {
    const c = new Container().registerAsyncFactory('db', async () => new Database(), [])
    const unsafe = c as unknown as {
      registerClass(
        key: string,
        Ctor: new (...args: unknown[]) => unknown,
        deps: string[],
        kind: 'singleton',
        lazyKey?: string
      ): void
    }

    expect(() => unsafe.registerClass(
      'repository',
      Repository as unknown as new (...args: unknown[]) => unknown,
      ['db'],
      'singleton',
      'repositoryLazy'
    )).toThrow(/Cannot create a synchronous Lazy companion/)
    expect(c.has('repository')).toBe(false)
    expect(c.has('repositoryLazy')).toBe(false)

    const completed = c.registerClass('repository', Repository, ['db'])
    await expect(completed.getAsync('repository')).resolves.toBeInstanceOf(Repository)
  })

  it('does not synthesize a runtime marker for a conservative sync union branch', () => {
    const c = new Container()
      .registerValue('localDb', new Database())
      .registerAsyncFactory('remoteDb', async () => new Database(2), [])
    const selected = 'localDb' as 'localDb' | 'remoteDb'
    const unsafe = c as unknown as {
      registerClass(
        key: string,
        Ctor: new (...args: unknown[]) => unknown,
        deps: (string | symbol)[],
        kind: 'singleton',
        lazyKey: string
      ): void
    }

    unsafe.registerClass(
      'repository',
      Repository as unknown as new (...args: unknown[]) => unknown,
      [selected],
      'singleton',
      'repositoryLazy'
    )

    expect(c.has('repository')).toBe(true)
    expect(c.has('repositoryLazy')).toBe(true)
    expect(
      (c as unknown as {get(key: string): Repository}).get('repository')
    ).toBeInstanceOf(Repository)
  })
})

describe('compact async dependency graph — PromiseLike reentrancy', () => {
  it.each(['singleton', 'scoped'] as const)(
    'writes the pending %s Promise before reading the result thenable',
    async (kind) => {
      let calls = 0
      let reentrant: Promise<{readonly id: number}> | undefined
      let c!: {getAsync(key: 'value'): Promise<{readonly id: number}>}
      const root = new Container().registerAsyncFactory(
        'value',
        () => {
          calls++
          const value = {id: calls}
          return {
            get then() {
              reentrant = c.getAsync('value')
              return (resolve: (result: {readonly id: number}) => void) => resolve(value)
            }
          }
        },
        [],
        kind
      )
      c = kind === 'scoped' ? root.createScope() : root

      const first = c.getAsync('value')
      const value = await first

      expect(reentrant).toBe(first)
      expect(await reentrant!).toBe(value)
      expect(calls).toBe(1)
    }
  )

  it('starts a second transient initialization on controlled reentry', async () => {
    let calls = 0
    let reentrant: Promise<{readonly id: number}> | undefined
    let c!: {getAsync(key: 'value'): Promise<{readonly id: number}>}
    const build = () => new Container().registerAsyncFactory(
      'value',
      () => {
        const id = ++calls
        const value = {id}
        return {
          get then() {
            if (id === 1) {
              reentrant = c.getAsync('value')
            }
            return (resolve: (result: {readonly id: number}) => void) => resolve(value)
          }
        }
      },
      [],
      'transient'
    )
    c = build()

    const first = c.getAsync('value')
    const firstValue = await first
    expect(reentrant).toBeDefined()
    const secondValue = await reentrant!

    expect(reentrant).not.toBe(first)
    expect(firstValue).not.toBe(secondValue)
    expect(calls).toBe(2)
  })

  it('caches a throwing then getter for singleton and retries it for transient', async () => {
    const error = new Error('then getter failed')
    let singletonCalls = 0
    const singleton = new Container().registerAsyncFactory('value', () => {
      singletonCalls++
      return Object.defineProperty({}, 'then', {
        get() {
          throw error
        }
      }) as PromiseLike<unknown>
    }, [])

    await expect(singleton.getAsync('value')).rejects.toBe(error)
    await expect(singleton.getAsync('value')).rejects.toBe(error)
    expect(singletonCalls).toBe(1)

    let transientCalls = 0
    const transient = new Container().registerAsyncFactory('value', () => {
      transientCalls++
      return Object.defineProperty({}, 'then', {
        get() {
          throw error
        }
      }) as PromiseLike<unknown>
    }, [], 'transient')

    await expect(transient.getAsync('value')).rejects.toBe(error)
    await expect(transient.getAsync('value')).rejects.toBe(error)
    expect(transientCalls).toBe(2)
  })
})

describe('compact async dependency graph — scopes, override, has, and disposal', () => {
  it('propagates scope inputs into nested async graphs with isolated scoped values', async () => {
    class RequestContext {
      constructor(public readonly id: string) {}
    }
    class Session {
      constructor(public readonly request: RequestContext, public readonly sequence: number) {}
    }
    class RequestService {
      constructor(public readonly session: Session) {}
    }
    const request = new RequestContext('request-1')
    let calls = 0
    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .registerAsyncFactory(
        'session',
        async (input) => new Session(input, ++calls),
        ['request'],
        'scoped'
      )
      .registerClass('service', RequestService, ['session'], 'scoped')
    const scope = root.createScope({request})
    const nested = scope.createScope()

    const first = await scope.getAsync('service')
    const second = await nested.getAsync('service')

    expect(first).not.toBe(second)
    expect(first.session).not.toBe(second.session)
    expect(first.session.request).toBe(request)
    expect(second.session.request).toBe(request)
    expect(calls).toBe(2)
  })

  it('preserves the runtime marker and external ownership through ready override', async () => {
    class Holder {
      constructor(public readonly db: TrackableAsync) {}
    }
    const mock = new TrackableAsync()
    const c = new Container()
      .registerAsyncFactory('db', async () => mock, [])
      .override('db', mock)
      .registerClass('dependent', Holder, ['db'])

    await expect(c.getAsync('dependent')).resolves.toMatchObject({db: mock})
    await c.dispose()

    expect(mock.asyncDisposeCalls).toBe(0)
  })

  it('keeps ready scoped override cache-first semantics on root', async () => {
    const mock = new Database()
    const root = new Container()
      .registerAsyncFactory('requestDb', async () => new Database(2), [], 'scoped')
      .override('requestDb', mock)

    await expect(root.getAsync('requestDb')).resolves.toBe(mock)
  })

  it('has() sees async keys without starting them and forgets them on disposal', async () => {
    let calls = 0
    const c = new Container().registerAsyncFactory('db', async () => {
      calls++
      return new Database()
    }, [])

    expect(c.has('db')).toBe(true)
    expect(calls).toBe(0)
    await c.dispose()
    expect(c.has('db')).toBe(false)
    expect(calls).toBe(0)
  })

  it('waits for a pending owned initialization and disposes its result', async () => {
    const gate = deferred<TrackableAsync>()
    const resource = new TrackableAsync()
    const c = new Container().registerAsyncFactory('resource', () => gate.promise, [])
    const initialization = c.getAsync('resource')
    const disposal = c.dispose()

    expect(resource.asyncDisposeCalls).toBe(0)
    gate.resolve(resource)

    await expect(initialization).resolves.toBe(resource)
    await expect(disposal).resolves.toBeUndefined()
    expect(resource.asyncDisposeCalls).toBe(1)
    await expect(c.getAsync('resource')).rejects.toThrow('Container is disposed')
  })

  it('surfaces the same rejected owned initialization again during disposal', async () => {
    const error = new Error('connect failed')
    const c = new Container().registerAsyncFactory('resource', async () => {
      throw error
    }, [])

    await expect(c.getAsync('resource')).rejects.toBe(error)
    await expect(c.dispose()).rejects.toBe(error)
  })

  it('requires async disposal even after an owned async resource is fulfilled', async () => {
    const resource = new TrackableAsync()
    const c = new Container().registerAsyncFactory('resource', async () => resource, [])

    await c.getAsync('resource')

    expect(() => c[Symbol.dispose]()).toThrow(/cached a Promise from an async factory/)
    expect(resource.asyncDisposeCalls).toBe(0)
  })

  it('supports Symbol.asyncDispose and await using for owned async resources', async () => {
    const explicit = new TrackableAsync()
    const c = new Container()
      .registerAsyncFactory('resource', async () => explicit, [])
    await c.getAsync('resource')
    await c[Symbol.asyncDispose]()
    expect(explicit.asyncDisposeCalls).toBe(1)

    const block = new TrackableAsync()
    {
      await using scope = new Container()
        .registerAsyncFactory('resource', async () => block, [])
      await scope.getAsync('resource')
    }
    expect(block.asyncDisposeCalls).toBe(1)
  })

  it('preserves LIFO and resolved-instance de-duplication for declarative async resources', async () => {
    const log: string[] = []
    const shared = new OrderedDisposable('A', log)
    const c = new Container()
      .registerAsyncFactory('a', async () => shared, [])
      .registerFactory('sync', () => new OrderedDisposable('S', log))
      .registerAsyncFactory('b', async () => new OrderedDisposable('B', log), [])
      .registerAsyncFactory('aAlias', async () => shared, [])

    await c.getAsync('a')
    c.get('sync')
    await c.getAsync('b')
    await c.getAsync('aAlias')
    await c.dispose()

    expect(log).toEqual(['A', 'B', 'S'])
  })

  it('aggregates declarative async teardown failures without skipping resources', async () => {
    const ok = new TrackableAsync()
    const c = new Container()
      .registerAsyncFactory('first', async () => new Throwing('first failed'), [])
      .registerAsyncFactory('ok', async () => ok, [])
      .registerAsyncFactory('second', async () => new Throwing('second failed'), [])

    await c.getAsync('first')
    await c.getAsync('ok')
    await c.getAsync('second')

    const error = await c.dispose().catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(AggregateError)
    expect((error as AggregateError).errors.map((reason: Error) => reason.message)).toEqual([
      'second failed',
      'first failed'
    ])
    expect(ok.asyncDisposeCalls).toBe(1)
  })

  it('rejects registration on a disposed container', async () => {
    const c = new Container()
    await c.dispose()

    expect(() => c.registerAsyncFactory('db', async () => new Database(), []))
      .toThrow(/Cannot register on a disposed container/)
  })
})
