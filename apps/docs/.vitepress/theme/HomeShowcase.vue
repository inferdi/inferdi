<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { homeCopy } from './home-copy'

const props = defineProps<{ locale: keyof typeof homeCopy }>()
const copy = computed(() => homeCopy[props.locale])
const link = (path: string) => withBase(`${props.locale === 'en' ? '' : `/${props.locale}`}/${path}`)
</script>

<template>
  <div id="inferdi-home" class="inferdi-home">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-pitch">
        <p class="home-eyebrow">{{ copy.eyebrow }}</p>
        <h1 id="home-title">
          <span class="home-wordmark">InferDI</span>
          <span class="home-headline">{{ copy.headline }} <span>{{ copy.accent }}</span></span>
        </h1>
        <p class="home-intro">{{ copy.intro }}</p>
        <div class="home-actions">
          <a class="home-button primary" :href="link('guide/quick-start')">{{ copy.start }} <span aria-hidden="true">↗</span></a>
          <a class="home-button" href="#performance">{{ copy.see }} <span aria-hidden="true">↓</span></a>
        </div>
        <code class="home-install">pnpm add @inferdi/inferdi</code>
      </div>

      <div class="home-logo">
        <img :src="withBase('/logo-t.png')" alt="InferDI" width="220" height="220" fetchpriority="high" />
      </div>
    </section>

    <section class="home-proof" :aria-label="copy.performance">
      <div class="home-metrics">
        <div><strong>&lt; 3 <span>KiB</span></strong><span>{{ copy.metrics[0] }}</span></div>
        <a :href="link('guide/performance')"><strong>6.23 <span>ns</span></strong><span>{{ copy.metrics[1] }}</span></a>
        <div><strong>0</strong><span>{{ copy.metrics[2] }}</span></div>
      </div>
    </section>

    <section id="performance" class="home-performance" aria-labelledby="home-performance-title">
      <div class="home-performance-copy">
        <h2 id="home-performance-title">{{ copy.performance }}</h2>
        <p class="home-section-intro">{{ copy.performanceIntro }}</p>
        <a class="home-text-link" :href="link('guide/performance')">{{ copy.results }} <span aria-hidden="true">↗</span></a>
      </div>
      <div class="home-benchmark-scroll" tabindex="0" role="region" :aria-label="copy.performance">
        <object class="home-benchmark-svg" :data="withBase('/di-benchmarks.svg')" type="image/svg+xml" :aria-label="copy.performance">
          <a :href="withBase('/di-benchmarks.svg')">{{ copy.results }}</a>
        </object>
      </div>
      <p class="home-measurement">{{ copy.chartNote }} <time datetime="2026-08-17">2026-08-17</time>.</p>
    </section>
  </div>
</template>

<style src="./home.css"></style>
