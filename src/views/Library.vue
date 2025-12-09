<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader sectionLabel="画师库" />

    <!-- 主体 -->
    <main class="section section-spacing">
      <div class="container-responsive">
        <h1 class="heading-xl mb-10">所有画师信息</h1>

        <!-- 搜索与统计 -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="md:col-span-2 card p-8">
            <div class="flex items-center justify-between">
              <label class="block text-lg font-bold text-neutral-900 dark:text-neutral-100"
                >搜索（名称或别名）</label
              >
              <div class="flex items-center gap-4">
                <button
                  class="btn btn-secondary text-sm px-4 py-2"
                  @click="query = ''"
                  :disabled="!query"
                >
                  清空
                </button>
                <button
                  class="btn btn-secondary text-sm px-4 py-2"
                  @click="refreshArtists"
                  :disabled="isLoading"
                >
                  {{ isLoading ? '刷新中…' : '刷新' }}
                </button>
              </div>
            </div>
            <input
              v-model="query"
              type="text"
              class="mt-4 input-field h-14 text-lg"
              placeholder="例如：pixiv、动漫、某画师别名"
            />
            <div v-if="isLoading" class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              画师库加载中…
            </div>
          </div>
          <div class="card p-8">
            <div class="text-base text-muted uppercase tracking-wide font-bold mb-4">统计</div>
            <div class="space-y-2 text-base">
              <div>总数：{{ artists.length }}</div>
              <div class="text-muted">匹配：{{ filtered.length }}</div>
              <div class="text-muted">页：{{ currentPage }} / {{ totalPages }}</div>
              <div class="text-muted">最近加载：{{ loadedAtText }}</div>
              <div class="text-muted">收藏：{{ favoritesCount }}</div>
            </div>
          </div>
        </div>

        <!-- 排序与视图切换 -->
        <div class="mt-10 card p-8">
          <div class="flex flex-col gap-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div class="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3">排序方式</div>
                <div class="flex items-center gap-4">
                  <button
                    class="btn btn-secondary text-sm px-4 py-2"
                    :class="{ 'btn-primary': sortKey === 'count' }"
                    @click="sortKey = 'count'"
                  >
                    按作品数
                  </button>
                  <button
                    class="btn btn-secondary text-sm px-4 py-2"
                    :class="{ 'btn-primary': sortKey === 'name' }"
                    @click="sortKey = 'name'"
                  >
                    A-Z
                  </button>
                </div>
              </div>
              <div>
                <div class="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3">排序方向</div>
                <div class="flex items-center gap-4">
                  <button
                    class="btn btn-secondary text-sm px-4 py-2"
                    :class="{ 'btn-primary': sortOrder === 'asc' }"
                    @click="sortOrder = 'asc'"
                  >
                    升序
                  </button>
                  <button
                    class="btn btn-secondary text-sm px-4 py-2"
                    :class="{ 'btn-primary': sortOrder === 'desc' }"
                    @click="sortOrder = 'desc'"
                  >
                    降序
                  </button>
                </div>
              </div>
              <div>
                <div class="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3">显示格式</div>
                <div class="flex items-center gap-4">
                  <button
                    class="btn btn-secondary text-sm px-4 py-2"
                    :class="{ 'btn-primary': viewMode === 'list' }"
                    @click="viewMode = 'list'"
                  >
                    列表
                  </button>
                  <button
                    class="btn btn-secondary text-sm px-4 py-2"
                    :class="{ 'btn-primary': viewMode === 'grid' }"
                    @click="viewMode = 'grid'"
                  >
                    卡片
                  </button>
                </div>
              </div>
            </div>

            <div class="border-t-2 border-neutral-100 dark:border-neutral-800 pt-6">
              <div class="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">筛选</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <label class="text-xs text-muted block mb-1">作品数 ≥</label>
                  <input
                    v-model.number="postMin"
                    type="number"
                    min="0"
                    class="input-field h-10 text-base"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">作品数 ≤</label>
                  <input
                    v-model.number="postMax"
                    type="number"
                    :min="0"
                    class="input-field h-10 text-base"
                    :placeholder="String(maxPostCount)"
                  />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">别名数 ≥</label>
                  <input
                    v-model.number="aliasMin"
                    type="number"
                    min="0"
                    class="input-field h-10 text-base"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">仅收藏</label>
                  <div class="mt-0">
                    <button
                      class="btn btn-secondary text-sm px-4 py-2 w-full"
                      :class="{ 'btn-primary': onlyFavorites }"
                      @click="onlyFavorites = !onlyFavorites"
                    >
                      {{ onlyFavorites ? '已启用' : '未启用' }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="mt-6">
                <button class="btn btn-secondary text-sm px-5 py-2" @click="resetFilters">
                  重置筛选
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表 / 卡片视图 -->
        <div class="mt-10 card">
        <div v-if="viewMode === 'list'" class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                <th class="text-left p-3 border-b border-neutral-200 dark:border-neutral-800">
                  名称
                </th>
                <th class="text-left p-3 border-b border-neutral-200 dark:border-neutral-800">
                  别名
                </th>
                <th class="text-left p-3 border-b border-neutral-200 dark:border-neutral-800">
                  作品数
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="3" class="p-4 text-center text-neutral-600 dark:text-neutral-300">
                  加载中…
                </td>
              </tr>
              <tr
                v-else
                v-for="(a, i) in paged"
                :key="a.name + '-' + i"
                class="hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <td class="p-3 text-neutral-900 dark:text-neutral-100">
                  <span>{{ a.name }}</span>
                  <button
                    class="ml-2 text-xs"
                    @click="toggleFavorite(a.name)"
                    :aria-pressed="isFavorite(a.name)"
                    title="收藏/取消"
                  >
                    <span :class="isFavorite(a.name) ? 'text-yellow-500' : 'text-neutral-400'">{{
                      isFavorite(a.name) ? '★' : '☆'
                    }}</span>
                  </button>
                  <button
                    class="ml-2 btn btn-secondary text-xs px-2 py-0.5"
                    @click="copyName(a.name)"
                  >
                    复制
                  </button>
                  <button
                    class="ml-1 btn btn-secondary text-xs px-2 py-0.5"
                    @click="copySnippet(a)"
                  >
                    片段
                  </button>
                </td>
                <td class="p-3 text-neutral-700 dark:text-neutral-300">
                  <span v-if="a.other_names && a.other_names.length">{{
                    formatOtherNames(a.other_names)
                  }}</span>
                  <span v-else>—</span>
                </td>
                <td class="p-3 text-neutral-700 dark:text-neutral-300">{{ a.post_count ?? 0 }}</td>
              </tr>
              <tr v-if="!isLoading && filteredSorted.length === 0">
                <td colspan="3" class="p-4 text-center text-neutral-600 dark:text-neutral-300">
                  没有匹配的画师，请调整筛选或搜索。
                </td>
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
          <div
            v-else-if="filteredSorted.length > 0"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div v-for="(a, i) in paged" :key="a.name + '-' + i" class="card p-5 hover-lift flex flex-col h-full relative group">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                     <h3 class="font-black text-lg text-neutral-900 dark:text-neutral-100 truncate" :title="a.name">{{ a.name }}</h3>
                     <button
                      class="text-neutral-400 hover:text-yellow-500 transition-colors"
                      @click.stop="toggleFavorite(a.name)"
                      :aria-pressed="isFavorite(a.name)"
                      title="收藏/取消"
                    >
                      <svg v-if="isFavorite(a.name)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 fill-current text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </button>
                  </div>
                  <div class="text-xs text-muted mt-2 line-clamp-2 min-h-[2.5em]">
                    <span v-if="a.other_names && a.other_names.length" :title="a.other_names.join(', ')">{{
                      formatOtherNames(a.other_names)
                    }}</span>
                    <span v-else class="italic opacity-50">暂无别名</span>
                  </div>
                </div>

                <!-- Redesigned Post Count Badge -->
                <div class="flex-shrink-0 flex flex-col items-center justify-center bg-primary-500 border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-14 h-14" title="收录作品数">
                  <span class="text-[10px] font-bold uppercase leading-none tracking-tighter mb-0.5">POSTS</span>
                  <span class="font-mono text-xl font-black leading-none">{{ a.post_count ?? 0 }}</span>
                </div>
              </div>

              <div class="mt-auto pt-4 flex items-center gap-3">
                <button class="btn btn-secondary text-xs flex-1 py-2" @click="copyName(a.name)">
                  复制名称
                </button>
                <button class="btn btn-secondary text-xs flex-1 py-2" @click="copySnippet(a)">
                  复制片段
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-sm text-neutral-600 dark:text-neutral-400">
            没有匹配的画师，请调整筛选或搜索。
          </div>
        </div>

        <div class="flex items-center justify-between px-4 py-3 divider">
          <div class="text-xs text-neutral-600 dark:text-neutral-400">
            每页 {{ pageSize }} · 共 {{ filteredSorted.length }} 条
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-secondary text-xs px-3 py-1.5"
              :disabled="currentPage <= 1"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              上一页
            </button>
            <span class="text-xs text-neutral-600 dark:text-neutral-400"
              >{{ currentPage }} / {{ totalPages }}</span
            >
            <button
              class="btn btn-secondary text-xs px-3 py-1.5"
              :disabled="currentPage >= totalPages"
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
            >
              下一页
            </button>

            <form @submit.prevent="handlePageJump" class="flex items-center gap-1 ml-2">
                <input v-model.number="pageInput" type="number" min="1" :max="totalPages" class="w-12 h-8 px-1 text-center border border-neutral-300 dark:border-neutral-700 rounded text-xs bg-transparent" />
                <button type="submit" class="btn btn-secondary text-xs px-2 py-1.5">Go</button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { onMounted, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGeneratorStore } from '@/stores/generator'

const { t } = useI18n()
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
const pageInput = ref(1)
const sortKey = ref<'count' | 'name'>('count')
const sortOrder = ref<'asc' | 'desc'>('desc')

watch(currentPage, (val) => {
  pageInput.value = val
})


const viewMode = ref<'list' | 'grid'>('list')
const postMin = ref(0)
const postMax = ref(0)
const aliasMin = ref(0)
const loadedAtText = computed(() =>
  store.artistsLoadedAt ? new Date(store.artistsLoadedAt).toLocaleString() : '—',
)
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
        if (Array.isArray(arr))
          favorites.value = new Set(arr.filter((x: any) => typeof x === 'string'))
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
  return Math.max(...artists.value.map((a) => a.post_count || 0))
})
// 初始化与约束 postMax
watch(
  artists,
  () => {
    if (postMax.value === 0 || postMax.value > maxPostCount.value) {
      postMax.value = maxPostCount.value
    }
  },
  { immediate: true },
)

const filtered = computed(() => {
  const q = debouncedQuery.value.trim().toLowerCase()
  return artists.value.filter((a) => {
    const nameMatch = a.name.toLowerCase().includes(q)
    const aliasMatch = (a.other_names || []).some((n) => n.toLowerCase().includes(q))
    const searchOk = !q || nameMatch || aliasMatch
    const count = a.post_count || 0
    const aliasCount = (a.other_names || []).length
    const filtersOk =
      count >= postMin.value &&
      count <= (postMax.value || maxPostCount.value) &&
      aliasCount >= aliasMin.value
    const favOk = !onlyFavorites.value || favorites.value.has(a.name)
    return searchOk && filtersOk && favOk
  })
})

const filteredSorted = computed(() => {
  const list = filtered.value.slice()
  if (sortKey.value === 'name') {
    return list.sort((a, b) => {
      const cmp =
        sortOrder.value === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      if (cmp !== 0) return cmp
      // 次级键：作品数（降序），确保稳定
      return (b.post_count || 0) - (a.post_count || 0)
    })
  }
  return list.sort((a, b) => {
    const cmp =
      sortOrder.value === 'asc'
        ? (a.post_count || 0) - (b.post_count || 0)
        : (b.post_count || 0) - (a.post_count || 0)
    if (cmp !== 0) return cmp
    // 次级键：名称（升序）
    return a.name.localeCompare(b.name)
  })
})
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredSorted.value.length / pageSize.value)),
)
const paged = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSorted.value.slice(start, start + pageSize.value)
})

watch(
  [
    debouncedQuery,
    filteredSorted,
    sortKey,
    sortOrder,
    viewMode,
    postMin,
    postMax,
    aliasMin,
    onlyFavorites,
  ],
  () => {
    currentPage.value = 1
  },
)
// 视图切换时自适应分页大小
watch(viewMode, (v) => {
  pageSize.value = v === 'grid' ? 24 : 50
  try {
    localStorage.setItem('library.viewMode', v)
  } catch {}
})
watch(sortKey, (v) => {
  try {
    localStorage.setItem('library.sortKey', v)
  } catch {}
})
watch(sortOrder, (v) => {
  try {
    localStorage.setItem('library.sortOrder', v)
  } catch {}
})
watch(onlyFavorites, (v) => {
  try {
    localStorage.setItem('library.onlyFavorites', String(v))
  } catch {}
})

async function refreshArtists() {
  await store.loadArtists({ force: true })
}

function handlePageJump() {
  const p = Math.max(1, Math.min(totalPages.value, pageInput.value))
  currentPage.value = p
  pageInput.value = p
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
  if (!store.user) {
    store.addToast('info', t('auth.identity_check'), t('share.auth_required'))
    return
  }
  try {
    await navigator.clipboard.writeText(name)
    store.addToast('success', '已复制名称', name, 1500)
  } catch {
    store.addToast('error', '复制失败', '请重试或检查权限', 1500)
  }
}

async function copySnippet(a: { name: string; other_names?: string[]; post_count?: number }) {
  if (!store.user) {
    store.addToast('info', t('auth.identity_check'), t('share.auth_required'))
    return
  }
  const aliases = a.other_names && a.other_names.length ? a.other_names.join(',') : '—'
  const snippet = `画师名：${a.name} 别名：${aliases} 作品数：${a.post_count ?? 0}`
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
