export function mergeSubjectResults(partials) {
  if (partials.length === 0) throw new Error('Cannot merge an empty benchmark round')

  const first = partials[0]
  const subjectOrder = first.subjectOrder
  const resultOrder = first.resultOrder

  if (!Array.isArray(subjectOrder) || subjectOrder.length === 0) {
    throw new Error('Benchmark round has no subject order')
  }
  if (!Array.isArray(resultOrder) || resultOrder.length !== subjectOrder.length) {
    throw new Error('Benchmark round has an invalid result order')
  }
  if (partials.length !== subjectOrder.length) {
    throw new Error(
      `Benchmark round expected ${subjectOrder.length} subject results, received ${partials.length}`
    )
  }

  const bySubject = new Map()
  const timing = JSON.stringify(first.timing)
  const scenarios = first.scenarios

  for (let position = 0; position < partials.length; position++) {
    const partial = partials[position]
    const expectedSubject = subjectOrder[position]

    if (partial.round !== first.round) throw new Error('Benchmark subject round mismatch')
    if (partial.subjectPosition !== position) {
      throw new Error(`Benchmark subject position mismatch at ${position}`)
    }
    if (partial.subject !== expectedSubject) {
      throw new Error(
        `Benchmark subject mismatch at ${position}: expected ${expectedSubject}, received ${partial.subject}`
      )
    }
    if (
      JSON.stringify(partial.subjectOrder) !== JSON.stringify(subjectOrder) ||
      JSON.stringify(partial.resultOrder) !== JSON.stringify(resultOrder)
    ) {
      throw new Error(`Benchmark subject order mismatch for ${partial.subject}`)
    }
    if (JSON.stringify(partial.timing) !== timing) {
      throw new Error(`Benchmark timing mismatch for ${partial.subject}`)
    }
    if (partial.scenarios.length !== scenarios.length) {
      throw new Error(`Benchmark scenario count mismatch for ${partial.subject}`)
    }
    if (bySubject.has(partial.subject)) {
      throw new Error(`Duplicate benchmark subject result: ${partial.subject}`)
    }

    bySubject.set(partial.subject, partial)
  }

  if (
    new Set(subjectOrder).size !== subjectOrder.length ||
    new Set(resultOrder).size !== resultOrder.length ||
    resultOrder.some((subject) => !bySubject.has(subject))
  ) {
    throw new Error('Benchmark subject orders must contain the same unique subjects')
  }

  return {
    round: first.round,
    subjectOrder: [...subjectOrder],
    timing: first.timing,
    scenarios: scenarios.map((scenario, scenarioIndex) => {
      const results = resultOrder.map((subject) => {
        const candidate = bySubject.get(subject).scenarios[scenarioIndex]

        if (
          candidate.id !== scenario.id ||
          candidate.name !== scenario.name ||
          candidate.batchSize !== scenario.batchSize
        ) {
          throw new Error(`Benchmark scenario mismatch for ${subject}/${scenario.id}`)
        }
        if (candidate.result.subject !== subject) {
          throw new Error(`Benchmark result subject mismatch for ${subject}/${scenario.id}`)
        }

        return candidate.result
      })

      return {
        id: scenario.id,
        name: scenario.name,
        batchSize: scenario.batchSize,
        subjectOrder: subjectOrder.filter((subject) => (
          bySubject.get(subject).scenarios[scenarioIndex].result.supported
        )),
        results
      }
    })
  }
}
