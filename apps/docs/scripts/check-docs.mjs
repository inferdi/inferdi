import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const configPath = fileURLToPath(new URL('../.vitepress/config.mts', import.meta.url))
const locales = ['ru', 'zh', 'ja', 'es', 'de', 'fr']
const retiredAsyncSlug = ['async', 'dependency', 'graph'].join('-')
const errors = []

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

const relativeToSource = (file) =>
  path.relative(sourceRoot, file).split(path.sep).join('/')

const routeFile = (link) => {
  let route = link.replace(/^\/+/, '').replace(/[?#].*$/, '')
  if (route === '') return 'index.md'
  if (route.endsWith('/')) route += 'index'
  return route.endsWith('.md') ? route : `${route}.md`
}

const fencedBlocks = (source) =>
  source.match(/```[^\n]*\n[\s\S]*?\n```/g) ?? []

const headingShape = (source) => {
  const withoutCode = source.replace(/```[^\n]*\n[\s\S]*?\n```/g, '')
  return [...withoutCode.matchAll(/^(#{2,3})\s+/gm)]
    .map((match) => match[1].length)
}

const includeCount = (source) =>
  [...source.matchAll(/^<<<\s+/gm)].length

const allFiles = await walk(sourceRoot)
const markdownFiles = allFiles
  .filter((file) => file.endsWith('.md'))
  .sort()
const markdownRoutes = new Set(markdownFiles.map(relativeToSource))
const englishRoutes = [...markdownRoutes]
  .filter((file) => !locales.some((locale) => file.startsWith(`${locale}/`)))
  .sort()

for (const locale of locales) {
  const localizedRoutes = [...markdownRoutes]
    .filter((file) => file.startsWith(`${locale}/`))
    .map((file) => file.slice(locale.length + 1))
    .sort()
  const missing = englishRoutes.filter((file) => !localizedRoutes.includes(file))
  const extra = localizedRoutes.filter((file) => !englishRoutes.includes(file))

  for (const file of missing) errors.push(`${locale}: missing route ${file}`)
  for (const file of extra) errors.push(`${locale}: extra route ${file}`)

  for (const file of englishRoutes) {
    if (file === 'reference/manifesto.md') continue

    const localizedFile = `${locale}/${file}`
    if (!markdownRoutes.has(localizedFile)) continue

    const [english, localized] = await Promise.all([
      readFile(path.join(sourceRoot, file), 'utf8'),
      readFile(path.join(sourceRoot, localizedFile), 'utf8')
    ])
    const englishHeadings = headingShape(english)
    const localizedHeadings = headingShape(localized)

    if (englishHeadings.join(',') !== localizedHeadings.join(',')) {
      errors.push(`${localizedFile}: H2/H3 structure differs from English`)
    }
    if (fencedBlocks(english).length !== fencedBlocks(localized).length) {
      errors.push(`${localizedFile}: fenced code block count differs from English`)
    }
    if (includeCount(english) !== includeCount(localized)) {
      errors.push(`${localizedFile}: include count differs from English`)
    }
  }
}

const config = await readFile(configPath, 'utf8')
for (const match of config.matchAll(/link:\s*'([^']+)'/g)) {
  const link = match[1]
  if (!link.startsWith('/')) continue

  const target = routeFile(link)
  if (!markdownRoutes.has(target)) {
    errors.push(`config: link ${link} points to missing ${target}`)
  }
}

for (const file of markdownFiles) {
  const relative = relativeToSource(file)
  const source = await readFile(file, 'utf8')
  const locale = locales.find((candidate) => relative.startsWith(`${candidate}/`))

  if (source.includes(retiredAsyncSlug)) {
    errors.push(`${relative}: contains retired async route`)
  }
  if (/^schema:/m.test(source)) {
    errors.push(`${relative}: page-level schema must use the shared metadata generator`)
  }

  for (const match of source.matchAll(/\]\((\/[^\s)#?]+)(?:[?#][^)]*)?\)/g)) {
    const link = match[1]
    if (/\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i.test(link)) continue

    if (locale !== undefined && !link.startsWith(`/${locale}/`)) {
      errors.push(`${relative}: localized absolute link ${link} leaves /${locale}/`)
      continue
    }

    const target = routeFile(link)
    if (!markdownRoutes.has(target)) {
      errors.push(`${relative}: absolute link ${link} points to missing ${target}`)
    }
  }
}

if (config.includes(retiredAsyncSlug)) {
  errors.push('config: contains retired async route')
}

if (errors.length > 0) {
  console.error(`Documentation consistency check failed (${errors.length}):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`Documentation consistency check passed: ${englishRoutes.length} routes × ${locales.length + 1} locales`)
}
