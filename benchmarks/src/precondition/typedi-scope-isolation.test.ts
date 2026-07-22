import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { Container } from 'typedi'
import { ScopedService } from '../fixtures/typedi.js'

/*
 * Scenario 6 for TypeDI would be fake if scope resolve returned the global singleton
 * (which happens when @Service() is applied to ScopedService). This test catches the regression
 * BEFORE the bench runs
 */

describe('typedi scope isolation (precondition for bench 06)', () => {
  it('returns different instances per scope when registered locally', () => {
    const a = Container.of('iso-a')
    a.set({ id: 'scoped', type: ScopedService })
    const b = Container.of('iso-b')
    b.set({ id: 'scoped', type: ScopedService })

    expect(a.get<ScopedService>('scoped')).not.toBe(b.get<ScopedService>('scoped'))

    Container.reset('iso-a')
    Container.reset('iso-b')
  })

  it('Container.reset(id) gives a fresh container on next Container.of(id)', () => {
    const c1 = Container.of('reuse')
    c1.set({ id: 'scoped', type: ScopedService })
    const v1 = c1.get<ScopedService>('scoped')
    Container.reset('reuse')

    const c2 = Container.of('reuse')
    c2.set({ id: 'scoped', type: ScopedService })
    const v2 = c2.get<ScopedService>('scoped')
    Container.reset('reuse')

    expect(v1).not.toBe(v2)
  })

  it('ScopedService instance has Logger injected', () => {
    const c = Container.of('inject-check')
    c.set({ id: 'scoped', type: ScopedService })
    const v = c.get<ScopedService>('scoped')
    expect(v).toBeInstanceOf(ScopedService)
    expect(v.logger).toBeDefined()
    Container.reset('inject-check')
  })
})
