<template>
  <header class="app-nav">
    <div class="nav-container">
      <div class="nav-brand">
        <div class="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100"></div>
        <span class="text-sm font-semibold tracking-wide">{{ title }}</span>
        <span v-if="sectionLabel" class="ml-2 px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">{{ sectionLabel }}</span>
      </div>
      <nav class="nav-links">
        <RouterLink :class="['nav-link', isActive('/') && 'nav-link-active']" to="/">首页</RouterLink>
        <RouterLink :class="['nav-link', isActive('/library') && 'nav-link-active']" to="/library">画师库</RouterLink>
        <RouterLink :class="['nav-link', isActive('/concept') && 'nav-link-active']" to="/concept">工作区</RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const props = defineProps<{ title?: string; sectionLabel?: string }>()
const route = useRoute()
const title = props.title ?? 'Artist Generator'
function isActive(path: string) {
  return route.path === path
}
</script>

<style scoped>
/* 仅使用现有原子类与样式约定，无额外样式 */
</style>