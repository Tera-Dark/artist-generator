<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref, shallowRef, watch, type Directive } from 'vue'
import { ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Copy, ExternalLink, Grid2X2, ImageOff, List, ListFilter, Search, Shuffle, X } from 'lucide-vue-next'
import ArtistPreview from './ArtistPreview.vue'
import { loadArtistDetails, type ArtistDetail } from '@/data/artistLibrary'
import { buildSearchIndex, DEFAULT_FILTERS, filterArtists, type SearchIndexEntry } from '@/core/artistFilters'
import { parsePageNumber, pickPageItem } from '@/core/pagination'
import { usePreferences } from '@/composables/usePreferences'
import { copyText } from '@/utils/clipboard'

const emit = defineEmits<{ edit: [text: string] }>()
const preferences = usePreferences()
const entries = shallowRef<readonly ArtistDetail[]>([])
const searchIndex = shallowRef<SearchIndexEntry[]>([])
const loading = ref(true)
const failed = ref(false)
const query = ref('')
const filters = reactive({ ...DEFAULT_FILTERS })
const filterOpen = ref(false)
const view = ref<'text' | 'images'>('text')
const page = ref(1)
const jumpDraft = ref('1')
const jumpInput = ref<HTMLInputElement | null>(null)
const lastPickedIndex = ref<number | null>(null)
const showBackToFilters = ref(false)
const notice = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const number = new Intl.NumberFormat('zh-CN')

async function load() {
  loading.value = true
  failed.value = false
  try {
    entries.value = await loadArtistDetails()
    searchIndex.value = buildSearchIndex(entries.value)
  } catch { failed.value = true }
  finally { loading.value = false }
}

const filtered = computed(() => filterArtists(entries.value, searchIndex.value, filters))
const pageSize = computed(() => view.value === 'images' ? preferences.imagePageSize : 24)
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const activeFilters = computed(() => [
  filters.minPosts > 0, filters.maxPosts !== null && filters.maxPosts !== '', filters.aliasFilter !== 'any',
  filters.aliasScript !== 'any', filters.minAliases > 0,
  !!filters.query && filters.scope !== 'all', !!filters.query && filters.match !== 'all',
].filter(Boolean).length)

watch(query, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { filters.query = value.slice(0, 200); page.value = 1 }, 180)
})
watch(() => [filters.scope, filters.match, filters.minPosts, filters.maxPosts, filters.aliasFilter, filters.aliasScript, filters.minAliases, filters.sort], () => { page.value = 1 })
watch([view, () => preferences.imagePageSize], () => { page.value = 1; jumpDraft.value = '1' })
watch(page, (value) => { jumpDraft.value = String(value) })
watch(filtered, () => {
  lastPickedIndex.value = null
  if (page.value > pageCount.value) page.value = 1
  jumpDraft.value = String(page.value)
})

function updateScrollState() { showBackToFilters.value = window.scrollY > 720 }
function listenForScroll() {
  window.addEventListener('scroll', updateScrollState, { passive: true })
  updateScrollState()
}
function stopListeningForScroll() {
  window.removeEventListener('scroll', updateScrollState)
  showBackToFilters.value = false
}
onMounted(() => { void load(); listenForScroll() })
onActivated(listenForScroll)
onDeactivated(stopListeningForScroll)
onUnmounted(() => {
  stopListeningForScroll()
  if (searchTimer) clearTimeout(searchTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
})

function normalisePostRange() {
  const min = Number(filters.minPosts)
  filters.minPosts = Number.isFinite(min) ? Math.min(20000, Math.max(0, Math.trunc(min))) : 0
  if (filters.maxPosts === null || filters.maxPosts === '') { filters.maxPosts = null; return }
  const max = Number(filters.maxPosts)
  filters.maxPosts = Number.isFinite(max) ? Math.min(20000, Math.max(0, Math.trunc(max))) : null
  if (filters.maxPosts !== null && filters.maxPosts < filters.minPosts) {
    ;[filters.minPosts, filters.maxPosts] = [filters.maxPosts, filters.minPosts]
  }
}

function resetFilters() {
  if (searchTimer) clearTimeout(searchTimer)
  query.value = ''
  Object.assign(filters, DEFAULT_FILTERS)
  page.value = 1
}

function flash(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 2200)
}
async function copyName(name: string) {
  try { await copyText(name); flash('已复制画师名') }
  catch { flash('复制失败，请手动选中画师名') }
}
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
function changePage(next: number) {
  lastPickedIndex.value = null
  page.value = Math.min(pageCount.value, Math.max(1, next))
  jumpDraft.value = String(page.value)
  document.querySelector('#library-results')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
}
function jumpToPage() {
  const target = parsePageNumber(jumpDraft.value, pageCount.value)
  if (target === null) {
    flash(`请输入 1–${pageCount.value} 之间的整数页码`)
    jumpInput.value?.focus()
    jumpInput.value?.select()
    return
  }
  jumpInput.value?.blur()
  changePage(target)
}
async function discoverRandom() {
  const found = pickPageItem(filtered.value, pageSize.value)
  if (!found) return
  page.value = found.page
  lastPickedIndex.value = found.index
  flash(`随机发现：${found.item.name}`)
  await nextTick()
  const card = document.getElementById(`artist-card-${found.index}`)
  card?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
  card?.focus({ preventScroll: true })
}
function backToFilters() {
  document.querySelector('.library-toolbar')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
}

// Grid auto-rows with measured spans: genuine variable-height masonry, stable row-major DOM order.
const masonryObservers = new WeakMap<HTMLElement, ResizeObserver>()
function positionCard(el: HTMLElement) {
  if (!el.isConnected || !el.parentElement) return
  const style = getComputedStyle(el.parentElement)
  const row = Number.parseFloat(style.gridAutoRows) || 8
  const gap = Number.parseFloat(style.rowGap) || 14
  const span = Math.max(1, Math.ceil((el.getBoundingClientRect().height + gap) / (row + gap)))
  if (el.style.gridRowEnd !== `span ${span}`) el.style.gridRowEnd = `span ${span}`
}
const vMasonry: Directive<HTMLElement> = {
  mounted(el) {
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => requestAnimationFrame(() => positionCard(el)))
      observer.observe(el)
      masonryObservers.set(el, observer)
    }
    requestAnimationFrame(() => positionCard(el))
  },
  unmounted(el) { masonryObservers.get(el)?.disconnect(); masonryObservers.delete(el) },
}
</script>

<template>
  <section class="library-page">
    <div class="page-header">
      <p class="section-eyebrow">LOCAL ARTIST INDEX / 画师库</p>
      <h1>找到你喜欢的画师<span class="title-period">.</span></h1>
      <p class="page-subtitle">完整保留原始 JSON 的画师名、全部别名、作品数和 Danbooru 链接。按名称、多个别名和作品数筛选；图片进入视野才加载。</p>
    </div>

    <div class="library-toolbar panel" data-tour="library">
      <label class="search-box" for="artist-search">
        <Search :size="18" aria-hidden="true" />
        <input id="artist-search" v-model="query" type="search" maxlength="200" placeholder="搜索画师名或多个别名…" autocomplete="off" />
      </label>
      <label class="sort-select">排序
        <select v-model="filters.sort" aria-label="画师排序">
          <option value="count">作品数从高到低</option><option value="countAsc">作品数从低到高</option>
          <option value="name">名称 A–Z</option><option value="aliases">别名最多</option><option value="original">原始顺序</option>
        </select>
      </label>
      <div class="view-switch" role="group" aria-label="画师库视图" data-tour="gallery">
        <button type="button" :aria-pressed="view === 'text'" @click="view = 'text'"><List :size="16" aria-hidden="true" /> 纯文本</button>
        <button type="button" :aria-pressed="view === 'images'" @click="view = 'images'"><Grid2X2 :size="16" aria-hidden="true" /> 瀑布流</button>
      </div>
      <div class="library-filter-trigger">
        <button type="button" :aria-expanded="filterOpen" aria-controls="library-filters" @click="filterOpen = !filterOpen"><ListFilter :size="16" /> 多条件筛选 <span v-if="activeFilters" class="filter-count">{{ activeFilters }}</span><ChevronDown :size="16" :class="{ 'is-open': filterOpen }" /></button>
        <span>多个关键词可用空格 / 逗号分隔；引号包住带空格的别名。</span>
      </div>
    </div>

    <section v-if="filterOpen" id="library-filters" class="library-filters panel" aria-label="画师库高级筛选">
      <label class="filter-field">搜索范围 <select v-model="filters.scope" aria-label="搜索范围"><option value="all">名称 + 所有别名</option><option value="name">仅画师名</option><option value="aliases">仅别名</option></select></label>
      <label class="filter-field">多词匹配 <select v-model="filters.match" aria-label="多词匹配"><option value="all">同时包含全部词（且）</option><option value="any">包含任意一个词（或）</option></select></label>
      <label class="filter-field">最低作品数 <input v-model.number="filters.minPosts" type="number" min="0" max="20000" step="1" aria-label="最低作品数" @change="normalisePostRange" /></label>
      <label class="filter-field">最高作品数 <input v-model.number="filters.maxPosts" type="number" min="0" max="20000" step="1" placeholder="不限" aria-label="最高作品数" @change="normalisePostRange" /></label>
      <label class="filter-field">是否有别名 <select v-model="filters.aliasFilter" aria-label="是否有别名"><option value="any">不限</option><option value="with">有别名</option><option value="without">无别名</option></select></label>
      <label class="filter-field">别名字符 <select v-model="filters.aliasScript" aria-label="别名字符"><option value="any">不限</option><option value="han">包含汉字</option><option value="kana">包含日文假名</option></select></label>
      <label class="filter-field">至少几条别名 <select v-model.number="filters.minAliases" aria-label="至少几条别名"><option :value="0">不限</option><option v-for="count in [1, 2, 3, 5, 10]" :key="count" :value="count">{{ count }} 条</option></select></label>
      <div class="filter-actions"><span>作品数量为本地快照；别名来自原始完整画师 JSON。</span><button type="button" @click="resetFilters"><X :size="15" /> 清空筛选</button></div>
    </section>

    <p v-if="view === 'images'" class="library-note"><ImageOff :size="16" aria-hidden="true" /> 最新全年龄作品 · 当前 {{ preferences.imageQuality === 'high' ? '720' : preferences.imageQuality === 'balanced' ? '360' : '180' }} px。可在设置中调整；每位画师按可视区域请求，较高精度消耗更多流量。</p>

    <div id="library-results" class="library-results">
      <div class="list-heading">
        <span>{{ loading ? '正在读取完整画师数据…' : failed ? '完整画师库加载失败' : `找到 ${number.format(filtered.length)} 位画师` }}</span>
        <div v-if="!loading && !failed && filtered.length" class="list-heading-actions">
          <span>第 {{ page }} / {{ pageCount }} 页</span>
          <button type="button" class="random-artist" title="从当前筛选结果中随机挑选一位" @click="discoverRandom"><Shuffle :size="16" aria-hidden="true" /> 随机发现</button>
        </div>
      </div>

      <div v-if="loading" class="empty-surface">正在载入原始画师数据，首次进入可能需要几秒钟…</div>
      <div v-else-if="failed" class="empty-surface">完整画师库加载失败。<button type="button" class="text-action" @click="load">重试</button></div>
      <div v-else-if="!visible.length" class="empty-surface">没有匹配的画师；可切换「任意匹配」、放宽作品数或清空筛选。</div>

      <div v-else-if="view === 'text'" class="artist-list">
        <article v-for="(artist, index) in visible" :id="`artist-card-${(page - 1) * pageSize + index}`" :key="artist.name" class="artist-row" :class="{ 'is-picked': lastPickedIndex === (page - 1) * pageSize + index }" tabindex="-1">
          <div class="artist-row-top"><span class="artist-index">{{ (page - 1) * pageSize + index + 1 }}</span><h2>{{ artist.name }}</h2><span class="post-count">{{ number.format(artist.post_count) }} 作品</span></div>
          <p class="artist-aliases"><span class="detail-label">别名 / 词缀</span> {{ artist.other_names.length ? artist.other_names.join(' · ') : '无' }}</p>
          <div class="artist-row-bottom">
            <a :href="artist.danbooru_url" target="_blank" rel="noopener noreferrer" class="artist-url">{{ artist.danbooru_url }} <ExternalLink :size="13" aria-hidden="true" /></a>
            <div class="row-actions"><button type="button" @click="copyName(artist.name)"><Copy :size="14" aria-hidden="true" /> 复制名称</button><button type="button" @click="emit('edit', artist.name)">放入编辑器</button></div>
          </div>
        </article>
      </div>

      <div v-else class="artist-grid" :class="{ 'is-compact': preferences.galleryDensity === 'compact' }">
        <article v-for="(artist, index) in visible" :id="`artist-card-${(page - 1) * pageSize + index}`" :key="artist.name" v-masonry class="artist-card" :class="{ 'is-picked': lastPickedIndex === (page - 1) * pageSize + index }" tabindex="-1">
          <ArtistPreview :name="artist.name" :quality="preferences.imageQuality" />
          <div class="artist-card-body">
            <div class="artist-card-title"><h2 :title="artist.name">{{ artist.name }}</h2><span>{{ number.format(artist.post_count) }}</span></div>
            <p :title="artist.other_names.join(' · ')">{{ artist.other_names.length ? artist.other_names.join(' · ') : '无其他别名' }}</p>
            <div class="artist-card-actions"><button type="button" @click="copyName(artist.name)">复制名称</button><a :href="artist.danbooru_url" target="_blank" rel="noopener noreferrer">画师主页 <ExternalLink :size="13" aria-hidden="true" /></a></div>
          </div>
        </article>
      </div>

      <nav v-if="!loading && !failed && pageCount > 1" class="pagination" aria-label="画师库翻页">
        <button type="button" :disabled="page === 1" @click="changePage(page - 1)"><ArrowLeft :size="16" aria-hidden="true" /> 上一页</button>
        <span class="pagination-current">{{ page }} / {{ pageCount }}</span>
        <button type="button" :disabled="page === pageCount" @click="changePage(page + 1)">下一页 <ArrowRight :size="16" aria-hidden="true" /></button>
        <form class="page-jump" aria-label="跳转到指定页" @submit.prevent="jumpToPage">
          <label for="library-page-number">跳至</label>
          <input id="library-page-number" ref="jumpInput" v-model="jumpDraft" type="text" inputmode="numeric" autocomplete="off" :aria-label="`目标页码，1 到 ${pageCount} 页`" :aria-description="`当前筛选结果共 ${pageCount} 页`" />
          <span>页</span>
          <button type="submit">跳转</button>
        </form>
      </nav>
    </div>
    <button v-if="showBackToFilters" type="button" class="back-to-filters" title="回到画师库筛选" @click="backToFilters"><ArrowUp :size="17" aria-hidden="true" /> 返回筛选</button>
    <div v-if="notice" class="toast-inline" role="status">{{ notice }}</div>
  </section>
</template>
