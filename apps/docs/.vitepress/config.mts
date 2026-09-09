import { readFile } from 'node:fs/promises'
import { defineConfig, type DefaultTheme } from 'vitepress'

const repo = 'https://github.com/inferdi/inferdi'
const siteUrl = 'https://inferdi.com'
const websiteId = `${siteUrl}/#website`
const organizationId = `${siteUrl}/#organization`
const softwareId = `${siteUrl}/#software`
const packageUrl = 'https://www.npmjs.com/package/@inferdi/inferdi'
const base = process.env.DOCS_BASE ?? '/'
const basePath = base.endsWith('/') ? base.slice(0, -1) : base
const withBase = (path: `/${string}`) => `${basePath}${path}`
const seoLocales = {
  en: {
    lang: 'en',
    ogLocale: 'en_US',
    description: 'A zero-dependency, decorator-free DI container with compiler-checked graphs, explicit lifetimes, and predictable disposal.'
  },
  ru: {
    lang: 'ru',
    ogLocale: 'ru_RU',
    description: 'InferDI — DI-контейнер для TypeScript без зависимостей и декораторов, со статической проверкой типов.'
  },
  zh: {
    lang: 'zh-Hans',
    ogLocale: 'zh_CN',
    description: 'InferDI 是面向 TypeScript 的零依赖、无装饰器、类型安全 DI 容器。'
  },
  ja: {
    lang: 'ja',
    ogLocale: 'ja_JP',
    description: 'InferDI は TypeScript 向けの依存ゼロ、デコレーター不要、型安全な DI コンテナーです。'
  },
  es: {
    lang: 'es',
    ogLocale: 'es_ES',
    description: 'InferDI es un contenedor DI para TypeScript, sin dependencias ni decoradores y con comprobación de tipos.'
  }
} as const
type SeoLocale = keyof typeof seoLocales

const localeOf = (relativePath: string): SeoLocale =>
  relativePath.match(/^(ru|zh|ja|es)\//)?.[1] as SeoLocale ?? 'en'

const unlocalizedPath = (relativePath: string) =>
  relativePath.replace(/^(ru|zh|ja|es)\//, '')

const localizedPath = (relativePath: string, locale: SeoLocale) => {
  const route = unlocalizedPath(relativePath)
  return locale === 'en' ? route : `${locale}/${route}`
}

const canonicalUrl = (relativePath: string) => {
  const path = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '')

  return new URL(path, `${siteUrl}/`).toString()
}

const pageSummary = async (relativePath: string, fallback: string) => {
  if (relativePath === '404.md') return fallback

  const sourceUrl = new URL(`../src/${relativePath}`, import.meta.url)
  const pageSource = await readFile(sourceUrl, 'utf8')
  const include = pageSource.trim().match(/^<!--@include:\s+(.+?)-->/)
  const source = include
    ? await readFile(new URL(include[1], sourceUrl), 'utf8')
    : pageSource
  const body = source
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) =>
      block.length > 0 &&
      !block.startsWith('#') &&
      !block.startsWith('|') &&
      !block.startsWith('- ') &&
      !block.startsWith('>') &&
      !block.startsWith('<') &&
      !/^\d+\.\s/.test(block) &&
      !block.startsWith(':::') &&
      !block.startsWith('<<<') &&
      !block.startsWith('<!--')
    )
    .map((block) => block
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[`*_]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(Boolean)

  const selected: string[] = []
  for (const paragraph of paragraphs) {
    selected.push(paragraph)
    if (selected.join(' ').length >= 120) break
  }

  const summary = (selected.join(' ') || fallback).replace(/"/g, "'")
  if (summary.length <= 160) return summary

  const shortened = summary.slice(0, 159)
  const wordBoundary = shortened.lastIndexOf(' ')
  return `${wordBoundary >= 100 ? shortened.slice(0, wordBoundary) : shortened}…`
}

const enNav: DefaultTheme.NavItem[] = [
  { text: 'Guide', link: '/guide/quick-start' },
  { text: 'Performance', link: '/guide/performance' },
  { text: 'Adapters', link: '/adapters/' },
  { text: '6.1.0', items: [
      { text: 'Migration', link: '/reference/migration' },
    ],
  },
]

const ruNav: DefaultTheme.NavItem[] = [
  { text: 'Руководство', link: '/ru/guide/quick-start' },
  { text: 'Производительность', link: '/ru/guide/performance' },
  { text: 'Адаптеры', link: '/ru/adapters/' },
  { text: '6.1.0', items: [
      { text: 'Миграция', link: '/ru/reference/migration' },
    ],
  },
]

const zhNav: DefaultTheme.NavItem[] = [
  { text: '指南', link: '/zh/guide/quick-start' },
  { text: '性能', link: '/zh/guide/performance' },
  { text: '适配器', link: '/zh/adapters/' },
  { text: '6.1.0', items: [
      { text: '迁移', link: '/zh/reference/migration' },
    ],
  },
]

const jaNav: DefaultTheme.NavItem[] = [
  { text: 'ガイド', link: '/ja/guide/quick-start' },
  { text: 'パフォーマンス', link: '/ja/guide/performance' },
  { text: 'アダプター', link: '/ja/adapters/' },
  { text: '6.1.0', items: [
      { text: '移行', link: '/ja/reference/migration' },
    ],
  },
]

const esNav: DefaultTheme.NavItem[] = [
  { text: 'Guía', link: '/es/guide/quick-start' },
  { text: 'Rendimiento', link: '/es/guide/performance' },
  { text: 'Adaptadores', link: '/es/adapters/' },
  { text: '6.1.0', items: [
      { text: 'Migración', link: '/es/reference/migration' },
    ],
  },
]

const enSidebar: DefaultTheme.Sidebar = [
  {
    text: 'Guide',
    items: [
      { text: 'Installation', link: '/guide/installation' },
      { text: 'Quick Start', link: '/guide/quick-start' },
      {
        text: 'Examples',
        link: '/guide/examples',
        items: [
          { text: 'JavaScript', link: '/guide/examples/javascript' },
          { text: 'Backend Frameworks', link: '/guide/examples/backend' },
          { text: 'API Layers', link: '/guide/examples/api-layers' },
          { text: 'Full-Stack Frameworks', link: '/guide/examples/fullstack' },
          { text: 'Runtimes and Edge', link: '/guide/examples/runtimes-edge' },
          { text: 'Frontend Frameworks', link: '/guide/examples/frontend' },
          { text: 'Bots, Queues, and CLI', link: '/guide/examples/workers-cli' },
        ],
      },
      { text: 'Performance', link: '/guide/performance' },
    ],
  },
  {
    text: 'Core Concepts',
    items: [
      { text: 'Type Safety', link: '/core/type-safety' },
      { text: 'Bad Practices', link: '/core/bad-practices' },
      { text: 'Lifetimes', link: '/core/lifetime-guards' },
      { text: 'Scopes and Disposal', link: '/core/scopes' },
      { text: 'Scope Inputs', link: '/core/scope-inputs' },
      { text: 'Factories', link: '/core/factories' },
      { text: 'Async Dependencies', link: '/core/async-dependencies' },
      { text: 'Lazy Injection', link: '/core/lazy-injection' },
      { text: 'Modules', link: '/core/modules' },
      { text: 'Testing and Overrides', link: '/core/testing' },
      { text: 'Symbol Keys', link: '/core/symbol-keys' },
    ],
  },
  {
    text: 'Adapters',
    items: [
      { text: 'Overview', link: '/adapters/' },
      { text: 'React', link: '/adapters/react' },
      { text: 'Fastify', link: '/adapters/fastify' },
      { text: 'Hono', link: '/adapters/hono' },
      { text: 'Koa', link: '/adapters/koa' },
      { text: 'Express', link: '/adapters/express' },
      { text: 'Elysia', link: '/adapters/elysia' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'API Summary', link: '/reference/api' },
      { text: 'Errors', link: '/reference/errors' },
      { text: 'Migration', link: '/reference/migration' },
      {
        text: 'Contributors',
        items: [
          { text: 'People', link: '/reference/contributors' },
          { text: 'Manifesto', link: '/reference/manifesto' },
        ],
      },
    ],
  },
]

const ruSidebar: DefaultTheme.Sidebar = [
  {
    text: 'Руководство',
    items: [
      { text: 'Установка', link: '/ru/guide/installation' },
      { text: 'Быстрый старт', link: '/ru/guide/quick-start' },
      {
        text: 'Примеры',
        link: '/ru/guide/examples',
        items: [
          { text: 'JavaScript', link: '/ru/guide/examples/javascript' },
          { text: 'Бэкенд-фреймворки', link: '/ru/guide/examples/backend' },
          { text: 'API-слои', link: '/ru/guide/examples/api-layers' },
          { text: 'Фулстек-фреймворки', link: '/ru/guide/examples/fullstack' },
          { text: 'Рантаймы и edge', link: '/ru/guide/examples/runtimes-edge' },
          { text: 'Фронтенд-фреймворки', link: '/ru/guide/examples/frontend' },
          { text: 'Боты, очереди и CLI', link: '/ru/guide/examples/workers-cli' },
        ],
      },
      { text: 'Производительность', link: '/ru/guide/performance' },
    ],
  },
  {
    text: 'Базовые принципы',
    items: [
      { text: 'Типобезопасность', link: '/ru/core/type-safety' },
      { text: 'Плохие практики', link: '/ru/core/bad-practices' },
      { text: 'Время жизни', link: '/ru/core/lifetime-guards' },
      { text: 'Скоупы и освобождение ресурсов', link: '/ru/core/scopes' },
      { text: 'Входные данные скоупа', link: '/ru/core/scope-inputs' },
      { text: 'Фабрики', link: '/ru/core/factories' },
      { text: 'Асинхронные зависимости', link: '/ru/core/async-dependencies' },
      { text: 'Ленивое внедрение', link: '/ru/core/lazy-injection' },
      { text: 'Модули', link: '/ru/core/modules' },
      { text: 'Тестирование и подмена', link: '/ru/core/testing' },
      { text: 'Символьные ключи', link: '/ru/core/symbol-keys' },
    ],
  },
  {
    text: 'Адаптеры',
    items: [
      { text: 'Обзор', link: '/ru/adapters/' },
      { text: 'React', link: '/ru/adapters/react' },
      { text: 'Fastify', link: '/ru/adapters/fastify' },
      { text: 'Hono', link: '/ru/adapters/hono' },
      { text: 'Koa', link: '/ru/adapters/koa' },
      { text: 'Express', link: '/ru/adapters/express' },
      { text: 'Elysia', link: '/ru/adapters/elysia' },
    ],
  },
  {
    text: 'Справочник',
    items: [
      { text: 'Справочник API', link: '/ru/reference/api' },
      { text: 'Ошибки', link: '/ru/reference/errors' },
      { text: 'Миграция', link: '/ru/reference/migration' },
      {
        text: 'Контрибьюторы',
        items: [
          { text: 'Участники', link: '/ru/reference/contributors' },
          { text: 'Манифест', link: '/ru/reference/manifesto' },
        ],
      },
    ],
  },
]

const zhSidebar: DefaultTheme.Sidebar = [
  {
    text: '指南',
    items: [
      { text: '安装', link: '/zh/guide/installation' },
      { text: '快速开始', link: '/zh/guide/quick-start' },
      {
        text: '示例',
        link: '/zh/guide/examples',
        items: [
          { text: 'JavaScript', link: '/zh/guide/examples/javascript' },
          { text: '后端框架', link: '/zh/guide/examples/backend' },
          { text: 'API 分层', link: '/zh/guide/examples/api-layers' },
          { text: '全栈框架', link: '/zh/guide/examples/fullstack' },
          { text: '运行时与边缘', link: '/zh/guide/examples/runtimes-edge' },
          { text: '前端框架', link: '/zh/guide/examples/frontend' },
          { text: '机器人、队列与 CLI', link: '/zh/guide/examples/workers-cli' },
        ],
      },
      { text: '性能', link: '/zh/guide/performance' },
    ],
  },
  {
    text: '核心概念',
    items: [
      { text: '类型安全', link: '/zh/core/type-safety' },
      { text: '不良实践', link: '/zh/core/bad-practices' },
      { text: '生命周期', link: '/zh/core/lifetime-guards' },
      { text: '作用域与资源释放', link: '/zh/core/scopes' },
      { text: '作用域输入', link: '/zh/core/scope-inputs' },
      { text: '工厂', link: '/zh/core/factories' },
      { text: '异步依赖', link: '/zh/core/async-dependencies' },
      { text: '惰性注入', link: '/zh/core/lazy-injection' },
      { text: '模块', link: '/zh/core/modules' },
      { text: '测试与覆盖', link: '/zh/core/testing' },
      { text: 'Symbol 键', link: '/zh/core/symbol-keys' },
    ],
  },
  {
    text: '适配器',
    items: [
      { text: '概览', link: '/zh/adapters/' },
      { text: 'React', link: '/zh/adapters/react' },
      { text: 'Fastify', link: '/zh/adapters/fastify' },
      { text: 'Hono', link: '/zh/adapters/hono' },
      { text: 'Koa', link: '/zh/adapters/koa' },
      { text: 'Express', link: '/zh/adapters/express' },
      { text: 'Elysia', link: '/zh/adapters/elysia' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: 'API 摘要', link: '/zh/reference/api' },
      { text: '错误', link: '/zh/reference/errors' },
      { text: '迁移', link: '/zh/reference/migration' },
      {
        text: '贡献者',
        items: [
          { text: '人员', link: '/zh/reference/contributors' },
          { text: '宣言', link: '/zh/reference/manifesto' },
        ],
      },
    ],
  },
]

const jaSidebar: DefaultTheme.Sidebar = [
  {
    text: 'ガイド',
    items: [
      { text: 'インストール', link: '/ja/guide/installation' },
      { text: 'クイックスタート', link: '/ja/guide/quick-start' },
      {
        text: '例',
        link: '/ja/guide/examples',
        items: [
          { text: 'JavaScript', link: '/ja/guide/examples/javascript' },
          { text: 'バックエンドフレームワーク', link: '/ja/guide/examples/backend' },
          { text: 'API レイヤー', link: '/ja/guide/examples/api-layers' },
          { text: 'フルスタックフレームワーク', link: '/ja/guide/examples/fullstack' },
          { text: 'ランタイムとエッジ', link: '/ja/guide/examples/runtimes-edge' },
          { text: 'フロントエンドフレームワーク', link: '/ja/guide/examples/frontend' },
          { text: 'ボット、キュー、CLI', link: '/ja/guide/examples/workers-cli' },
        ],
      },
      { text: 'パフォーマンス', link: '/ja/guide/performance' },
    ],
  },
  {
    text: 'コアコンセプト',
    items: [
      { text: '型安全性', link: '/ja/core/type-safety' },
      { text: 'バッドプラクティス', link: '/ja/core/bad-practices' },
      { text: 'ライフタイム', link: '/ja/core/lifetime-guards' },
      { text: 'スコープとリソース破棄', link: '/ja/core/scopes' },
      { text: 'スコープ入力', link: '/ja/core/scope-inputs' },
      { text: 'ファクトリー', link: '/ja/core/factories' },
      { text: '非同期依存関係', link: '/ja/core/async-dependencies' },
      { text: '遅延注入', link: '/ja/core/lazy-injection' },
      { text: 'モジュール', link: '/ja/core/modules' },
      { text: 'テストとオーバーライド', link: '/ja/core/testing' },
      { text: 'Symbol キー', link: '/ja/core/symbol-keys' },
    ],
  },
  {
    text: 'アダプター',
    items: [
      { text: '概要', link: '/ja/adapters/' },
      { text: 'React', link: '/ja/adapters/react' },
      { text: 'Fastify', link: '/ja/adapters/fastify' },
      { text: 'Hono', link: '/ja/adapters/hono' },
      { text: 'Koa', link: '/ja/adapters/koa' },
      { text: 'Express', link: '/ja/adapters/express' },
      { text: 'Elysia', link: '/ja/adapters/elysia' },
    ],
  },
  {
    text: 'リファレンス',
    items: [
      { text: 'API 概要', link: '/ja/reference/api' },
      { text: 'エラー', link: '/ja/reference/errors' },
      { text: '移行', link: '/ja/reference/migration' },
      {
        text: 'コントリビューター',
        items: [
          { text: 'メンバー', link: '/ja/reference/contributors' },
          { text: 'マニフェスト', link: '/ja/reference/manifesto' },
        ],
      },
    ],
  },
]

const esSidebar: DefaultTheme.Sidebar = [
  {
    text: 'Guía',
    items: [
      { text: 'Instalación', link: '/es/guide/installation' },
      { text: 'Inicio rápido', link: '/es/guide/quick-start' },
      {
        text: 'Ejemplos',
        link: '/es/guide/examples',
        items: [
          { text: 'JavaScript', link: '/es/guide/examples/javascript' },
          { text: 'Frameworks de backend', link: '/es/guide/examples/backend' },
          { text: 'Capas de API', link: '/es/guide/examples/api-layers' },
          { text: 'Frameworks full-stack', link: '/es/guide/examples/fullstack' },
          { text: 'Runtimes y edge', link: '/es/guide/examples/runtimes-edge' },
          { text: 'Frameworks de frontend', link: '/es/guide/examples/frontend' },
          { text: 'Bots, colas y CLI', link: '/es/guide/examples/workers-cli' },
        ],
      },
      { text: 'Rendimiento', link: '/es/guide/performance' },
    ],
  },
  {
    text: 'Conceptos básicos',
    items: [
      { text: 'Seguridad de tipos', link: '/es/core/type-safety' },
      { text: 'Malas prácticas', link: '/es/core/bad-practices' },
      { text: 'Tiempos de vida', link: '/es/core/lifetime-guards' },
      { text: 'Scopes y liberación de recursos', link: '/es/core/scopes' },
      { text: 'Entradas de scope', link: '/es/core/scope-inputs' },
      { text: 'Factorías', link: '/es/core/factories' },
      { text: 'Dependencias asíncronas', link: '/es/core/async-dependencies' },
      { text: 'Inyección perezosa', link: '/es/core/lazy-injection' },
      { text: 'Módulos', link: '/es/core/modules' },
      { text: 'Pruebas y overrides', link: '/es/core/testing' },
      { text: 'Claves Symbol', link: '/es/core/symbol-keys' },
    ],
  },
  {
    text: 'Adaptadores',
    items: [
      { text: 'Visión general', link: '/es/adapters/' },
      { text: 'React', link: '/es/adapters/react' },
      { text: 'Fastify', link: '/es/adapters/fastify' },
      { text: 'Hono', link: '/es/adapters/hono' },
      { text: 'Koa', link: '/es/adapters/koa' },
      { text: 'Express', link: '/es/adapters/express' },
      { text: 'Elysia', link: '/es/adapters/elysia' },
    ],
  },
  {
    text: 'Referencia',
    items: [
      { text: 'Resumen de la API', link: '/es/reference/api' },
      { text: 'Errores', link: '/es/reference/errors' },
      { text: 'Migración', link: '/es/reference/migration' },
      {
        text: 'Colaboradores',
        items: [
          { text: 'Personas', link: '/es/reference/contributors' },
          { text: 'Manifiesto', link: '/es/reference/manifesto' },
        ],
      },
    ],
  },
]

export default defineConfig({
  title: 'InferDI — Typed dependency injection for TypeScript',
  titleTemplate: 'InferDI TypeScript DI',
  description: seoLocales.en.description,
  base,
  srcDir: './src',
  cacheDir: './.vitepress/cache',
  lastUpdated: true,
  cleanUrls: true,
  sitemap: {
    hostname: siteUrl,
    transformItems(items) {
      return items.map((item) => {
        const english = item.links?.find((link) => link.lang === 'en')
        if (english === undefined || item.links?.some((link) => link.lang === 'x-default')) {
          return item
        }

        return {
          ...item,
          links: [
            ...item.links,
            { lang: 'x-default', url: english.url }
          ]
        }
      })
    }
  },
  vite: {
    esbuild: {
      target: 'esnext',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
    },
    build: {
      target: 'esnext',
    },
  },
  head: [
    ['link', { rel: 'icon', href: withBase('/logo.png') }],
    ['meta', { name: 'theme-color', content: '#5b5ff5' }],
    ['meta', { property: 'og:image', content: 'https://inferdi.com/logo-twitter.png' }],
    ['meta', { property: 'og:image:alt', content: 'InferDI' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@inferdi_ts' }],
    ['meta', { name: 'twitter:image', content: 'https://inferdi.com/logo-twitter.png' }],
    ['meta', { name: 'twitter:image:alt', content: 'InferDI' }]
  ],
  async transformPageData(pageData) {
    pageData.frontmatter.head ??= []

    if (pageData.relativePath === '404.md' || pageData.isNotFound) {
      return
    }

    const locale = localeOf(pageData.relativePath)
    const isHome = unlocalizedPath(pageData.relativePath) === 'index.md'
    if (isHome) pageData.titleTemplate = false

    pageData.description = pageData.frontmatter.description ??
      await pageSummary(
        pageData.relativePath,
        `${pageData.title}. ${seoLocales[locale].description}`
      )

    pageData.frontmatter.head.push([
      'link',
      {
        rel: 'canonical',
        href: canonicalUrl(pageData.relativePath)
      }
    ])

    for (const [alternateLocale, metadata] of Object.entries(seoLocales)) {
      pageData.frontmatter.head.push([
        'link',
        {
          rel: 'alternate',
          hreflang: metadata.lang,
          href: canonicalUrl(localizedPath(pageData.relativePath, alternateLocale as SeoLocale))
        }
      ])
    }
    pageData.frontmatter.head.push([
      'link',
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: canonicalUrl(localizedPath(pageData.relativePath, 'en'))
      }
    ])
  },
  async transformHead({ pageData, title, description }) {
    if (pageData.relativePath === '404.md' || pageData.isNotFound) {
      return [['meta', { name: 'robots', content: 'noindex, nofollow' }]]
    }

    const url = canonicalUrl(pageData.relativePath)
    const locale = localeOf(pageData.relativePath)
    const homeLabels = {
      en: 'Home',
      ru: 'Главная',
      zh: '首页',
      ja: 'ホーム',
      es: 'Inicio'
    } as const
    const localeRoot = canonicalUrl(localizedPath('index.md', locale))
    const isHome = unlocalizedPath(pageData.relativePath) === 'index.md'
    const isRootHome = pageData.relativePath === 'index.md'
    const pageTitle = pageData.title || title
    const pageDescription = pageData.description || description
    const sectionRoutes = {
      guide: 'guide/quick-start.md',
      core: 'core/type-safety.md',
      adapters: 'adapters/index.md',
      reference: 'reference/api.md'
    } as const
    const sectionLabels = {
      en: { guide: 'Guide', core: 'Core Concepts', adapters: 'Adapters', reference: 'Reference', examples: 'Examples' },
      ru: { guide: 'Руководство', core: 'Базовые принципы', adapters: 'Адаптеры', reference: 'Справочник', examples: 'Примеры' },
      zh: { guide: '指南', core: '核心概念', adapters: '适配器', reference: '参考', examples: '示例' },
      ja: { guide: 'ガイド', core: 'コアコンセプト', adapters: 'アダプター', reference: 'リファレンス', examples: '例' },
      es: { guide: 'Guía', core: 'Conceptos básicos', adapters: 'Adaptadores', reference: 'Referencia', examples: 'Ejemplos' }
    } as const
    const routeSegments = unlocalizedPath(pageData.relativePath).replace(/\.md$/, '').split('/')
    const breadcrumbItems = [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabels[locale],
        item: localeRoot
      }
    ]
    const addBreadcrumbParent = (name: string, relativePath: string) => {
      const item = canonicalUrl(localizedPath(relativePath, locale))
      if (item === url) return

      breadcrumbItems.push({
        '@type': 'ListItem',
        position: breadcrumbItems.length + 1,
        name,
        item
      })
    }

    if (routeSegments[0] === 'guide' && routeSegments[1] === 'examples') {
      addBreadcrumbParent(sectionLabels[locale].examples, 'guide/examples.md')
    } else {
      const section = routeSegments[0] as keyof typeof sectionRoutes
      if (section in sectionRoutes) {
        addBreadcrumbParent(sectionLabels[locale][section], sectionRoutes[section])
      }
    }

    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: pageTitle,
      item: url
    })
    const breadcrumbSchema = {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: breadcrumbItems
    }
    const webPageSchema = {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      name: pageTitle,
      description: pageDescription,
      url,
      inLanguage: seoLocales[locale].lang,
      isPartOf: {
        '@id': websiteId
      },
      about: {
        '@id': softwareId
      },
      ...(!isHome
        ? { breadcrumb: { '@id': `${url}#breadcrumb` } }
        : {}),
      ...(pageData.lastUpdated
        ? { dateModified: new Date(pageData.lastUpdated).toISOString() }
        : {})
    }
    const schema = {
      '@context': 'https://schema.org',
      '@graph': isRootHome
        ? [
            {
              '@type': 'WebSite',
              '@id': websiteId,
              url: `${siteUrl}/`,
              name: 'InferDI',
              description: pageDescription,
              publisher: {
                '@id': organizationId
              }
            },
            {
              '@type': 'Organization',
              '@id': organizationId,
              name: 'InferDI',
              url: `${siteUrl}/`,
              logo: {
                '@type': 'ImageObject',
                url: `${siteUrl}/logo.png`
              },
              sameAs: [
                repo,
                'https://twitter.com/inferdi_ts'
              ]
            },
            {
              '@type': 'SoftwareApplication',
              '@id': softwareId,
              name: 'InferDI',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Node.js, Bun, Deno, Browser, Edge runtimes',
              softwareVersion: '6.1.0',
              programmingLanguage: 'TypeScript',
              url: `${siteUrl}/`,
              downloadUrl: packageUrl,
              description: pageDescription,
              license: `${repo}/blob/main/LICENSE`,
              author: {
                '@id': organizationId
              },
              offers: {
                '@type': 'Offer',
                price: 0,
                url: packageUrl
              }
            },
            webPageSchema
          ]
        : isHome
          ? [webPageSchema]
          : [breadcrumbSchema, webPageSchema]
    }

    return [
      ['meta', { property: 'og:site_name', content: 'InferDI' }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { property: 'og:locale', content: seoLocales[locale].ogLocale }],
      ...Object.values(seoLocales)
        .filter((metadata) => metadata.ogLocale !== seoLocales[locale].ogLocale)
        .map((metadata) => [
          'meta',
          { property: 'og:locale:alternate', content: metadata.ogLocale }
        ] as ['meta', Record<string, string>]),
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
      ['script', { type: 'application/ld+json' }, JSON.stringify(schema)]
    ]
  },
  markdown: {
    externalLinks: {
      target: '_blank',
      rel: 'noopener noreferrer'
    }
  },
  themeConfig: {
    logo: {
      src: '/logo.png',
      alt: 'InferDI',
    },
    siteTitle: 'InferDI',
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search',
              },
              modal: {
                displayDetails: 'Display detailed list',
                resetButtonTitle: 'Reset search',
                backButtonTitle: 'Close search',
                noResultsText: 'No results found',
                footer: {
                  selectText: 'select',
                  navigateText: 'navigate',
                  closeText: 'close',
                },
              },
            },
          },
          ru: {
            translations: {
              button: {
                buttonText: 'Поиск',
                buttonAriaLabel: 'Поиск',
              },
              modal: {
                displayDetails: 'Показать подробный список',
                resetButtonTitle: 'Сбросить поиск',
                backButtonTitle: 'Закрыть поиск',
                noResultsText: 'Нет результатов',
                footer: {
                  selectText: 'выбрать',
                  navigateText: 'навигация',
                  closeText: 'закрыть',
                },
              },
            },
          },
          zh: {
            translations: {
              button: {
                buttonText: '搜索',
                buttonAriaLabel: '搜索',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '重置搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '未找到结果',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
          ja: {
            translations: {
              button: {
                buttonText: '検索',
                buttonAriaLabel: '検索',
              },
              modal: {
                displayDetails: '詳細リストを表示',
                resetButtonTitle: '検索をリセット',
                backButtonTitle: '検索を閉じる',
                noResultsText: '結果が見つかりません',
                footer: {
                  selectText: '選択',
                  navigateText: '移動',
                  closeText: '閉じる',
                },
              },
            },
          },
          es: {
            translations: {
              button: {
                buttonText: 'Buscar',
                buttonAriaLabel: 'Buscar',
              },
              modal: {
                displayDetails: 'Mostrar lista detallada',
                resetButtonTitle: 'Restablecer búsqueda',
                backButtonTitle: 'Cerrar búsqueda',
                noResultsText: 'No se encontraron resultados',
                footer: {
                  selectText: 'seleccionar',
                  navigateText: 'navegar',
                  closeText: 'cerrar',
                },
              },
            },
          },
        },
      },
    },
    socialLinks: [
      { icon: 'github', link: repo },
    ],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: enNav,
        sidebar: enSidebar,
        editLink: {
          pattern: `${repo}/edit/main/apps/docs/src/:path`,
          text: 'Edit this page on GitHub',
        },
        lastUpdated: {
          text: 'Last updated',
        },
        outline: {
          label: 'On this page',
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next',
        },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-Hans',
      title: 'InferDI — TypeScript 类型安全依赖注入',
      link: '/zh/',
      description: seoLocales.zh.description,
      themeConfig: {
        nav: zhNav,
        sidebar: zhSidebar,
        editLink: {
          pattern: `${repo}/edit/main/apps/docs/src/:path`,
          text: '在 GitHub 上编辑此页',
        },
        lastUpdated: {
          text: '最后更新于',
        },
        outline: {
          label: '本页目录',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        langMenuLabel: '切换语言',
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '外观',
      },
    },
    ja: {
      label: '日本語',
      lang: 'ja',
      title: 'InferDI — TypeScript の型安全な依存性注入',
      link: '/ja/',
      description: seoLocales.ja.description,
      themeConfig: {
        nav: jaNav,
        sidebar: jaSidebar,
        editLink: {
          pattern: `${repo}/edit/main/apps/docs/src/:path`,
          text: 'GitHub でこのページを編集',
        },
        lastUpdated: {
          text: '最終更新',
        },
        outline: {
          label: 'このページの目次',
        },
        docFooter: {
          prev: '前へ',
          next: '次へ',
        },
        langMenuLabel: '言語を切り替える',
        returnToTopLabel: 'トップへ戻る',
        sidebarMenuLabel: 'メニュー',
        darkModeSwitchLabel: '外観',
      },
    },
    es: {
      label: 'Español',
      lang: 'es',
      title: 'InferDI — Inyección de dependencias tipada para TypeScript',
      link: '/es/',
      description: seoLocales.es.description,
      themeConfig: {
        nav: esNav,
        sidebar: esSidebar,
        editLink: {
          pattern: `${repo}/edit/main/apps/docs/src/:path`,
          text: 'Editar esta página en GitHub',
        },
        lastUpdated: {
          text: 'Última actualización',
        },
        outline: {
          label: 'En esta página',
        },
        docFooter: {
          prev: 'Anterior',
          next: 'Siguiente',
        },
        langMenuLabel: 'Cambiar idioma',
        returnToTopLabel: 'Volver arriba',
        sidebarMenuLabel: 'Menú',
        darkModeSwitchLabel: 'Apariencia',
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      title: 'InferDI — Типобезопасный DI-контейнер для TypeScript',
      link: '/ru/',
      description: seoLocales.ru.description,
      themeConfig: {
        nav: ruNav,
        sidebar: ruSidebar,
        editLink: {
          pattern: `${repo}/edit/main/apps/docs/src/:path`,
          text: 'Редактировать на GitHub',
        },
        lastUpdated: {
          text: 'Обновлено',
        },
        outline: {
          label: 'На этой странице',
        },
        docFooter: {
          prev: 'Назад',
          next: 'Далее',
        },
        langMenuLabel: 'Сменить язык',
        returnToTopLabel: 'Наверх',
        sidebarMenuLabel: 'Меню',
        darkModeSwitchLabel: 'Оформление',
      },
    },
  },
})
