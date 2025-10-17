<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader sectionLabel="画师库" />

    <!-- 主体 -->
    <main class="section py-12">
      <h1 class="heading-lg">所有画师信息</h1>

      <!-- 搜索与统计 -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-2 card p-4">
          <div class="flex items-center justify-between">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">搜索（名称或别名）</label>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary text-xs px-3 py-1.5" @click="query = ''" :disabled="!query">清空</button>
              <button class="btn btn-secondary text-xs px-3 py-1.5" @click="refreshArtists" :disabled="isLoading">{{ isLoading ? '刷新中…' : '刷新' }}</button>
            </div>
          </div>
          <input v-model="query" type="text" class="mt-2 input-field" placeholder="例如：pixiv、动漫、某画师别名" />
          <div v-if="isLoading" class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">画师库加载中…</div>
        </div>
        <div class="card p-4">
          <div class="text-sm text-muted">统计</div>
          <div class="mt-1">总数：{{ artists.length }}</div>
          <div class="text-muted">匹配：{{ filtered.length }}</div>
          <div class="text-muted">页：{{ currentPage }} / {{ totalPages }}</div>
          <div class="text-muted">最近加载：{{ loadedAtText }}</div>
          <div class="text-muted">收藏：{{ favoritesCount }}</div>
        </div>
      </div>

      <!-- 排序与视图切换 -->
      <div class="mt-4 card p-4">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div class="text-sm text-muted">排序方式</div>
              <div class="mt-2 flex items-center gap-2">
                <button
                  class="btn btn-secondary text-xs px-3 py-1.5"
                  :class="{ 'btn-primary': sortKey === 'count' }"
                  @click="sortKey = 'count'"
                >按作品数</button>
                <button
                  class="btn btn-secondary text-xs px-3 py-1.5"
                  :class="{ 'btn-primary': sortKey === 'name' }"
                  @click="sortKey = 'name'"
                >A-Z</button>
              </div>
            </div>
            <div>
              <div class="text-sm text-muted">排序方向</div>
              <div class="mt-2 flex items-center gap-2">
                <button
                  class="btn btn-secondary text-xs px-3 py-1.5"
                  :class="{ 'btn-primary': sortOrder === 'asc' }"
                  @click="sortOrder = 'asc'"
                >升序</button>
                <button
                  class="btn btn-secondary text-xs px-3 py-1.5"
                  :class="{ 'btn-primary': sortOrder === 'desc' }"
                  @click="sortOrder = 'desc'"
                >降序</button>
              </div>
            </div>
            <div>
              <div class="text-sm text-muted">显示格式</div>
              <div class="mt-2 flex items-center gap-2">
                <button
                  class="btn btn-secondary text-xs px-3 py-1.5"
                  :class="{ 'btn-primary': viewMode === 'list' }"
                  @click="viewMode = 'list'"
                >列表</button>
                <button
                  class="btn btn-secondary text-xs px-3 py-1.5"
                  :class="{ 'btn-primary': viewMode === 'grid' }"
                  @click="viewMode = 'grid'"
                >卡片</button>
              </div>
            </div>
          </div>

          <div>
            <div class="text-sm text-muted">筛选</div>
            <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="text-xs text-muted">作品数 ≥</label>
                <input v-model.number="postMin" type="number" min="0" class="input-field mt-1 h-8" placeholder="0" />
              </div>
              <div>
                <label class="text-xs text-muted">作品数 ≤</label>
                <input v-model.number="postMax" type="number" :min="0" class="input-field mt-1 h-8" :placeholder="String(maxPostCount)" />
              </div>
              <div>
                <label class="text-xs text-muted">别名数 ≥</label>
                <input v-model.number="aliasMin" type="number" min="0" class="input-field mt-1 h-8" placeholder="0" />
              </div>
              <div>
                <label class="text-xs text-muted">仅收藏</label>
                <div class="mt-1">
                  <button class="btn btn-secondary text-xs px-3 py-1.5" :class="{ 'btn-primary': onlyFavorites }" @click="onlyFavorites = !onlyFavorites">{{ onlyFavorites ? '已启用' : '未启用' }}</button>
                </div>
              </div>
            </div>
            <div class="mt-2">
              <button class="btn btn-secondary text-xs px-3 py-1.5" @click="resetFilters">重置筛选</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表 / 卡片视图 -->
      <div class="mt-6 card">
        <div v-if="viewMode === 'list'" class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                <th class="text-left p-3 border-b border-neutral-200 dark:border-neutral-800">名称</th>
                <th class="text-left p-3 border-b border-neutral-200 dark:border-neutral-800">别名</th>
                <th class="text-left p-3 border-b border-neutral-200 dark:border-neutral-800">作品数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="3" class="p-4 text-center text-neutral-600 dark:text-neutral-300">加载中…</td>
              </tr>
              <tr v-else v-for="(a, i) in paged" :key="a.name + '-' + i" class="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <td class="p-3 text-neutral-900 dark:text-neutral-100">
                  <span>{{ a.name }}</span>
                  <button class="ml-2 text-xs" @click="toggleFavorite(a.name)" :aria-pressed="isFavorite(a.name)" title="收藏/取消">
                    <span :class="isFavorite(a.name) ? 'text-yellow-500' : 'text-neutral-400'">{{ isFavorite(a.name) ? '★' : '☆' }}</span>
                  </button>
                  <button class="ml-2 btn btn-secondary text-xs px-2 py-0.5" @click="copyName(a.name)">复制</button>
                  <button class="ml-1 btn btn-secondary text-xs px-2 py-0.5" @click="copySnippet(a)">片段</button>
                </td>
                <td class="p-3 text-neutral-700 dark:text-neutral-300">
                  <span v-if="a.other_names && a.other_names.length">{{ formatOtherNames(a.other_names) }}</span>
                  <span v-else>—</span>
                </td>
                <td class="p-3 text-neutral-700 dark:text-neutral-300">{{ a.post_count ?? 0 }}</td>
              </tr>
              <tr v-if="!isLoading && filteredSorted.length === 0">
                <td colspan="3" class="p-4 text-center text-neutral-600 dark:text-neutral-300">没有匹配的画师，请调整筛选或搜索。</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="p-4">
          <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="n in 6" :key="n" class="card p-4 animate-pulse">
              <div class="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2"></div>
              <div class="h-3 w-40 bg-neutral-200 dark:bg-neutral-800 rounded mb-3"></div>
              <div class="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            </div>
          </div>
          <div v-else-if="filteredSorted.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="(a, i) in paged" :key="a.name + '-' + i" class="card p-4 hover-lift">
              <div class="flex items-start justify-between">
                <div>
                  <div class="font-medium text-neutral-900 dark:text-neutral-100">{{ a.name }}</div>
                  <div class="text-xs text-muted mt-1">
                    <span v-if="a.other_names && a.other_names.length">{{ formatOtherNames(a.other_names) }}</span>
                    <span v-else>—</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">作品数：{{ a.post_count ?? 0 }}</div>
                  <button class="text-sm" @click="toggleFavorite(a.name)" :aria-pressed="isFavorite(a.name)" title="收藏/取消">
                    <span :class="isFavorite(a.name) ? 'text-yellow-500' : 'text-neutral-400'">{{ isFavorite(a.name) ? '★' : '☆' }}</span>
                  </button>
                </div>
              </div>
              <div class="mt-3 flex items-center gap-2">
                <button class="btn btn-secondary text-xs px-3 py-1.5" @click="copyName(a.name)">复制名称</button>
                <button class="btn btn-secondary text-xs px-3 py-1.5" @click="copySnippet(a)">复制片段</button>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-sm text-neutral-600 dark:text-neutral-400">没有匹配的画师，请调整筛选或搜索。</div>
        </div>

        <div class="flex items-center justify-between px-4 py-3 divider">
          <div class="text-xs text-neutral-600 dark:text-neutral-400">每页 {{ pageSize }} · 共 {{ filteredSorted.length }} 条</div>
          <div class="flex items-center gap-2">
            <button class="btn btn-secondary text-xs px-3 py-1.5" :disabled="currentPage <= 1" @click="currentPage = Math.max(1, currentPage - 1)">上一页</button>
            <span class="text-xs text-neutral-600 dark:text-neutral-400">{{ currentPage }} / {{ totalPages }}</span>
            <button class="btn btn-secondary text-xs px-3 py-1.5" :disabled="currentPage >= totalPages" @click="currentPage = Math.min(totalPages, currentPage + 1)">下一页</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { onMounted, ref, computed, watch } from 'vue'
import { useGeneratorStore } from '@/stores/generator'

const store = useGeneratorStore()
const query = ref('')
const debouncedQuery = ref('')
let qTimer: number | null = null
watch(query, (val) => {
  if (qTimer) {
    clearTimeout(qTimer as any)
  }
  qTimer = window.setTimeout(() => {
    debouncedQuery.value = val
    qTimer = null
  }, 200)
})
const isLoading = computed(() => store.isLoading)
const pageSize = ref(50)
const currentPage = ref(1)
const sortKey = ref<'count' | 'name'>('count')
const sortOrder = ref<'asc' | 'desc'>('desc')
const viewMode = ref<'list' | 'grid'>('list')
const postMin = ref(0)
const postMax = ref(0)
const aliasMin = ref(0)
const loadedAtText = computed(() => (store.artistsLoadedAt ? new Date(store.artistsLoadedAt).toLocaleString() : '—'))
// 收藏相关
const favorites = ref<Set<string>>(new Set())
const onlyFavorites = ref(false)
const favoritesCount = computed(() => favorites.value.size)

onMounted(async () => {
  if (!store.artists.length) {
    await store.loadArtists()
  }
  // 读取持久化首选项
  try {
    const vm = localStorage.getItem('library.viewMode') as 'list' | 'grid' | null
    const sk = localStorage.getItem('library.sortKey') as 'count' | 'name' | null
    const so = localStorage.getItem('library.sortOrder') as 'asc' | 'desc' | null
    const favsRaw = localStorage.getItem('library.favorites')
    const onlyFavRaw = localStorage.getItem('library.onlyFavorites')
    if (vm === 'list' || vm === 'grid') viewMode.value = vm
    if (sk === 'count' || sk === 'name') sortKey.value = sk
    if (so === 'asc' || so === 'desc') sortOrder.value = so
    if (favsRaw) {
      try {
        const arr = JSON.parse(favsRaw)
        if (Array.isArray(arr)) favorites.value = new Set(arr.filter((x: any) => typeof x === 'string'))
      } catch {}
    }
    if (onlyFavRaw === 'true' || onlyFavRaw === 'false') {
      onlyFavorites.value = onlyFavRaw === 'true'
    }
  } catch {}
})

const artists = computed(() => store.artists)
const maxPostCount = computed(() => {
  if (!artists.value.length) return 0
  return Math.max(...artists.value.map(a => a.post_count || 0))
})
// 初始化与约束 postMax
watch(artists, () => {
  if (postMax.value === 0 || postMax.value > maxPostCount.value) {
    postMax.value = maxPostCount.value
  }
}, { immediate: true })

const filtered = computed(() => {
  const q = debouncedQuery.value.trim().toLowerCase()
  return artists.value.filter(a => {
    const nameMatch = a.name.toLowerCase().includes(q)
    const aliasMatch = (a.other_names || []).some(n => n.toLowerCase().includes(q))
    const searchOk = !q || nameMatch || aliasMatch
    const count = a.post_count || 0
    const aliasCount = (a.other_names || []).length
    const filtersOk = count >= postMin.value && count <= (postMax.value || maxPostCount.value) && aliasCount >= aliasMin.value
    const favOk = !onlyFavorites.value || favorites.value.has(a.name)
    return searchOk && filtersOk && favOk
  })
})

const filteredSorted = computed(() => {
  const list = filtered.value.slice()
  if (sortKey.value === 'name') {
    return list.sort((a, b) => {
      const cmp = sortOrder.value === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      if (cmp !== 0) return cmp
      // 次级键：作品数（降序），确保稳定
      return (b.post_count || 0) - (a.post_count || 0)
    })
  }
  return list.sort((a, b) => {
    const cmp = sortOrder.value === 'asc' ? (a.post_count || 0) - (b.post_count || 0) : (b.post_count || 0) - (a.post_count || 0)
    if (cmp !== 0) return cmp
    // 次级键：名称（升序）
    return a.name.localeCompare(b.name)
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredSorted.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSorted.value.slice(start, start + pageSize.value)
})

watch([debouncedQuery, filteredSorted, sortKey, sortOrder, viewMode, postMin, postMax, aliasMin, onlyFavorites], () => {
  currentPage.value = 1
})
// 视图切换时自适应分页大小
watch(viewMode, (v) => {
  pageSize.value = v === 'grid' ? 24 : 50
  try { localStorage.setItem('library.viewMode', v) } catch {}
})
watch(sortKey, (v) => { try { localStorage.setItem('library.sortKey', v) } catch {} })
watch(sortOrder, (v) => { try { localStorage.setItem('library.sortOrder', v) } catch {} })
watch(onlyFavorites, (v) => { try { localStorage.setItem('library.onlyFavorites', String(v)) } catch {} })

async function refreshArtists() {
  await store.loadArtists({ force: true })
}

function formatOtherNames(names: string[] = []): string {
  if (!names || !names.length) return '—'
  if (names.length <= 6) return names.join('，')
  const shown = names.slice(0, 6).join('，')
  return `${shown}…等${names.length - 6}个别名`
}

function resetFilters() {
  postMin.value = 0
  postMax.value = maxPostCount.value
  aliasMin.value = 0
  onlyFavorites.value = false
}

async function copyName(name: string) {
  try {
    await navigator.clipboard.writeText(name)
    store.addToast('success', '已复制名称', name, 1500)
  } catch {
    store.addToast('error', '复制失败', '请重试或检查权限', 1500)
  }
}

async function copySnippet(a: { name: string }) {
  const snippet = `(${a.name}:1.0)`
  try {
    await navigator.clipboard.writeText(snippet)
    store.addToast('success', '已复制片段', snippet, 1500)
  } catch {
    store.addToast('error', '复制失败', '请重试或检查权限', 1500)
  }
}

function isFavorite(name: string): boolean {
  return favorites.value.has(name)
}

function saveFavorites() {
  try {
    localStorage.setItem('library.favorites', JSON.stringify(Array.from(favorites.value)))
  } catch {}
}

function toggleFavorite(name: string) {
  if (favorites.value.has(name)) {
    favorites.value.delete(name)
  } else {
    favorites.value.add(name)
  }
  saveFavorites()
}
</script>

<style scoped>
/* 主要采用原子类，无额外样式 */
</style>