---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/reference/contributors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Справочник"
          "item": "https://inferdi.com/ru/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Контрибьюторы"
          "item": "https://inferdi.com/ru/reference/contributors"
    - "@type": "AboutPage"
      "@id": "https://inferdi.com/ru/reference/contributors#aboutpage"
      "headline": "Контрибьюторы InferDI"
      "name": "Контрибьюторы"
      "description": "Люди, которые поддерживают InferDI и отвечают за публичную поверхность опубликованных пакетов в npm и JSR."
      "url": "https://inferdi.com/ru/reference/contributors"
      "mainEntityOfPage": "https://inferdi.com/ru/reference/contributors"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, контрибьюторы, мейнтейнеры, команда, open source"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "mainEntity":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
        "member":
          - "@type": "Person"
            "name": "Viacheslav Kabanov"
            "jobTitle": "Maintainer"
            "url": "https://github.com/maxrendel"
            "sameAs": "https://github.com/maxrendel"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const maintainers = [
  {
    avatar: 'https://github.com/maxrendel.png',
    name: 'Вячеслав Кабанов',
    title: 'Мейнтейнер',
    desc: 'Поддерживает InferDI и отвечает за публичную поверхность пакетов.',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' },
    ],
  },
]
</script>

# Контрибьюторы

<VPTeamMembers size="medium" :members="maintainers" />
