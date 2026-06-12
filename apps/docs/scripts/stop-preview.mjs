import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const port = Number(process.env.DOCS_PORT ?? 4173)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid DOCS_PORT: ${process.env.DOCS_PORT}`)
  process.exit(1)
}

function readCommand(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim()
  } catch {
    try {
      return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    } catch {
      return ''
    }
  }
}

function findListeningPids() {
  try {
    return execFileSync('lsof', ['-nP', '-ti', `tcp:${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
  } catch {
    return []
  }
}

const processes = findListeningPids().map((pid) => ({
  pid,
  command: readCommand(pid),
}))

if (processes.length === 0) {
  console.log(`No process is listening on tcp:${port}.`)
  process.exit(0)
}

const previews = processes.filter(({ command }) => {
  const normalized = command.toLowerCase()
  return normalized.includes('vitepress') && normalized.includes('preview')
})

if (previews.length === 0) {
  console.error(`Found process(es) on tcp:${port}, but none look like VitePress preview:`)
  for (const { pid, command } of processes) {
    console.error(`- ${pid}: ${command || '<unknown command>'}`)
  }
  process.exit(1)
}

for (const { pid } of previews) {
  process.kill(pid, 'SIGTERM')
}

console.log(`Stopped docs preview on tcp:${port}: ${previews.map(({ pid }) => pid).join(', ')}`)
