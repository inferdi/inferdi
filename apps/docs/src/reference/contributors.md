---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/reference/contributors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Reference"
          "item": "https://inferdi.com/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Contributors"
          "item": "https://inferdi.com/reference/contributors"
    - "@type": "AboutPage"
      "@id": "https://inferdi.com/reference/contributors#aboutpage"
      "headline": "InferDI Contributors"
      "name": "Contributors"
      "description": "The people who maintain InferDI and own its published package surface across npm and JSR."
      "url": "https://inferdi.com/reference/contributors"
      "mainEntityOfPage": "https://inferdi.com/reference/contributors"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, contributors, maintainers, team, open source"
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
    title: 'Maintainer',
    desc: 'Maintains InferDI and owns the published package surface.',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' },
    ],
  },
]
</script>

# Contributors

<VPTeamMembers size="medium" :members="maintainers" />
