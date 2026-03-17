<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader />

    <main class="section section-spacing">
      <div class="page-stack">
        <section class="hero-panel hero-panel-accent fade-in-up">
          <div class="hero-layout lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <div class="hero-eyebrow">
                <Palette class="w-4 h-4" />
                Artist String Generator
              </div>
              <h1 class="hero-title">更优雅、直观的<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-300">画师串生成体验</span></h1>
              <p class="hero-body">以现代极简玻璃态设计重构交互。更少的装饰、更柔和的层级、更舒适的视觉体验，聚焦你真正需要的功能。</p>
              <div class="page-actions">
                <router-link to="/concept" class="btn btn-primary text-base px-8 py-4">
                  开始使用
                  <svg class="w-6 h-6 ml-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l7 7-7 7v-4H3V7h7V3z"/></svg>
                </router-link>
                <a href="#features" class="btn btn-secondary text-base px-8 py-4">了解特性</a>
              </div>
            </div>

            <div class="metric-grid">
              <div class="metric-tile">
                <div class="metric-label">画师总数</div>
                <div class="metric-value">{{ artistsCount }}</div>
                <p class="metric-copy">当前已收录可用于随机生成的画师数据。</p>
              </div>
              <div class="metric-tile">
                <div class="metric-label">加载状态</div>
                <div class="metric-value text-xl">{{ isLoading ? '加载中' : (artistsCount > 0 ? '已就绪' : '未加载') }}</div>
                <p class="metric-copy">首屏进入后会自动静默预载。</p>
              </div>
              <div class="metric-tile">
                <div class="metric-label">缓存剩余</div>
                <div class="metric-value text-xl">{{ ttlRemaining !== null ? `${ttlRemaining} 分钟` : '—' }}</div>
                <p class="metric-copy">减少重复请求，保证使用流畅。</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 快速入口 + 系统状态 -->
        <section class="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <!-- 快速入口：工作区 -->
          <router-link to="/concept" class="quick-link-card group">
            <div class="flex flex-col items-center gap-6 text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-soft group-hover:scale-110 transition-transform">
                <Palette class="w-8 h-8" stroke-width="2" />
              </div>
              <div>
                <h3 class="text-2xl font-black uppercase tracking-wide">进入工作区</h3>
                <p class="mt-3 text-base text-muted">两步生成画师串，支持复制输出。</p>
              </div>
            </div>
          </router-link>

          <!-- 快速入口：画师库 -->
          <router-link to="/library" class="quick-link-card group">
            <div class="flex flex-col items-center gap-6 text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-soft group-hover:scale-110 transition-transform">
                <Library class="w-8 h-8" stroke-width="2" />
              </div>
              <div>
                <h3 class="text-2xl font-black uppercase tracking-wide">浏览画师库</h3>
                <p class="mt-3 text-base text-muted">支持搜索、分页与手动刷新。</p>
              </div>
            </div>
          </router-link>

          <!-- 系统状态卡片 -->
          <div class="panel-card">
            <h3 class="section-title">系统状态</h3>
            <div class="space-y-4 text-base">
              <div class="flex items-center justify-between">
                <span class="text-muted">画师总数</span>
                <span class="font-mono text-xl">{{ artistsCount }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">加载状态</span>
                <span>{{ isLoading ? '加载中…' : (artistsCount > 0 ? '已就绪' : '未加载') }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">最后加载时间</span>
                <span class="text-sm text-right">{{ loadedAtText }}</span>
              </div>
              <div class="flex items-center justify-between" v-if="ttlRemaining !== null">
                <span class="text-muted">缓存剩余</span>
                <span>{{ ttlRemaining }} 分钟</span>
              </div>
            </div>
            <div class="mt-8 flex items-center gap-4">
              <button class="btn btn-secondary text-sm px-6 py-3 w-full" @click="refresh" :disabled="isLoading">立即刷新</button>
            </div>
            <div v-if="isLoading" class="mt-2 text-sm text-neutral-500 dark:text-neutral-400 text-center">画师数据加载中…</div>
          </div>
        </section>

        <!-- 特性（简化成 3 卡片） -->
        <section id="features" class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="feature-card hover:-translate-y-1 transition-transform text-left">
            <div class="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl mb-6 flex items-center justify-center">
              <Layers class="w-7 h-7" stroke-width="2" />
            </div>
            <h3 class="text-lg font-bold tracking-wide">柔和层级</h3>
            <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">去除多余硬边装饰，用柔和阴影和极简留白建立清晰舒适的结构。</p>
          </div>
          <div class="feature-card hover:-translate-y-1 transition-transform text-left">
            <div class="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl mb-6 flex items-center justify-center">
              <Maximize class="w-7 h-7" stroke-width="2" />
            </div>
            <h3 class="text-lg font-bold tracking-wide">舒适空间</h3>
            <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">科学计算的内外边距，降低视觉噪音，让注意力聚焦于内容本身。</p>
          </div>
          <div class="feature-card hover:-translate-y-1 transition-transform text-left">
            <div class="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl mb-6 flex items-center justify-center">
              <Droplet class="w-7 h-7" stroke-width="2" />
            </div>
            <h3 class="text-lg font-bold tracking-wide">流光拟物</h3>
            <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">引入高贵轻盈的玻璃质感，配合现代柔和色彩系，赏心悦目。</p>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { computed, onMounted } from 'vue'
import { useGeneratorStore } from '@/stores/generator'
import { Layers, Maximize, Droplet, Palette, Library } from 'lucide-vue-next'

const store = useGeneratorStore()

const isLoading = computed(() => store.isArtistsLoading)
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

onMounted(() => {
  if (!store.artists.length) {
    store.loadArtists({ silent: true })
  }
})
</script>

<style scoped>
/* 保持无额外样式，全部走原子类 */
</style>
