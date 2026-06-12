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
