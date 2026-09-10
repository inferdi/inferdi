import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const outputRoot = fileURLToPath(new URL('../.vitepress/dist/', import.meta.url))
const siteUrl = 'https://inferdi.com'
const websiteId = `${siteUrl}/#website`
const organizationId = `${siteUrl}/#organization`
const softwareId = `${siteUrl}/#software`
const languages = {
  en: 'en',
  ru: 'ru',
  zh: 'zh-Hans',
  ja: 'ja',
  es: 'es',
  de: 'de',
  fr: 'fr'
}
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

const decodeHtml = (value) => value
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')

const attribute = (tag, name) =>
  decodeHtml(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '')

const canonicalFor = (relative) => {
  const route = relative
    .replace(/(^|\/)index\.html$/, '$1')
    .replace(/\.html$/, '')

  return new URL(route, `${siteUrl}/`).toString()
}

const localeFor = (relative) =>
  relative.match(/^(ru|zh|ja|es|de|fr)\//)?.[1] ?? 'en'

const htmlFiles = (await walk(outputRoot))
  .filter((file) => file.endsWith('.html'))
  .sort()
const indexablePages = []
const titles = new Map()
const descriptions = new Map()

for (const file of htmlFiles) {
  const relative = path.relative(outputRoot, file).split(path.sep).join('/')
  const html = await readFile(file, 'utf8')
  const tags = html.match(/<(?:link|meta)\b[^>]*>/g) ?? []
  const links = tags.filter((tag) => tag.startsWith('<link'))
  const meta = (key) => tags.find((tag) =>
    tag.startsWith('<meta') &&
    (attribute(tag, 'name') === key || attribute(tag, 'property') === key)
  )
  const metaContent = (key) => attribute(meta(key) ?? '', 'content')
  const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
  const description = metaContent('description')
  const canonical = links.find((tag) => attribute(tag, 'rel') === 'canonical')
  const alternates = links.filter((tag) =>
    attribute(tag, 'rel') === 'alternate' && attribute(tag, 'hreflang') !== ''
  )
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  const robots = metaContent('robots')

  if (relative === '404.html') {
    if (!robots.split(/\s*,\s*/).includes('noindex')) {
      errors.push('404.html: missing noindex')
    }
    if (canonical !== undefined) errors.push('404.html: must not define a canonical URL')
    if (alternates.length > 0) errors.push('404.html: must not define language alternates')
    if (jsonLd.length > 0) errors.push('404.html: must not define structured data')
    continue
  }

  indexablePages.push(relative)
  const locale = localeFor(relative)
  const expectedCanonical = canonicalFor(relative)
  const htmlLanguage = attribute(html.match(/<html\b[^>]*>/)?.[0] ?? '', 'lang')

  if (title === '') errors.push(`${relative}: missing title`)
  if (description === '') errors.push(`${relative}: missing meta description`)
  if (Array.from(title).length > 80) errors.push(`${relative}: title exceeds 80 characters`)
  if (Array.from(description).length < 30) errors.push(`${relative}: description is shorter than 30 characters`)
  if (Array.from(description).length > 160) errors.push(`${relative}: description exceeds 160 characters`)
  if (attribute(canonical ?? '', 'href') !== expectedCanonical) {
    errors.push(`${relative}: canonical URL does not match ${expectedCanonical}`)
  }
  if (htmlLanguage !== languages[locale]) {
    errors.push(`${relative}: html lang is ${htmlLanguage || 'missing'}, expected ${languages[locale]}`)
  }

  for (const [alternateLocale, language] of Object.entries(languages)) {
    const alternate = alternates.find((tag) => attribute(tag, 'hreflang') === language)
    const route = relative.replace(/^(ru|zh|ja|es|de|fr)\//, '')
    const localizedRoute = alternateLocale === 'en' ? route : `${alternateLocale}/${route}`
    const expected = canonicalFor(localizedRoute)
    if (attribute(alternate ?? '', 'href') !== expected) {
      errors.push(`${relative}: ${language} alternate does not match ${expected}`)
    }
  }

  const defaultAlternate = alternates.find((tag) => attribute(tag, 'hreflang') === 'x-default')
  const englishRoute = relative.replace(/^(ru|zh|ja|es|de|fr)\//, '')
  if (attribute(defaultAlternate ?? '', 'href') !== canonicalFor(englishRoute)) {
    errors.push(`${relative}: x-default alternate does not point to English`)
  }
  if (alternates.length !== Object.keys(languages).length + 1) {
    errors.push(`${relative}: expected ${Object.keys(languages).length + 1} language alternates, found ${alternates.length}`)
  }

  if (metaContent('og:url') !== expectedCanonical) errors.push(`${relative}: og:url does not match canonical`)
  if (metaContent('og:title') !== title) errors.push(`${relative}: og:title does not match title`)
  if (metaContent('og:description') !== description) errors.push(`${relative}: og:description does not match description`)
  if (metaContent('og:locale') === '') errors.push(`${relative}: missing og:locale`)
  if (metaContent('twitter:title') !== title) errors.push(`${relative}: twitter:title does not match title`)
  if (metaContent('twitter:description') !== description) errors.push(`${relative}: twitter:description does not match description`)

  if (jsonLd.length !== 1) {
    errors.push(`${relative}: expected one JSON-LD block, found ${jsonLd.length}`)
  } else {
    try {
      const schema = JSON.parse(jsonLd[0][1])
      if (schema['@context'] !== 'https://schema.org') {
        errors.push(`${relative}: JSON-LD uses an unexpected context`)
      }
      const graph = Array.isArray(schema['@graph']) ? schema['@graph'] : []
      const breadcrumb = graph.find((item) => item['@type'] === 'BreadcrumbList')
      const webPage = graph.find((item) => item['@type'] === 'WebPage')
      const website = graph.find((item) => item['@type'] === 'WebSite')
      const organization = graph.find((item) => item['@type'] === 'Organization')
      const software = graph.find((item) => item['@type'] === 'SoftwareApplication')
      const isRootHome = relative === 'index.html'
      const isHome = isRootHome || /^(ru|zh|ja|es|de|fr)\/index\.html$/.test(relative)

      if (webPage === undefined) errors.push(`${relative}: missing WebPage schema`)
      if (webPage?.isPartOf?.['@id'] !== websiteId) {
        errors.push(`${relative}: WebPage does not reference the root WebSite`)
      }
      if (webPage?.about?.['@id'] !== softwareId) {
        errors.push(`${relative}: WebPage does not reference InferDI`)
      }
      if (JSON.stringify(schema).includes('potentialAction')) {
        errors.push(`${relative}: contains retired SearchAction schema`)
      }

      if (isRootHome) {
        if (website?.['@id'] !== websiteId || website?.url !== `${siteUrl}/` || website?.name !== 'InferDI') {
          errors.push(`${relative}: invalid root WebSite schema`)
        }
        if (website?.publisher?.['@id'] !== organizationId) {
          errors.push(`${relative}: WebSite does not reference the organization`)
        }
        if (organization?.['@id'] !== organizationId) {
          errors.push(`${relative}: missing root Organization schema`)
        }
        if (software?.['@id'] !== softwareId) {
          errors.push(`${relative}: missing root SoftwareApplication schema`)
        }
        if (Number(software?.offers?.price) !== 0) {
          errors.push(`${relative}: free SoftwareApplication offer is missing`)
        }
      } else if (website !== undefined || organization !== undefined || software !== undefined) {
        errors.push(`${relative}: site-level schema must only be defined on the root home page`)
      }

      if (!isHome && breadcrumb === undefined) errors.push(`${relative}: missing BreadcrumbList schema`)
      if (!isHome && breadcrumb?.itemListElement?.at(-1)?.item !== expectedCanonical) {
        errors.push(`${relative}: breadcrumb does not end at the canonical URL`)
      }
      if (isHome && breadcrumb !== undefined) {
        errors.push(`${relative}: home page must not define breadcrumb schema`)
      }
    } catch {
      errors.push(`${relative}: JSON-LD is not valid JSON`)
    }
  }

  if (html.includes(retiredAsyncSlug)) {
    errors.push(`${relative}: contains retired async route`)
  }

  const sameTitle = titles.get(title) ?? []
  sameTitle.push(relative)
  titles.set(title, sameTitle)
  const sameDescription = descriptions.get(description) ?? []
  sameDescription.push(relative)
  descriptions.set(description, sameDescription)
}

for (const [title, pages] of titles) {
  if (title !== '' && pages.length > 1) {
    errors.push(`duplicate title "${title}" on ${pages.join(', ')}`)
  }
}
for (const [description, pages] of descriptions) {
  if (description !== '' && pages.length > 1) {
    errors.push(`duplicate description "${description}" on ${pages.join(', ')}`)
  }
}

const sitemap = await readFile(path.join(outputRoot, 'sitemap.xml'), 'utf8')
const sitemapEntries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1])
const sitemapUrls = sitemapEntries.map((entry) => decodeHtml(entry.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? ''))
const expectedUrls = indexablePages.map(canonicalFor)

for (const url of expectedUrls) {
  if (!sitemapUrls.includes(url)) errors.push(`sitemap: missing ${url}`)
}
for (const url of sitemapUrls) {
  if (!expectedUrls.includes(url)) errors.push(`sitemap: unexpected ${url}`)
}
for (const entry of sitemapEntries) {
  const url = decodeHtml(entry.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '')
  const hreflangs = [...entry.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1])
  for (const language of [...Object.values(languages), 'x-default']) {
    if (!hreflangs.includes(language)) errors.push(`sitemap: ${url} is missing ${language}`)
  }
}

const robots = await readFile(path.join(outputRoot, 'robots.txt'), 'utf8')
if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) {
  errors.push('robots.txt: missing sitemap URL')
}

if (errors.length > 0) {
  console.error(`SEO check failed (${errors.length}):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`SEO check passed: ${indexablePages.length} indexable pages with unique metadata and ${Object.keys(languages).length + 1} language alternates`)
}
