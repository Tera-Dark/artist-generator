<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader />

    <!-- Hero（极简留白） -->
    <section class="section section-spacing fade-in-up">
      <div class="container-responsive">
        <div class="max-w-4xl">
          <h1 class="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-10">更简洁、直观的<br>画师串生成体验</h1>
          <p class="mt-8 text-neutral-500 text-xl md:text-2xl leading-relaxed max-w-2xl">以现代极简设计重构交互。更少的装饰、更清晰的层级、更舒适的留白，聚焦你真正需要的功能。</p>
          <div class="mt-12 flex items-center gap-6">
            <router-link to="/concept" class="btn btn-primary text-lg px-10 py-5">
              开始使用
              <svg class="w-6 h-6 ml-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l7 7-7 7v-4H3V7h7V3z"/></svg>
            </router-link>
            <a href="#features" class="btn btn-secondary text-lg px-10 py-5">了解特性</a>
          </div>
        </div>
      </div>
    </section>

    <!-- 快速入口 + 系统状态 -->
    <section class="section pb-32">
      <div class="container-responsive">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          <!-- 快速入口：工作区 -->
          <router-link to="/concept" class="preset-card group">
            <div class="flex flex-col items-center gap-6">
              <div class="w-20 h-20 bg-primary-500 border-2 border-neutral-900 flex items-center justify-center text-4xl text-neutral-900 font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                <Palette class="w-10 h-10" stroke-width="2" />
              </div>
              <div>
                <h3 class="text-2xl font-black uppercase tracking-wide">进入工作区</h3>
                <p class="mt-3 text-base text-muted">两步生成画师串，支持复制输出。</p>
              </div>
            </div>
          </router-link>

          <!-- 快速入口：画师库 -->
          <router-link to="/library" class="preset-card group">
            <div class="flex flex-col items-center gap-6">
              <div class="w-20 h-20 bg-primary-500 border-2 border-neutral-900 flex items-center justify-center text-4xl text-neutral-900 font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                <Library class="w-10 h-10" stroke-width="2" />
              </div>
              <div>
                <h3 class="text-2xl font-black uppercase tracking-wide">浏览画师库</h3>
                <p class="mt-3 text-base text-muted">支持搜索、分页与手动刷新。</p>
              </div>
            </div>
          </router-link>

          <!-- 系统状态卡片 -->
          <div class="card p-10">
            <h3 class="text-2xl font-bold mb-6">系统状态</h3>
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
        </div>
      </div>
    </section>

    <!-- 特性（简化成 3 卡片） -->
    <section id="features" class="section pb-32">
      <div class="container-responsive">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div class="preset-card text-left">
            <div class="w-16 h-16 bg-primary-500 border-2 border-neutral-900 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <Layers class="w-8 h-8 text-neutral-900" stroke-width="2" />
            </div>
            <h3 class="text-xl font-black uppercase tracking-wide">极简层级</h3>
            <p class="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">去除多余装饰与渐变，用边距和排版建立清晰结构。</p>
          </div>
          <div class="preset-card text-left">
            <div class="w-16 h-16 bg-primary-500 border-2 border-neutral-900 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <Maximize class="w-8 h-8 text-neutral-900" stroke-width="2" />
            </div>
            <h3 class="text-xl font-black uppercase tracking-wide">舒适留白</h3>
            <p class="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">更大的内外边距，降低信息密度，提高理解效率。</p>
          </div>
          <div class="preset-card text-left">
            <div class="w-16 h-16 bg-primary-500 border-2 border-neutral-900 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <Droplet class="w-8 h-8 text-neutral-900" stroke-width="2" />
            </div>
            <h3 class="text-xl font-black uppercase tracking-wide">一致配色</h3>
            <p class="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">以中性灰为基底，仅在关键操作使用轻微点睛色。</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { computed } from 'vue'
import { useGeneratorStore } from '@/stores/generator'
import { Layers, Maximize, Droplet, Palette, Library } from 'lucide-vue-next'

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
