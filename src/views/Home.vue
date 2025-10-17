<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader />

    <!-- Hero（极简留白） -->
    <section class="section py-20 fade-in-up">
      <div class="max-w-3xl">
        <h1 class="heading-xl">更简洁、直观的画师串生成体验</h1>
        <p class="mt-6 text-muted text-lg">以现代极简设计重构交互。更少的装饰、更清晰的层级、更舒适的留白，聚焦你真正需要的功能。</p>
        <div class="mt-10 flex items-center gap-4">
          <router-link to="/concept" class="btn btn-primary">
            开始使用
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l7 7-7 7v-4H3V7h7V3z"/></svg>
          </router-link>
          <a href="#features" class="btn btn-secondary">了解特性</a>
        </div>
      </div>
    </section>

    <!-- 快速入口 + 系统状态 -->
    <section class="section pb-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- 快速入口：工作区 -->
        <router-link to="/concept" class="card p-6 hover-lift">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-md bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900">🎨</div>
            <div>
              <h3 class="text-lg font-semibold">进入工作区</h3>
              <p class="mt-1 text-sm text-muted">两步生成画师串，支持复制输出。</p>
            </div>
          </div>
        </router-link>

        <!-- 快速入口：画师库 -->
        <router-link to="/library" class="card p-6 hover-lift">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-md bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900">📚</div>
            <div>
              <h3 class="text-lg font-semibold">浏览画师库</h3>
              <p class="mt-1 text-sm text-muted">支持搜索、分页与手动刷新。</p>
            </div>
          </div>
        </router-link>

        <!-- 系统状态卡片 -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold">系统状态</h3>
          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted">画师总数</span>
              <span>{{ artistsCount }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">加载状态</span>
              <span>{{ isLoading ? '加载中…' : (artistsCount > 0 ? '已就绪' : '未加载') }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">最后加载时间</span>
              <span>{{ loadedAtText }}</span>
            </div>
            <div class="flex items-center justify-between" v-if="ttlRemaining !== null">
              <span class="text-muted">缓存剩余</span>
              <span>{{ ttlRemaining }} 分钟</span>
            </div>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <button class="btn btn-secondary text-xs px-3 py-1.5" @click="refresh" :disabled="isLoading">立即刷新</button>
            <router-link to="/library" class="btn btn-secondary text-xs px-3 py-1.5">打开画师库</router-link>
          </div>
          <div v-if="isLoading" class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">画师数据加载中…</div>
        </div>
      </div>
    </section>

    <!-- 特性（简化成 3 卡片） -->
    <section id="features" class="section pb-24">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card p-6 hover-lift">
          <div class="w-10 h-10 rounded-md bg-neutral-900 dark:bg-neutral-100 mb-4"></div>
          <h3 class="text-lg font-semibold">极简层级</h3>
          <p class="mt-2 text-muted">去除多余装饰与渐变，用边距和排版建立清晰结构。</p>
        </div>
        <div class="card p-6 hover-lift">
          <div class="w-10 h-10 rounded-md bg-neutral-900 dark:bg-neutral-100 mb-4"></div>
          <h3 class="text-lg font-semibold">舒适留白</h3>
          <p class="mt-2 text-muted">更大的内外边距，降低信息密度，提高理解效率。</p>
        </div>
        <div class="card p-6 hover-lift">
          <div class="w-10 h-10 rounded-md bg-neutral-900 dark:bg-neutral-100 mb-4"></div>
          <h3 class="text-lg font-semibold">一致配色</h3>
          <p class="mt-2 text-muted">以中性灰为基底，仅在关键操作使用轻微点睛色。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { computed } from 'vue'
import { useGeneratorStore } from '@/stores/generator'

const store = useGeneratorStore()

const isLoading = computed(() => store.isLoading)
const artistsCount = computed(() => store.artists.length)
const loadedAtText = computed(() => {
  const ts = store.artistsLoadedAt
  if (!ts) return '未加载'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return '未加载'
  }
})

const ttlRemaining = computed(() => {
  const ts = store.artistsLoadedAt
  if (!ts) return null
  const ttlMs = 15 * 60 * 1000
  const remaining = ttlMs - (Date.now() - ts)
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0
})

async function refresh() {
  await store.loadArtists({ force: true })
}
</script>

<style scoped>
/* 保持无额外样式，全部走原子类 */
</style>