<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const maintainers = [
  {
    avatar: 'https://github.com/maxrendel.png',
    name: 'Viacheslav Kabanov',
    title: 'Responsable du projet',
    desc: 'Maintient InferDI et veille à l’API publique des paquets publiés.',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' }
    ]
  }
]
</script>

# Contributeurs

<VPTeamMembers size="medium" :members="maintainers" />
