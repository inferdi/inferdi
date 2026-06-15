---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/reference/contributors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "リファレンス"
          "item": "https://inferdi.com/ja/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "コントリビューター"
          "item": "https://inferdi.com/ja/reference/contributors"
    - "@type": "AboutPage"
      "@id": "https://inferdi.com/ja/reference/contributors#aboutpage"
      "headline": "InferDI コントリビューター"
      "name": "コントリビューター"
      "description": "InferDI をメンテナンスし、npm と JSR にまたがる公開パッケージ群を管理している人々です。"
      "url": "https://inferdi.com/ja/reference/contributors"
      "mainEntityOfPage": "https://inferdi.com/ja/reference/contributors"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, コントリビューター, メンテナー, チーム, オープンソース"
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
    name: 'Viacheslav Kabanov',
    title: 'メンテナー',
    desc: 'InferDI をメンテナンスし、公開パッケージのインターフェースを管理しています。',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' },
    ],
  },
]
</script>

# コントリビューター

<VPTeamMembers size="medium" :members="maintainers" />
