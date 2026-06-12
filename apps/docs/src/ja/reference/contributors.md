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
