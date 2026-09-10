import { readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const outputRoot = fileURLToPath(new URL('../.vitepress/dist/', import.meta.url))
const baselinePath = fileURLToPath(new URL('./url-baseline.json', import.meta.url))
const writeBaseline = process.argv.includes('--write-baseline')

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(absolute))
    } else {
      files.push(absolute)
    }
  }

  return files
}

const decodeHtml = (value) => value
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')

const routeFor = (relative) => {
  if (relative === 'index.html') return '/'
  if (relative.endsWith('/index.html')) {
    return `/${relative.slice(0, -'index.html'.length)}`
  }

  return `/${relative.slice(0, -'.html'.length)}`
}

const collectUrls = async () => {
  const htmlFiles = (await walk(outputRoot))
    .filter((file) => file.endsWith('.html'))
    .filter((file) => path.basename(file) !== '404.html')
    .sort()
  const routes = {}

  for (const file of htmlFiles) {
    const relative = path.relative(outputRoot, file).split(path.sep).join('/')
    const html = await readFile(file, 'utf8')
    const anchors = [...html.matchAll(/<h[1-6]\b[^>]*\bid="([^"]+)"/g)]
      .map((match) => decodeHtml(match[1]))
    routes[routeFor(relative)] = anchors
  }

  return routes
}

const routes = await collectUrls()

if (writeBaseline) {
  const baseline = {
    format: 1,
    source: 'VitePress 1.6.4 build before the docs positioning redesign',
    routes
  }
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(`URL baseline written: ${Object.keys(routes).length} routes`)
  process.exit(0)
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const errors = []

for (const [route, anchors] of Object.entries(baseline.routes)) {
  const currentAnchors = routes[route]
  if (currentAnchors === undefined) {
    errors.push(`missing route ${route}`)
    continue
  }

  for (const anchor of anchors) {
    if (!currentAnchors.includes(anchor)) {
      errors.push(`${route}: missing anchor #${anchor}`)
    }
  }
}

if (errors.length > 0) {
  console.error(`URL regression check failed (${errors.length}):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`URL regression check passed: ${Object.keys(baseline.routes).length} historical routes and anchors preserved`)
}
