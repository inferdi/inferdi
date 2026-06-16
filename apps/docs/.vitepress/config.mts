import { defineConfig, type DefaultTheme } from 'vitepress'

const repo = 'https://github.com/inferdi/inferdi'
const siteUrl = 'https://inferdi.com'
const base = process.env.DOCS_BASE ?? '/'
const basePath = base.endsWith('/') ? base.slice(0, -1) : base
const withBase = (path: `/${string}`) => `${basePath}${path}`
const canonicalUrl = (relativePath: string) => {
  const path = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '')

  return new URL(path, `${siteUrl}/`).toString()
}

const enNav: DefaultTheme.NavItem[] = [
  { text: 'Guide', link: '/guide/quick-start' },
  { text: 'Performance', link: '/guide/performance' },
  { text: 'Adapters', link: '/adapters/' },
  { text: '5.0.2', items: [
      { text: 'Migration', link: '/reference/migration' },
    ],
  },
]

const ruNav: DefaultTheme.NavItem[] = [
  { text: 'Руководство', link: '/ru/guide/quick-start' },
  { text: 'Производительность', link: '/ru/guide/performance' },
  { text: 'Адаптеры', link: '/ru/adapters/' },
  { text: '5.0.2', items: [
      { text: 'Миграция', link: '/ru/reference/migration' },
    ],
  },
]

const zhNav: DefaultTheme.NavItem[] = [
  { text: '指南', link: '/zh/guide/quick-start' },
  { text: '性能', link: '/zh/guide/performance' },
  { text: '适配器', link: '/zh/adapters/' },
  { text: '5.0.2', items: [
      { text: '迁移', link: '/zh/reference/migration' },
    ],
  },
]

const jaNav: DefaultTheme.NavItem[] = [
  { text: 'ガイド', link: '/ja/guide/quick-start' },
  { text: 'パフォーマンス', link: '/ja/guide/performance' },
  { text: 'アダプター', link: '/ja/adapters/' },
  { text: '5.0.2', items: [
      { text: '移行', link: '/ja/reference/migration' },
    ],
  },
]

const esNav: DefaultTheme.NavItem[] = [
  { text: 'Guía', link: '/es/guide/quick-start' },
  { text: 'Rendimiento', link: '/es/guide/performance' },
  { text: 'Adaptadores', link: '/es/adapters/' },
  { text: '5.0.2', items: [
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
      { text: 'Lifetime Guards', link: '/core/lifetime-guards' },
      { text: 'Scopes and Teardown', link: '/core/scopes' },
      { text: 'Factories', link: '/core/factories' },
      { text: 'Modules', link: '/core/modules' },
      { text: 'Lazy Injection', link: '/core/lazy-injection' },
      { text: 'Symbol Keys', link: '/core/symbol-keys' },
      { text: 'Testing and Overrides', link: '/core/testing' },
    ],
  },
  {
    text: 'Adapters',
    items: [
      { text: 'Overview', link: '/adapters/' },
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
      { text: 'Контроль времени жизни', link: '/ru/core/lifetime-guards' },
      { text: 'Скоупы и очистка', link: '/ru/core/scopes' },
      { text: 'Фабрики', link: '/ru/core/factories' },
      { text: 'Модули', link: '/ru/core/modules' },
      { text: 'Ленивое внедрение', link: '/ru/core/lazy-injection' },
      { text: 'Символьные ключи', link: '/ru/core/symbol-keys' },
      { text: 'Тестирование', link: '/ru/core/testing' },
    ],
  },
  {
    text: 'Адаптеры',
    items: [
      { text: 'Обзор', link: '/ru/adapters/' },
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
      { text: '生命周期守卫', link: '/zh/core/lifetime-guards' },
      { text: '作用域与清理', link: '/zh/core/scopes' },
      { text: '工厂', link: '/zh/core/factories' },
      { text: '模块', link: '/zh/core/modules' },
      { text: '惰性注入', link: '/zh/core/lazy-injection' },
      { text: 'Symbol 键', link: '/zh/core/symbol-keys' },
      { text: '测试与覆盖', link: '/zh/core/testing' },
    ],
  },
  {
    text: '适配器',
    items: [
      { text: '概览', link: '/zh/adapters/' },
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
      { text: 'ライフタイムガード', link: '/ja/core/lifetime-guards' },
      { text: 'スコープとクリーンアップ', link: '/ja/core/scopes' },
      { text: 'ファクトリー', link: '/ja/core/factories' },
      { text: 'モジュール', link: '/ja/core/modules' },
      { text: '遅延注入', link: '/ja/core/lazy-injection' },
      { text: 'Symbol キー', link: '/ja/core/symbol-keys' },
      { text: 'テストとオーバーライド', link: '/ja/core/testing' },
    ],
  },
  {
    text: 'アダプター',
    items: [
      { text: '概要', link: '/ja/adapters/' },
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
      { text: 'Guardas de tiempo de vida', link: '/es/core/lifetime-guards' },
      { text: 'Scopes y limpieza', link: '/es/core/scopes' },
      { text: 'Factorías', link: '/es/core/factories' },
      { text: 'Módulos', link: '/es/core/modules' },
      { text: 'Inyección perezosa', link: '/es/core/lazy-injection' },
      { text: 'Claves Symbol', link: '/es/core/symbol-keys' },
      { text: 'Pruebas y overrides', link: '/es/core/testing' },
    ],
  },
  {
    text: 'Adaptadores',
    items: [
      { text: 'Visión general', link: '/es/adapters/' },
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
  title: 'InferDI — Ultra-fast DI for modern TypeScript',
  description: 'Build apps with next-gen DI for any modern runtime: ultra-fast architecture, clean domain logic, compiler-validated graphs, and first-class testability.',
  base,
  srcDir: './src',
  cacheDir: './.vitepress/cache',
  lastUpdated: true,
  cleanUrls: true,
  sitemap: {
    hostname: siteUrl,
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
    ['meta', { property: 'og:url', content: 'https://inferdi.com/' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'InferDI — The only ultra-fast DI for modern TypeScript' }],
    ['meta', { property: 'og:image', content: 'https://inferdi.com/logo-twitter.png' }],
    ['meta', { property: 'og:description', content: 'Build apps with next-gen dependency injection for modern runtimes — clean domain logic, compiler-validated graphs, safe lifetimes, and first-class testability without decorators or runtime bloat.' }],
    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:site', content: '@inferdi_ts' }],
    ['meta', { property: 'twitter:title', content: 'InferDI — The only ultra-fast DI for modern TypeScript' }],
    ['meta', { property: 'twitter:image', content: 'https://inferdi.com/logo-twitter.png' }],
  ],
  transformPageData(pageData) {
    if (pageData.relativePath === '404.md') return

    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push([
      'link',
      {
        rel: 'canonical',
        href: canonicalUrl(pageData.relativePath),
      },
    ])
  },
  async transformHead({ pageData }) {
    const { schema } = pageData.frontmatter
    if (schema) {
      return [
        [
          'script',
          { type: 'application/ld+json' },
          JSON.stringify(schema)
        ]
      ]
    }
  },
  markdown: {
    externalLinks: {
      target: '_blank',
      rel: 'nofollow noopener noreferrer'
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
      lang: 'en-US',
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
      lang: 'zh-CN',
      link: '/zh/',
      description: 'InferDI 简体中文文档。',
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
      lang: 'ja-JP',
      link: '/ja/',
      description: 'InferDI の日本語ドキュメント。',
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
      lang: 'es-ES',
      link: '/es/',
      description: 'Documentación de InferDI en español.',
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
      lang: 'ru-RU',
      link: '/ru/',
      description: 'Документация InferDI на русском языке.',
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
