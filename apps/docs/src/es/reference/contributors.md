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
