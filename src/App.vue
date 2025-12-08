<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.toasts.length) {
    const last = store.toasts[store.toasts.length - 1]
    if (last) store.removeToast(last.id)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved)
  } else {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }
  window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div id="app" class="min-h-screen">
    <!-- 顶部浮动入口已移除，统一由 AppHeader 导航承载 -->



    <RouterView />

    <!-- 全局 Toast 展示区（带过渡、进度条、美化） -->
    <TransitionGroup name="toast" tag="div" class="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none" aria-live="polite" aria-atomic="true">
      <div
        v-for="t in store.toasts"
        :key="t.id"
        class="toast-item min-w-[220px] max-w-[360px] rounded-lg border shadow-lg px-4 py-3 text-sm pointer-events-auto backdrop-blur-sm"
        :class="{
          'bg-blue-50/80 border-blue-200': t.type === 'info',
          'bg-amber-50/80 border-amber-200': t.type === 'warning',
          'bg-green-50/80 border-green-200': t.type === 'success',
          'bg-red-50/80 border-red-200': t.type === 'error',
          'dark:bg-neutral-800/80 dark:border-neutral-700': true,
        }"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5 text-lg" aria-hidden="true">
            <span v-if="t.type === 'success'">✅</span>
            <span v-else-if="t.type === 'error'">⛔</span>
            <span v-else-if="t.type === 'warning'">⚠️</span>
            <span v-else>ℹ️</span>
          </div>
          <div class="flex-1">
            <div class="font-medium mb-0.5 text-neutral-900 dark:text-neutral-100">{{ t.title }}</div>
            <div class="text-neutral-700 dark:text-neutral-300">{{ t.message }}</div>
          </div>
          <button
            class="ml-auto text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            @click="store.removeToast(t.id)"
            aria-label="关闭通知"
          >
            ✕
          </button>
        </div>
        <div v-if="t.duration && t.duration > 0" class="toast-progress mt-2 h-0.5 bg-neutral-300 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div class="progress-bar bg-neutral-500/50 dark:bg-neutral-400/50 h-full" :style="{ animationDuration: (t.duration || 0) + 'ms' }"></div>
        </div>
      </div>
    </TransitionGroup>
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
