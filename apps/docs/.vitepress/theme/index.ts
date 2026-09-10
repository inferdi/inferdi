import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import '@shikijs/vitepress-twoslash/style.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    app.use(TwoslashFloatingVue)
  }
}
