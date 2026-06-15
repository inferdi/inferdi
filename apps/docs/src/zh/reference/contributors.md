---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/reference/contributors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "参考"
          "item": "https://inferdi.com/zh/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "贡献者"
          "item": "https://inferdi.com/zh/reference/contributors"
    - "@type": "AboutPage"
      "@id": "https://inferdi.com/zh/reference/contributors#aboutpage"
      "headline": "InferDI 贡献者"
      "name": "贡献者"
      "description": "维护 InferDI 并负责其在 npm 和 JSR 上已发布包的人员。"
      "url": "https://inferdi.com/zh/reference/contributors"
      "mainEntityOfPage": "https://inferdi.com/zh/reference/contributors"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, 贡献者, 维护者, 团队, 开源"
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
    title: '维护者',
    desc: '维护 InferDI 并负责已发布软件包的公开接口。',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' },
    ],
  },
]
</script>

# 贡献者

<VPTeamMembers size="medium" :members="maintainers" />
