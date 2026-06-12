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
