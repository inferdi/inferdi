import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const benchmarkRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const reportStart = '<!-- benchmark-report:start -->'
const reportEnd = '<!-- benchmark-report:end -->'

export function median(values) {
  if (values.length === 0) throw new Error('Cannot calculate a median without values')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export function mad(values) {
  const center = median(values)
  return median(values.map((value) => Math.abs(value - center)))
}

export function isPublishableResult(raw) {
  return raw.mode === 'public' &&
    raw.artifact.mode === 'production' &&
    raw.configuration.frozenLockfile === true &&
    raw.configuration.processIsolationLevel === 'subject' &&
    raw.configuration.subjectOrder === 'balanced-latin-square' &&
    raw.configuration.timeMs >= 100 &&
    raw.configuration.warmupTimeMs >= 50 &&
    hasBalancedSubjectOrder(raw.rounds)
}

function hasBalancedSubjectOrder(rounds) {
  const subjectCount = rounds[0]?.subjectOrder?.length
  if (!Number.isInteger(subjectCount) || subjectCount < 2 || subjectCount % 2 !== 0) return false
  if (rounds.length < subjectCount || rounds.length % subjectCount !== 0) return false

  const subjectNames = new Set(rounds[0].subjectOrder)
  if (subjectNames.size !== subjectCount) return false

  for (let blockStart = 0; blockStart < rounds.length; blockStart += subjectCount) {
    const positions = new Set()
    const adjacentPairs = new Set()
    const relativeOrder = new Map()

    for (const round of rounds.slice(blockStart, blockStart + subjectCount)) {
      const order = round.subjectOrder
      if (!Array.isArray(order) || order.length !== subjectCount) return false
      if (new Set(order).size !== subjectCount) return false
      if (order.some((subject) => !subjectNames.has(subject))) return false

      for (let position = 0; position < subjectCount; position++) {
        positions.add(`${order[position]}\0${position}`)
        if (position > 0) adjacentPairs.add(`${order[position - 1]}\0${order[position]}`)
      }

      for (let left = 0; left < subjectCount; left++) {
        for (let right = left + 1; right < subjectCount; right++) {
          const pair = `${order[left]}\0${order[right]}`
          relativeOrder.set(pair, (relativeOrder.get(pair) ?? 0) + 1)
        }
      }
    }

    if (positions.size !== subjectCount * subjectCount) return false
    if (adjacentPairs.size !== subjectCount * (subjectCount - 1)) return false

    for (const left of subjectNames) {
      for (const right of subjectNames) {
        if (left === right) continue
        if (relativeOrder.get(`${left}\0${right}`) !== subjectCount / 2) return false
      }
    }
  }

  return true
}

export function renderReport(raw, sourceName) {
  validateRaw(raw)
  const firstRound = raw.rounds[0]
  const scenarios = firstRound.scenarios.map((scenario) => {
    const rows = aggregateScenario(raw, scenario.id)
    const supported = rows.filter((row) => row.medianNs !== null)
    const best = supported.length > 0
      ? Math.min(...supported.map((row) => row.medianNs))
      : null
    return { scenario, rows, best }
  })
  const lines = [
    '## Generated benchmark results',
    '',
    raw.mode === 'public'
      ? `Production artifact result from \`${sourceName}\`.`
      : `Local ${raw.artifact.mode} quick result from \`${sourceName}\`; do not use it for public claims.`,
    '',
    `Commit: \`${raw.git.commit}\`${raw.git.dirty ? ' (dirty workspace)' : ''}\\`,
    `Environment: ${raw.environment.node}, ${raw.environment.os}, ${raw.environment.architecture}, ${raw.environment.cpu}\\`,
    `Rounds: ${raw.configuration.rounds}; central value: median; dispersion: MAD. Lower is better.`,
    ''
  ]

  for (const { scenario, rows, best } of scenarios) {
    lines.push(`### ${scenario.name}`, '')
    lines.push('| Subject | Median ns/op | MAD ns/op | Relative |')
    lines.push('|---|---:|---:|---:|')
    for (const row of rows) {
      if (row.medianNs === null || row.madNs === null || best === null) {
        lines.push(`| ${row.subject} | N/A | N/A | N/A |`)
      } else {
        lines.push(
          `| ${row.subject} | ${formatNumber(row.medianNs)} | ${formatNumber(row.madNs)} | ${(row.medianNs / best).toFixed(2)}× |`
        )
      }
    }
    lines.push('')
  }

  const subjects = [...new Set(firstRound.scenarios.flatMap((scenario) => (
    scenario.results.map((result) => result.subject)
  )))]
  lines.push('## Combined benchmark results', '')
  lines.push('### Median ns/op', '')
  lines.push('Median in ns/op.', '')
  lines.push(...renderCombinedTable(subjects, scenarios, (row) => {
    if (!row || row.medianNs === null) return 'N/A'
    return formatNumber(row.medianNs)
  }), '')
  lines.push('### Relative to fastest', '')
  lines.push('Relative to the fastest container in each scenario.', '')
  lines.push(...renderCombinedTable(subjects, scenarios, (row, best) => {
    if (!row || row.medianNs === null || best === null) return 'N/A'
    return `${(row.medianNs / best).toFixed(2)}×`
  }), '')
  lines.push('### Median ± MAD with relative', '')
  lines.push('Median ± MAD in ns/op; the value in parentheses is relative to the fastest container in that scenario.', '')
  lines.push(...renderCombinedTable(subjects, scenarios, (row, best) => {
    if (!row || row.medianNs === null || row.madNs === null || best === null) return 'N/A'
    return `${formatNumber(row.medianNs)} ± ${formatNumber(row.madNs)} (${(row.medianNs / best).toFixed(2)}×)`
  }))

  return `${lines.join('\n').trimEnd()}\n`
}

function renderCombinedTable(subjects, scenarios, formatCell) {
  const lines = [
    `| Scenario | ${subjects.join(' | ')} |`,
    `|---|${subjects.map(() => '---:').join('|')}|`
  ]

  for (const { scenario, rows, best } of scenarios) {
    const rowsBySubject = new Map(rows.map((row) => [row.subject, row]))
    const cells = subjects.map((subject) => formatCell(rowsBySubject.get(subject), best))
    lines.push(`| ${scenario.name} | ${cells.join(' | ')} |`)
  }

  return lines
}

function aggregateScenario(raw, scenarioId) {
  const subjects = raw.rounds[0].scenarios
    .find((scenario) => scenario.id === scenarioId)
    .results
    .map((result) => result.subject)

  return subjects.map((subject) => {
    const values = raw.rounds.map((round) => {
      const scenario = round.scenarios.find((candidate) => candidate.id === scenarioId)
      const result = scenario.results.find((candidate) => candidate.subject === subject)
      return result.normalizedNsPerOp
    })
    const supported = values.filter((value) => value !== null)

    if (supported.length === 0) {
      return { subject, medianNs: null, madNs: null }
    }
    if (supported.length !== raw.rounds.length) {
      throw new Error(`${scenarioId}/${subject} changes support status between rounds`)
    }
    return {
      subject,
      medianNs: median(supported),
      madNs: mad(supported)
    }
  })
}

function validateRaw(raw) {
  if (raw.schemaVersion !== 1) throw new Error(`Unsupported schema version: ${raw.schemaVersion}`)
  if (!Array.isArray(raw.rounds) || raw.rounds.length === 0) throw new Error('Raw result has no rounds')
  if (raw.configuration.rounds !== raw.rounds.length) {
    throw new Error('Raw result round count does not match configuration')
  }

  const scenarioIds = raw.rounds[0].scenarios.map((scenario) => scenario.id)
  for (const round of raw.rounds) {
    if (round.subjectOrder.length === 0) throw new Error(`Round ${round.round} has no subject order`)
    const ids = round.scenarios.map((scenario) => scenario.id)
    if (JSON.stringify(ids) !== JSON.stringify(scenarioIds)) {
      throw new Error(`Round ${round.round} has a different scenario set`)
    }
  }
}

function formatNumber(value) {
  if (value >= 1000) return value.toFixed(1)
  if (value >= 100) return value.toFixed(2)
  return value.toFixed(3)
}

function replaceGeneratedReport(readme, report) {
  const start = readme.indexOf(reportStart)
  const end = readme.indexOf(reportEnd)
  if (start === -1 || end === -1 || end < start) {
    throw new Error('README does not contain benchmark report markers')
  }
  const before = readme.slice(0, start + reportStart.length)
  const after = readme.slice(end)
  return `${before}\n${report.trimEnd()}\n${after}`
}

function main() {
  const values = process.argv.slice(2)
  const input = values.find((value) => !value.startsWith('--'))
  const write = values.includes('--write')
  if (!input) throw new Error('Usage: node scripts/report-benchmarks.mjs <raw.json> [--write]')

  const inputPath = resolve(process.cwd(), input)
  const raw = JSON.parse(readFileSync(inputPath, 'utf8'))
  const relativeSource = relative(benchmarkRoot, inputPath)
  const sourceName = relativeSource.startsWith('..') ? inputPath : relativeSource
  const report = renderReport(raw, sourceName)

  if (report !== renderReport(raw, sourceName)) {
    throw new Error('Report generation is not deterministic')
  }

  if (write) {
    if (!isPublishableResult(raw)) {
      throw new Error(
        'Only a subject-isolated frozen-lockfile production result with 100/50 ms timing and complete balanced subject-order blocks can update README'
      )
    }
    const readmePath = resolve(benchmarkRoot, 'README.md')
    const readme = readFileSync(readmePath, 'utf8')
    writeFileSync(readmePath, replaceGeneratedReport(readme, report))
    process.stdout.write(`Updated ${readmePath}\n`)
  } else {
    process.stdout.write(report)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
