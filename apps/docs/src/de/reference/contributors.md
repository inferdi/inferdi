<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const maintainers = [
  {
    avatar: 'https://github.com/maxrendel.png',
    name: 'Viacheslav Kabanov',
    title: 'Projektbetreuer',
    desc: 'Betreut InferDI und verantwortet die öffentliche API der veröffentlichten Pakete.',
    links: [
      { icon: 'github', link: 'https://github.com/maxrendel' }
    ]
  }
]
</script>

# Mitwirkende

<VPTeamMembers size="medium" :members="maintainers" />
