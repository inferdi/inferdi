import { describe, expect, it } from 'vitest'
import { mergeSubjectResults } from '../../scripts/merge-benchmark-results.mjs'
import { SUBJECT_NAMES } from '../containers/subject-names.js'

const subjectOrder = [SUBJECT_NAMES.inferdiFast, SUBJECT_NAMES.inferdiDefault]
const resultOrder = [SUBJECT_NAMES.inferdiDefault, SUBJECT_NAMES.inferdiFast]

function partial(subjectPosition, values) {
  const subject = subjectOrder[subjectPosition]

  return {
    round: 2,
    subjectPosition,
    subject,
    resultOrder,
    subjectOrder,
    timing: {timeMs: 100, warmupTimeMs: 50},
    scenarios: [
      {
        id: 'hot-singleton',
        name: 'Hot singleton resolve',
        batchSize: 1000,
        result: {
          subject,
          supported: true,
          normalizedNsPerOp: values.hot,
          raw: {medianBatchMs: values.hot / 1000}
        }
      },
      {
        id: 'registration',
        name: 'Registration',
        batchSize: 10,
        result: values.registration === null
          ? {
              subject,
              supported: false,
              normalizedNsPerOp: null,
              raw: null
            }
          : {
              subject,
              supported: true,
              normalizedNsPerOp: values.registration,
              raw: {medianBatchMs: values.registration / 100_000}
            }
      }
    ]
  }
}

describe('subject-isolated benchmark merge', () => {
  it('restores canonical result order and preserves rotated measured order', () => {
    const merged = mergeSubjectResults([
      partial(0, {hot: 6, registration: 2000}),
      partial(1, {hot: 6.1, registration: null})
    ])

    expect(merged.subjectOrder).toEqual(subjectOrder)
    expect(merged.timing).toEqual({timeMs: 100, warmupTimeMs: 50})
    expect(merged.scenarios[0].subjectOrder).toEqual(subjectOrder)
    expect(merged.scenarios[0].results.map((result) => result.subject)).toEqual(resultOrder)
    expect(merged.scenarios[1].subjectOrder).toEqual([SUBJECT_NAMES.inferdiFast])
    expect(merged.scenarios[1].results[0]).toMatchObject({
      subject: SUBJECT_NAMES.inferdiDefault,
      supported: false
    })
  })

  it('rejects missing subject processes', () => {
    expect(() => mergeSubjectResults([
      partial(0, {hot: 6, registration: 2000})
    ])).toThrow('expected 2 subject results, received 1')
  })
})
