import { describe, expect, it } from 'vitest'
import {
  isPublishableResult,
  mad,
  median,
  renderReport
} from '../../scripts/report-benchmarks.mjs'
import { SUBJECT_NAMES } from '../containers/subject-names.js'

function result(subject, value) {
  return {
    subject,
    supported: value !== null,
    normalizedNsPerOp: value,
    raw: value === null ? null : {}
  }
}

function round(number, checked, fast) {
  return {
    round: number,
    subjectOrder: number === 1
      ? [SUBJECT_NAMES.inferdiDefault, SUBJECT_NAMES.inferdiFast]
      : [SUBJECT_NAMES.inferdiFast, SUBJECT_NAMES.inferdiDefault],
    scenarios: [
      {
        id: 'hot-singleton',
        name: 'Hot singleton resolve',
        batchSize: 1,
        subjectOrder: [SUBJECT_NAMES.inferdiDefault, SUBJECT_NAMES.inferdiFast],
        results: [
          result(SUBJECT_NAMES.inferdiDefault, 100),
          result(SUBJECT_NAMES.inferdiFast, 101)
        ]
      },
      {
        id: 'registration',
        name: 'Registration',
        batchSize: 1,
        subjectOrder: [SUBJECT_NAMES.inferdiDefault],
        results: [
          result(SUBJECT_NAMES.inferdiDefault, checked),
          result(SUBJECT_NAMES.inferdiFast, fast)
        ]
      }
    ]
  }
}

function balancedSubjectOrders(subjects) {
  const positions = subjects.map((_, position) => {
    if (position === 0) return 0
    return position % 2 === 1
      ? (position + 1) / 2
      : subjects.length - position / 2
  })

  return subjects.map((_, round) => positions.map((position) => (
    subjects[(position + round) % subjects.length]
  )))
}

describe('benchmark report', () => {
  it('calculates median and MAD', () => {
    expect(median([8, 2, 4, 6])).toBe(5)
    expect(mad([1, 2, 4, 8, 16])).toBe(3)
  })

  it('accepts the public 100/50 ms timing profile', () => {
    const subjectOrder = [
      SUBJECT_NAMES.inferdiFast,
      SUBJECT_NAMES.inferdiDefault,
      SUBJECT_NAMES.inversify,
      SUBJECT_NAMES.awilixProxy,
      SUBJECT_NAMES.awilixClassic,
      SUBJECT_NAMES.tsyringe,
      SUBJECT_NAMES.typedi,
      SUBJECT_NAMES.typedInject
    ]
    const raw = {
      mode: 'public',
      artifact: { mode: 'production' },
      configuration: {
        frozenLockfile: true,
        processIsolationLevel: 'subject',
        subjectOrder: 'balanced-latin-square',
        timeMs: 100,
        warmupTimeMs: 50
      },
      rounds: balancedSubjectOrders(subjectOrder).map((order) => ({ subjectOrder: order }))
    }

    expect(isPublishableResult(raw)).toBe(true)
    expect(isPublishableResult({
      ...raw,
      rounds: [...raw.rounds, ...raw.rounds]
    })).toBe(true)
    expect(isPublishableResult({
      ...raw,
      configuration: { ...raw.configuration, warmupTimeMs: 49 }
    })).toBe(false)
    expect(isPublishableResult({
      ...raw,
      configuration: { ...raw.configuration, processIsolationLevel: 'round' }
    })).toBe(false)
    expect(isPublishableResult({
      ...raw,
      rounds: raw.rounds.slice(0, -1)
    })).toBe(false)
    expect(isPublishableResult({
      ...raw,
      rounds: [...raw.rounds, ...raw.rounds.slice(0, 1)]
    })).toBe(false)
    expect(isPublishableResult({
      ...raw,
      rounds: raw.rounds.map(() => raw.rounds[0])
    })).toBe(false)
    expect(isPublishableResult({
      ...raw,
      configuration: { ...raw.configuration, subjectOrder: 'cyclic' }
    })).toBe(false)
  })

  it('renders deterministic scenario tables and excludes N/A from relative factors', () => {
    const raw = {
      schemaVersion: 1,
      mode: 'public',
      artifact: { mode: 'production' },
      git: { commit: 'abc123', dirty: false },
      environment: {
        node: 'v22.0.0',
        os: 'linux',
        architecture: 'x64',
        cpu: 'test cpu'
      },
      configuration: { rounds: 2 },
      rounds: [round(1, 10, null), round(2, 14, null)]
    }

    const first = renderReport(raw, 'results/raw.json')
    const second = renderReport(raw, 'results/raw.json')
    const medianTable = first.slice(
      first.indexOf('### Median ns/op'),
      first.indexOf('### Relative to fastest')
    )
    const relativeTable = first.slice(
      first.indexOf('### Relative to fastest'),
      first.indexOf('### Median ± MAD with relative')
    )

    expect(first).toBe(second)
    expect(first).toContain(`| ${SUBJECT_NAMES.inferdiDefault} | 12.000 | 2.000 | 1.00× |`)
    expect(first).toContain(`| ${SUBJECT_NAMES.inferdiFast} | N/A | N/A | N/A |`)
    expect(first).toContain(
      `| Scenario | ${SUBJECT_NAMES.inferdiDefault} | ${SUBJECT_NAMES.inferdiFast} |`
    )
    expect(medianTable).toContain('| Hot singleton resolve | 100.00 | 101.00 |')
    expect(medianTable).toContain('| Registration | 12.000 | N/A |')
    expect(medianTable).not.toContain('±')
    expect(medianTable).not.toContain('×')
    expect(relativeTable).toContain('| Hot singleton resolve | 1.00× | 1.01× |')
    expect(relativeTable).toContain('| Registration | 1.00× | N/A |')
    expect(relativeTable).not.toContain('ns/op')
    expect(relativeTable).not.toContain('±')
    expect(first).toContain('| Registration | 12.000 ± 2.000 (1.00×) | N/A |')
    expect(first).toMatch(/\| Registration \| 12\.000 ± 2\.000 \(1\.00×\) \| N\/A \|\n$/)
  })
})
