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
