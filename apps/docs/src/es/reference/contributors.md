---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/reference/contributors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Referencia"
          "item": "https://inferdi.com/es/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Colaboradores"
          "item": "https://inferdi.com/es/reference/contributors"
    - "@type": "AboutPage"
      "@id": "https://inferdi.com/es/reference/contributors#aboutpage"
      "headline": "Colaboradores de InferDI"
      "name": "Colaboradores"
      "description": "Las personas que mantienen InferDI y son responsables de su superficie de paquetes publicados en npm y JSR."
      "url": "https://inferdi.com/es/reference/contributors"
      "mainEntityOfPage": "https://inferdi.com/es/reference/contributors"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, colaboradores, mantenedores, equipo, código abierto"
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
    title: 'Mantenedor',
    desc: 'Mantiene InferDI y es responsable de la superficie pública del paquete publicado.',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' },
    ],
  },
]
</script>

# Colaboradores

<VPTeamMembers size="medium" :members="maintainers" />
