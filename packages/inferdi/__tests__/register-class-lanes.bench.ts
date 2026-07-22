import {bench, describe} from 'vitest'
import {Container} from '../src/Container'

const BENCH_OPTIONS = {time: 300, warmupTime: 150} as const

let sink = 0

class L0 {}
class L1 { constructor(readonly value: L0) {} }
class L2 { constructor(readonly value: L1) {} }
class L3 { constructor(readonly value: L2) {} }
class L4 { constructor(readonly value: L3) {} }
class L5 { constructor(readonly value: L4) {} }
class L6 { constructor(readonly value: L5) {} }
class L7 { constructor(readonly value: L6) {} }
class L8 { constructor(readonly value: L7) {} }
class L9 { constructor(readonly value: L8) {} }

interface Checksum {
  readonly checksum: number
}

class Config implements Checksum { readonly checksum = 2 }
class Database implements Checksum { readonly checksum = 3 }
class Logger implements Checksum { readonly checksum = 5 }
class FeatureFlags implements Checksum { readonly checksum = 7 }
class Metrics implements Checksum { readonly checksum = 11 }
class RequestContext implements Checksum { readonly checksum = 13 }
class Auth implements Checksum { constructor(readonly context: Checksum, readonly config: Checksum) {} get checksum() { return this.context.checksum + this.config.checksum + 17 } }
class Policy implements Checksum { constructor(readonly auth: Checksum, readonly flags: Checksum) {} get checksum() { return this.auth.checksum + this.flags.checksum + 19 } }
class Repository implements Checksum { constructor(readonly database: Checksum, readonly context: Checksum, readonly logger: Checksum) {} get checksum() { return this.database.checksum + this.context.checksum + this.logger.checksum + 23 } }
class Query implements Checksum { constructor(readonly repository: Checksum, readonly policy: Checksum) {} get checksum() { return this.repository.checksum + this.policy.checksum + 29 } }
class Audit implements Checksum { constructor(readonly logger: Checksum, readonly context: Checksum) {} get checksum() { return this.logger.checksum + this.context.checksum + 31 } }
class Cache implements Checksum { constructor(readonly config: Checksum) {} get checksum() { return this.config.checksum + 37 } }
class Command implements Checksum { constructor(readonly query: Checksum, readonly audit: Checksum, readonly cache: Checksum) {} get checksum() { return this.query.checksum + this.audit.checksum + this.cache.checksum + 41 } }
class Response implements Checksum { constructor(readonly command: Checksum, readonly context: Checksum) {} get checksum() { return this.command.checksum + this.context.checksum + 43 } }
class Controller implements Checksum { constructor(readonly response: Checksum, readonly metrics: Checksum, readonly logger: Checksum) {} get checksum() { return this.response.checksum + this.metrics.checksum + this.logger.checksum + 47 } }

function build(strict: boolean, kind: 'singleton' | 'transient' = 'transient') {
  return new Container({strict})
    .registerClass('l0', L0, [], kind)
    .registerClass('l1', L1, ['l0'], kind)
    .registerClass('l2', L2, ['l1'], kind)
    .registerClass('l3', L3, ['l2'], kind)
    .registerClass('l4', L4, ['l3'], kind)
    .registerClass('l5', L5, ['l4'], kind)
    .registerClass('l6', L6, ['l5'], kind)
    .registerClass('l7', L7, ['l6'], kind)
    .registerClass('l8', L8, ['l7'], kind)
    .registerClass('l9', L9, ['l8'], kind)
}

function buildFactory(strict: boolean, kind: 'singleton' | 'transient' = 'transient') {
  return new Container({strict})
    .registerFactory('l0', () => new L0(), kind)
    .registerFactory('l1', (c) => new L1(c.get('l0')), kind)
    .registerFactory('l2', (c) => new L2(c.get('l1')), kind)
    .registerFactory('l3', (c) => new L3(c.get('l2')), kind)
    .registerFactory('l4', (c) => new L4(c.get('l3')), kind)
    .registerFactory('l5', (c) => new L5(c.get('l4')), kind)
    .registerFactory('l6', (c) => new L6(c.get('l5')), kind)
    .registerFactory('l7', (c) => new L7(c.get('l6')), kind)
    .registerFactory('l8', (c) => new L8(c.get('l7')), kind)
    .registerFactory('l9', (c) => new L9(c.get('l8')), kind)
}

function buildRequestGraph(strict: boolean) {
  return new Container({strict})
    .registerClass('config', Config, [])
    .registerClass('database', Database, [])
    .registerClass('logger', Logger, [])
    .registerClass('flags', FeatureFlags, [])
    .registerClass('metrics', Metrics, [])
    .registerClass('context', RequestContext, [], 'scoped')
    .registerClass('auth', Auth, ['context', 'config'], 'transient')
    .registerClass('policy', Policy, ['auth', 'flags'], 'transient')
    .registerClass('repository', Repository, ['database', 'context', 'logger'], 'transient')
    .registerClass('query', Query, ['repository', 'policy'], 'transient')
    .registerClass('audit', Audit, ['logger', 'context'], 'transient')
    .registerClass('cache', Cache, ['config'], 'transient')
    .registerClass('command', Command, ['query', 'audit', 'cache'], 'transient')
    .registerClass('response', Response, ['command', 'context'], 'transient')
    .registerClass('controller', Controller, ['response', 'metrics', 'logger'], 'transient')
}

function buildRequestGraphFactory(strict: boolean) {
  return new Container({strict})
    .registerClass('config', Config, [])
    .registerClass('database', Database, [])
    .registerClass('logger', Logger, [])
    .registerClass('flags', FeatureFlags, [])
    .registerClass('metrics', Metrics, [])
    .registerClass('context', RequestContext, [], 'scoped')
    .registerFactory('auth', (c) => new Auth(c.get('context'), c.get('config')), 'transient')
    .registerFactory('policy', (c) => new Policy(c.get('auth'), c.get('flags')), 'transient')
    .registerFactory('repository', (c) => new Repository(c.get('database'), c.get('context'), c.get('logger')), 'transient')
    .registerFactory('query', (c) => new Query(c.get('repository'), c.get('policy')), 'transient')
    .registerFactory('audit', (c) => new Audit(c.get('logger'), c.get('context')), 'transient')
    .registerFactory('cache', (c) => new Cache(c.get('config')), 'transient')
    .registerFactory('command', (c) => new Command(c.get('query'), c.get('audit'), c.get('cache')), 'transient')
    .registerFactory('response', (c) => new Response(c.get('command'), c.get('context')), 'transient')
    .registerFactory('controller', (c) => new Controller(c.get('response'), c.get('metrics'), c.get('logger')), 'transient')
}

function resolveRequest(root: ReturnType<typeof buildRequestGraph>): number {
  using scope = root.createScope()
  return scope.get('controller').checksum
}

describe('registerClass deep transient graph', () => {
  const strict = build(true)
  const fast = build(false)

  bench('hot chain x10, strict', () => {
    sink ^= Number(Boolean(strict.get('l9')))
  }, BENCH_OPTIONS)

  bench('hot chain x10, fast', () => {
    sink ^= Number(Boolean(fast.get('l9')))
  }, BENCH_OPTIONS)

  bench('build only', () => {
    sink ^= Number(Boolean(build(true)))
  }, BENCH_OPTIONS)

  bench('build + first resolve, transient', () => {
    sink ^= Number(Boolean(build(true).get('l9')))
  }, BENCH_OPTIONS)

  bench('build + first resolve, singleton', () => {
    sink ^= Number(Boolean(build(true, 'singleton').get('l9')))
  }, BENCH_OPTIONS)
})

describe('direct registerFactory control', () => {
  const strict = buildFactory(true)
  const fast = buildFactory(false)

  bench('hot chain x10, strict', () => {
    sink ^= Number(Boolean(strict.get('l9')))
  }, BENCH_OPTIONS)

  bench('hot chain x10, fast', () => {
    sink ^= Number(Boolean(fast.get('l9')))
  }, BENCH_OPTIONS)

  bench('build only', () => {
    sink ^= Number(Boolean(buildFactory(true)))
  }, BENCH_OPTIONS)

  bench('build + first resolve, transient', () => {
    sink ^= Number(Boolean(buildFactory(true).get('l9')))
  }, BENCH_OPTIONS)

  bench('build + first resolve, singleton', () => {
    sink ^= Number(Boolean(buildFactory(true, 'singleton').get('l9')))
  }, BENCH_OPTIONS)
})

describe('production-shaped request graph (mixed arity)', () => {
  const classStrict = buildRequestGraph(true)
  const classFast = buildRequestGraph(false)
  const factoryStrict = buildRequestGraphFactory(true)
  const factoryFast = buildRequestGraphFactory(false)
  const expected = resolveRequest(classStrict)

  for (const root of [classFast, factoryStrict, factoryFast]) {
    if (resolveRequest(root) !== expected) throw new Error('Invalid request graph fixture')
  }

  bench('registerClass, strict: scope + transient request', () => {
    sink ^= resolveRequest(classStrict)
  }, BENCH_OPTIONS)

  bench('registerClass, fast: scope + transient request', () => {
    sink ^= resolveRequest(classFast)
  }, BENCH_OPTIONS)

  bench('registerFactory, strict: scope + transient request', () => {
    sink ^= resolveRequest(factoryStrict)
  }, BENCH_OPTIONS)

  bench('registerFactory, fast: scope + transient request', () => {
    sink ^= resolveRequest(factoryFast)
  }, BENCH_OPTIONS)

  bench('registerClass, strict: build + one request', () => {
    sink ^= resolveRequest(buildRequestGraph(true))
  }, BENCH_OPTIONS)

  bench('registerFactory, strict: build + one request', () => {
    sink ^= resolveRequest(buildRequestGraphFactory(true))
  }, BENCH_OPTIONS)
})
