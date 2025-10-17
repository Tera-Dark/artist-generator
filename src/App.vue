<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGeneratorStore } from '@/stores/generator'

const store = useGeneratorStore()

const theme = ref<'light' | 'dark'>('light')

function applyTheme(next: 'light' | 'dark') {
  theme.value = next
  const isDark = next === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem('theme', next)
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

onMounted(() => {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved)
  } else {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }
})
</script>

<template>
  <div id="app" class="min-h-screen">
    <!-- 画师库圆形按钮（在主题按钮左侧） -->
    <RouterLink
      to="/library"
      id="library-button"
      class="fixed top-4 right-20 z-[9999] h-9 px-4 rounded-full flex items-center justify-center btn btn-secondary hover-lift"
      aria-label="打开画师库"
    >
      画师库
    </RouterLink>

    <!-- 主题切换按钮（统一样式） -->
    <button
      id="theme-toggle"
      class="theme-toggle"
      @click="toggleTheme"
      :aria-label="theme === 'dark' ? '切换到浅色' : '切换到深色'"
    >
      <span v-if="theme === 'dark'">🌞</span>
      <span v-else>🌙</span>
      <span class="sr-only">{{ theme === 'dark' ? '切换到浅色' : '切换到深色' }}</span>
    </button>

    <RouterView />

    <!-- 全局 Toast 展示区 -->
    <div class="fixed bottom-4 right-4 z-[9999] space-y-2" aria-live="polite" aria-atomic="true">
      <div
        v-for="t in store.toasts"
        :key="t.id"
        class="min-w-[220px] max-w-[360px] rounded-lg border shadow-sm px-4 py-3 text-sm"
        :class="{
          'bg-blue-50 border-blue-200 text-neutral-900': t.type === 'info',
          'bg-amber-50 border-amber-200 text-neutral-900': t.type === 'warning',
          'bg-green-50 border-green-200 text-neutral-900': t.type === 'success',
          'bg-red-50 border-red-200 text-neutral-900': t.type === 'error',
          'dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100': true,
        }"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <div class="font-medium mb-0.5">{{ t.title }}</div>
          <button
            class="ml-auto text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
            @click="store.removeToast(t.id)"
            aria-label="关闭通知"
          >
            ✕
          </button>
        </div>
        <div class="text-neutral-600 dark:text-neutral-300">{{ t.message }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    system-ui,
    sans-serif;
}
</style>
