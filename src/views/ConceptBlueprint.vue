<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader sectionLabel="工作区" />

    <!-- 主体：两步流程 -->
    <main class="section py-16 fade-in-up">
      <section class="max-w-3xl">
        <h1 class="heading-xl">画师串生成器</h1>
      </section>

      <!-- 快速输出（置顶可见） -->
      <section class="mt-8 fade-in">
        <h2 class="section-title">输出</h2>
        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="md:col-span-2 card p-4 md:sticky md:top-24">
            <div class="text-sm text-muted mb-2">最终输出</div>
            <div class="font-mono text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4" aria-live="polite">{{ finalResult }}</div>
          </div>
          <div class="md:col-span-1 card p-4 md:sticky md:top-24">
            <div class="grid grid-cols-1 gap-2">
              <button
                id="generate-btn-top"
                class="btn btn-primary"
                @click="generate"
                :disabled="store.isLoading"
                :aria-busy="store.isLoading"
              >
                <span>生成</span>
                <span v-if="store.isLoading" class="ml-2 text-xs animate-pulse">加载中…</span>
              </button>
              <button id="copy-btn-top" class="btn btn-secondary" @click="copyOutput">复制</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 步骤 1：选择模式、数量与格式（随机从库） -->
      <section class="mt-10">
        <h2 class="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">步骤 1：模式、数量与格式</h2>
        <div class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button :class="['card p-4 transition-all', selectedMode==='pure' ? 'border-neutral-900 ring-2 ring-neutral-900/15 bg-neutral-50 shadow-md dark:bg-neutral-800' : 'hover:-translate-y-[1px]']" @click="selectedMode='pure'">
            <div class="flex items-center gap-2">
              <span v-if="selectedMode==='pure'" class="inline-block w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100"></span>
              <div class="font-medium text-neutral-900 dark:text-neutral-100">纯净模式</div>
            </div>
            <div class="text-sm text-muted mt-1">只输出画师名</div>
          </button>
          <button :class="['card p-4 transition-all', selectedMode==='standard' ? 'border-neutral-900 ring-2 ring-neutral-900/15 bg-neutral-50 shadow-md dark:bg-neutral-800' : 'hover:-translate-y-[1px]']" @click="selectedMode='standard'">
            <div class="flex items-center gap-2">
              <span v-if="selectedMode==='standard'" class="inline-block w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100"></span>
              <div class="font-medium text-neutral-900 dark:text-neutral-100">标准模式</div>
            </div>
            <div class="text-sm text-muted mt-1">权重均衡</div>
          </button>
          <button :class="['card p-4 transition-all', selectedMode==='creative' ? 'border-neutral-900 ring-2 ring-neutral-900/15 bg-neutral-50 shadow-md dark:bg-neutral-800' : 'hover:-translate-y-[1px]']" @click="selectedMode='creative'">
            <div class="flex items-center gap-2">
              <span v-if="selectedMode==='creative'" class="inline-block w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100"></span>
              <div class="font-medium text-neutral-900 dark:text-neutral-100">括号模式</div>
            </div>
            <div class="text-sm text-muted mt-1">括号权重</div>
          </button>
          <button :class="['card p-4 transition-all', selectedMode==='nai' ? 'border-neutral-900 ring-2 ring-neutral-900/15 bg-neutral-50 shadow-md dark:bg-neutral-800' : 'hover:-translate-y-[1px]']" @click="selectedMode='nai'">
            <div class="flex items-center gap-2">
              <span v-if="selectedMode==='nai'" class="inline-block w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100"></span>
              <div class="font-medium text-neutral-900 dark:text-neutral-100">NAI 模式</div>
            </div>
            <div class="text-sm text-muted mt-1">NAI 风格格式</div>
          </button>
        </div>

        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">艺术家数量</label>
            <div class="mt-3 flex items-center gap-4">
              <button @click="decrementCount" class="btn btn-secondary w-10 h-10 !p-0 flex items-center justify-center text-xl" aria-label="减少">−</button>
              <div class="text-4xl font-bold w-16 text-center" aria-live="polite">{{ artistCount }}</div>
              <button @click="incrementCount" class="btn btn-secondary w-10 h-10 !p-0 flex items-center justify-center text-xl" aria-label="增加">+</button>
            </div>
            <div class="mt-2 text-xs text-muted">最小 1 · 最大 20</div>
          </div>
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">输出格式</label>
            <select v-model="outputFormat" class="mt-2 input-field">
              <option value="standard">Standard</option>
              <option value="nai">NovelAI</option>
            </select>
          </div>
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">随机来源</label>
            <div class="mt-2 text-xs text-muted">从库中随机补足（排除已预选）</div>
          </div>
          <!-- 新增：作品数筛选 -->
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">作品数筛选</label>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <select id="post-count-filter-mode" v-model="postCountFilterMode" class="input-field">
                <option value="none">不限</option>
                <option value="gt">大于</option>
                <option value="lt">小于</option>
              </select>
              <input id="post-count-threshold" v-model.number="postCountThreshold" type="number" min="0" class="input-field" placeholder="阈值" />
            </div>
            <div class="mt-2 text-xs text-muted">用于联想与随机补足的过滤</div>
          </div>
        </div>

        <!-- 创意模式：括号样式与嵌套层数配置 -->
        <div v-if="selectedMode==='creative'" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">括号样式</label>
            <div class="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="括号样式">
              <label class="inline-flex items-center gap-2 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer">
                <input type="radio" name="bracket-style" value="paren" v-model="creativeBracketStyle" />
                <span>() ×1.1</span>
              </label>
              <label class="inline-flex items-center gap-2 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer">
                <input type="radio" name="bracket-style" value="curly" v-model="creativeBracketStyle" />
                <span>{} ×1.05</span>
              </label>
              <label class="inline-flex items-center gap-2 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 cursor-pointer">
                <input type="radio" name="bracket-style" value="square" v-model="creativeBracketStyle" />
                <span>[] ×0.9</span>
              </label>
            </div>
            <div class="mt-2 text-xs text-muted">提示：括号语法仅包裹名称来表达权重；() ×1.1 · {} ×1.05 · [] ×0.9。</div>
          </div>
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">嵌套层数（0-5）</label>
            <input id="creative-nest-levels" v-model.number="creativeNestLevels" type="number" min="0" max="5" class="mt-2 input-field" />
            <div class="mt-2 text-xs text-muted">0 表示随机；最多 5 层：越多权重效果越强</div>
          </div>
        </div>

        <!-- 标准模式：权重范围（0-2，步进 0.1） -->
        <div v-if="selectedMode==='standard'" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">权重下限（min，0-2）</label>
            <input id="standard-weight-min" v-model.number="standardWeightMin" type="range" min="0" max="2" step="0.1" class="mt-2 w-full" />
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mt-4">权重上限（max，0-2）</label>
            <input id="standard-weight-max" v-model.number="standardWeightMax" type="range" min="0" max="2" step="0.1" class="mt-2 w-full" />
            <div class="mt-2 text-xs text-muted">当前：{{ standardWeightMin.toFixed(1) }} - {{ standardWeightMax.toFixed(1) }}；若相等则统一权重</div>
          </div>
        </div>

        <!-- NAI 模式：权重范围（0-2，步进 0.1） -->
        <div v-if="selectedMode==='nai'" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card p-4">
            <label class="block text-sm text-neutral-600 dark:text-neutral-300">权重下限（min，0-2）</label>
            <input id="nai-weight-min" v-model.number="naiWeightMin" type="range" min="0" max="2" step="0.1" class="mt-2 w-full" />
            <label class="block text-sm text-neutral-600 dark:text-neutral-300 mt-4">权重上限（max，0-2）</label>
            <input id="nai-weight-max" v-model.number="naiWeightMax" type="range" min="0" max="2" step="0.1" class="mt-2 w-full" />
            <div class="mt-2 text-xs text-muted">当前：{{ naiWeightMin.toFixed(1) }} - {{ naiWeightMax.toFixed(1) }}；范围内随机</div>
          </div>
        </div>
      </section>

      <!-- 步骤 2：预选艺术家（可选） -->
      <section class="mt-12">
        <h2 class="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">步骤 2：预选艺术家（可选）</h2>
        <div ref="artistDropdownRef" class="mt-4 relative max-w-2xl border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <label class="block text-sm text-neutral-600 dark:text-neutral-300">搜索艺术家（匹配主名与别名）</label>
          <input
            ref="artistInputRef"
            v-model="artistQuery"
            type="text"
            class="mt-2 input-field focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100"
            placeholder="输入关键字，最多显示10个匹配"
            @keydown="onArtistKeydown"
            @focus="dropdownOpen = true"
            aria-autocomplete="list"
            aria-controls="artist-suggestion-list"
            :aria-expanded="suggestions.length > 0"
          />
          <div v-if="store.isLoading" class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">画师库加载中…</div>
          <p class="mt-2 text-xs text-muted">已添加：
            <span v-if="preselectedNames.length === 0">无</span>
            <span v-else class="inline-flex flex-wrap gap-2">
              <span v-for="(n, i) in preselectedNames" :key="n + i" class="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 text-xs shadow-sm">
                {{ n }}
                <button class="ml-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100" @click="removePreselected(i)">×</button>
              </span>
            </span>
          </p>
          <div class="mt-2">
            <button v-if="preselectedNames.length" class="btn btn-secondary text-xs px-2 py-1" @click="clearPreselected">清空预选</button>
          </div>

          <!-- 下拉联想列表 -->
          <div v-if="suggestions.length && dropdownOpen" class="absolute left-0 right-0 top-full mt-2 z-30">
            <ul
              id="artist-suggestion-list"
              role="listbox"
              class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden"
            >
              <li
                v-for="(s, i) in suggestions"
                :key="s.name + '-' + i"
                role="option"
                :aria-selected="i === activeIndex"
                @mouseenter="activeIndex = i"
                @mouseleave="activeIndex = -1"
                @click="!isPreselected(s.name) && selectSuggestion(s)"
                class="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 first:border-t-0 transition-colors"
                :class="[
                  i === activeIndex ? 'bg-neutral-50 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800',
                  isPreselected(s.name) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                ]"
              >
                <div class="flex items-center justify-between">
                  <div class="font-medium text-neutral-900 dark:text-neutral-100 truncate" v-html="renderHighlightedName(s.name)"></div>
                  <div class="text-xs text-neutral-500 dark:text-neutral-400">
                    <span v-if="isPreselected(s.name)" class="mr-2">已添加</span>
                    别名 {{ s.other_names?.length || 0 }} · 作品 {{ s.post_count || 0 }}
                  </div>
                </div>
                <div v-if="matchedAliases(s).length" class="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  别名匹配：<span v-html="renderHighlightedAliases(s)"></span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <!-- 推荐：基于作品数前列（排除已预选） -->
        <div class="mt-6 card p-4">
          <div class="text-sm text-muted mb-2">推荐（依据作品数靠前）</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(r,i) in recommendedArtists"
              :key="r.name + '-' + i"
              class="btn btn-secondary text-xs px-2 py-1"
              @click="addPreselected(r.name)"
            >
              {{ r.name }}
            </button>
          </div>
        </div>
      </section>
      
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useGeneratorStore } from '@/stores/generator'

type Artist = { name: string; other_names?: string[]; post_count?: number }
type BracketStyle = 'paren' | 'curly' | 'square'

const selectedMode = ref<'pure' | 'standard' | 'creative' | 'nai'>('standard')
const outputFormat = ref<'standard' | 'nai'>('standard')
const artistCount = ref(3)
// 作品数筛选
const postCountFilterMode = ref<'none' | 'gt' | 'lt'>('none')
const postCountThreshold = ref<number>(0)

// 创意模式：括号样式与嵌套层数
const creativeBracketStyle = ref<BracketStyle>('paren')
// 默认 0：表示随机（每个名字独立随机 1-5 层）
const creativeNestLevels = ref<number>(0)

// 权重滑条：标准与 NAI（下限/上限）
const standardWeightMin = ref<number>(0.5)
const standardWeightMax = ref<number>(1.5)
const naiWeightMin = ref<number>(0.5)
const naiWeightMax = ref<number>(1.5)

// 作品数筛选判断函数
function passesPostCountFilter(a: Artist) {
  const mode = postCountFilterMode.value
  const threshold = postCountThreshold.value || 0
  const posts = a.post_count || 0
  if (mode === 'gt') return posts > threshold
  if (mode === 'lt') return posts < threshold
  return true
}
// 数量控制（1-20 上限）
function incrementCount() {
  artistCount.value = Math.min(20, (artistCount.value || 1) + 1)
}
function decrementCount() {
  artistCount.value = Math.max(1, (artistCount.value || 1) - 1)
}

const artistQuery = ref('')
const artistInputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(-1)
const dropdownOpen = ref(false)
const artistDropdownRef = ref<HTMLElement | null>(null)
const debouncedQuery = ref('')
let debounceTimer: number | undefined

const store = useGeneratorStore()
const finalResult = ref('')

// 文档外部点击关闭下拉（需在 setup 同步注册卸载钩子）
const onDocClick = (e: MouseEvent) => {
  if (!artistDropdownRef.value) return
  if (!artistDropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(async () => {
  // 懒加载：首次进入不主动加载，避免首屏压力
  // 若已有缓存则无需加载
  if (!store.artists.length) {
    // 可选：延迟到用户交互时再触发
  }
  // 绑定全局点击事件
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})

// 输入节流
watch(artistQuery, (val) => {
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debouncedQuery.value = val
  }, 150)
})

// 当用户开始输入时按需加载 artists
watch(debouncedQuery, async (val) => {
  if (val.trim() && !store.artists.length && !store.isLoading) {
    await store.loadArtists()
  }
})

// 下拉联想：通过store搜索并限制10个，优先主名匹配
const suggestions = computed(() => {
  const q = debouncedQuery.value.trim()
  if (!q) return []
  const all = store.searchArtists(q)
  const filtered = all.filter(passesPostCountFilter)
  const scored = filtered.map(a => {
    const lq = q.toLowerCase()
    const name = a.name.toLowerCase()
    const aliasMatch = (a.other_names || []).some(n => n.toLowerCase().includes(lq))
    const starts = name.startsWith(lq)
    const contains = !starts && name.includes(lq)
    const score = starts ? 2 : contains ? 1 : aliasMatch ? 1 : 0
    return { a, score }
  })
  scored.sort((x, y) => (y.score - x.score) || ((y.a.post_count || 0) - (x.a.post_count || 0)))
  return scored.slice(0, 10).map(s => s.a)
})

// 高亮匹配与别名显示（安全转义 + mark）
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function highlightText(text: string, query: string): string {
  const q = query.trim()
  const src = escapeHtml(text)
  if (!q) return src
  const re = new RegExp(escapeRegExp(q), 'ig')
  return src.replace(re, (m) => `<mark class="bg-yellow-200 dark:bg-yellow-600 text-black dark:text-white px-0.5 rounded">${escapeHtml(m)}</mark>`)
}
function renderHighlightedName(name: string): string {
  return highlightText(name, debouncedQuery.value)
}
function matchedAliases(a: { other_names?: string[] }): string[] {
  const q = debouncedQuery.value.trim().toLowerCase()
  if (!q) return []
  return (a.other_names || []).filter(n => n.toLowerCase().includes(q))
}
function renderHighlightedAliases(a: { other_names?: string[] }): string {
  return matchedAliases(a).map(n => highlightText(n, debouncedQuery.value)).join('、 ')
}

// 推荐：基于作品数前列（排除已预选）
const recommendedArtists = computed(() => {
  const all = store.artists.slice().sort((a, b) => (b.post_count || 0) - (a.post_count || 0))
  const filtered = all.filter(a => !isPreselected(a.name))
  return filtered.slice(0, 5)
})

// 预选名单
const preselectedNames = ref<string[]>([])
function isPreselected(name: string) {
  return preselectedNames.value.includes(name)
}

function selectSuggestion(a: Artist) {
  addPreselected(a.name)
  artistQuery.value = ''
  activeIndex.value = -1
  // 保持焦点，便于连续添加
  artistInputRef.value?.focus()
}

function onArtistKeydown(e: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return
  if (e.key === 'Escape') {
    artistQuery.value = ''
    activeIndex.value = -1
    return
  }
  const len = suggestions.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (len === 0) return
    activeIndex.value = (activeIndex.value + 1 + len) % len
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (len === 0) return
    activeIndex.value = (activeIndex.value - 1 + len) % len
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (len === 0) return
    const idx = activeIndex.value >= 0 ? activeIndex.value : 0
    const target = suggestions.value[idx]
    if (target && !isPreselected(target.name)) selectSuggestion(target)
  }
}

function addPreselected(name: string) {
  if (isPreselected(name)) return
  preselectedNames.value.push(name)
}
function removePreselected(idx: number) {
  preselectedNames.value.splice(idx, 1)
}
function clearPreselected() {
  preselectedNames.value = []
}

// 生成逻辑：按模式与数量，随机从库中补足

function sampleRandomArtists(pool: Artist[], count: number, exclude: Set<string>) {
  const available = pool.filter(a => !exclude.has(a.name) && passesPostCountFilter(a))
  const picked: string[] = []
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length)
    const a = available.splice(idx, 1)[0]
    picked.push(a.name)
  }
  return picked
}

// 根据样式包装名称并支持最多5层嵌套
function wrapWithBrackets(name: string, style: BracketStyle, layers: number) {
  let open = '(', close = ')'
  if (style === 'curly') { open = '{'; close = '}' }
  else if (style === 'square') { open = '['; close = ']'}
  let s = name
  for (let i = 0; i < layers; i++) s = `${open}${s}${close}`
  return s
}

function formatOutput(names: string[]) {
  // 纯净模式：仅名字
  if (selectedMode.value === 'pure') {
    return names.join(', ')
  }
  // 标准模式：(名称:权重) 格式；权重为 [min,max] 随机（相等则统一）
  if (selectedMode.value === 'standard') {
    const clamp = (v: number) => Math.max(0, Math.min(2, v || 0))
    let lo = clamp(standardWeightMin.value), hi = clamp(standardWeightMax.value)
    if (lo > hi) [lo, hi] = [hi, lo]
    const pick = () => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10
    return names.map(n => `(${n}:${(lo === hi ? lo : pick()).toFixed(1)})`).join(', ')
  }
  // 创意模式：括号模式 + 嵌套层数（1-5）
  if (selectedMode.value === 'creative') {
    const lv = creativeNestLevels.value
    const pickRandom = () => Math.floor(Math.random() * 5) + 1 // 1-5
    return names.map(n => wrapWithBrackets(n, creativeBracketStyle.value, lv === 0 ? pickRandom() : Math.max(1, Math.min(5, lv || 1)))).join(', ')
  }
  // NAI 模式： 权重::画师名 ::；权重为 [min,max] 随机（相等则统一）
  const clamp = (v: number) => Math.max(0, Math.min(2, v || 0))
  let lo = clamp(naiWeightMin.value), hi = clamp(naiWeightMax.value)
  if (lo > hi) [lo, hi] = [hi, lo]
  const pick = () => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10
  const weights = names.map(() => (lo === hi ? lo : pick()))
  return names.map((n, i) => `${Number(weights[i]).toFixed(1)}::${n} ::`).join(', ')
}

function generate() {
  // 生成时按需加载 artists（若空则尝试加载）
  if (!store.artists.length && !store.isLoading) {
    // 注意：这里不await以保持按钮响应；store内部有并发去重
    store.loadArtists()
  }
  const pool = store.artists.length ? store.artists : [
    { name: 'test_artist_1', other_names: ['test1'], post_count: 100 },
    { name: 'test_artist_2', other_names: ['test2'], post_count: 200 },
    { name: 'test_artist_3', other_names: ['test3'], post_count: 300 },
  ]
  const target = Math.max(1, Math.min(20, artistCount.value))
  const baseNames = preselectedNames.value.slice(0, target)
  const exclude = new Set<string>(baseNames)
  const need = target - baseNames.length
  const randoms = need > 0 ? sampleRandomArtists(pool, need, exclude) : []
  const allNames = [...baseNames, ...randoms]
  finalResult.value = formatOutput(allNames)
  // 成功提示
  try { useGeneratorStore().addToast('success', '生成成功', '已生成画师串，可复制使用', 2000) } catch {}
}

function copyOutput() {
  if (!finalResult.value) return
  navigator.clipboard?.writeText(finalResult.value)
  try { useGeneratorStore().addToast('success', '已复制', '画师串已复制到剪贴板', 1800) } catch {}
}

// localStorage 持久化
const LS_KEY = 'artist_string_generator_v1'

function saveState() {
  const payload = {
    mode: selectedMode.value,
    format: outputFormat.value,
    count: artistCount.value,
    postFilterMode: postCountFilterMode.value,
    postFilterThreshold: postCountThreshold.value,
    creativeBracketStyle: creativeBracketStyle.value,
    creativeNestLevels: creativeNestLevels.value,
    standardWeightMin: standardWeightMin.value,
    standardWeightMax: standardWeightMax.value,
    naiWeightMin: naiWeightMin.value,
    naiWeightMax: naiWeightMax.value,
    preselected: preselectedNames.value,
    final: finalResult.value,
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(payload)) } catch {}
}

function restoreState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    if (s.mode) selectedMode.value = s.mode
    if (s.format) outputFormat.value = s.format
    if (typeof s.count === 'number') artistCount.value = s.count
    if (s.postFilterMode) postCountFilterMode.value = s.postFilterMode
    if (typeof s.postFilterThreshold === 'number') postCountThreshold.value = s.postFilterThreshold
    if (s.creativeBracketStyle) creativeBracketStyle.value = s.creativeBracketStyle
    if (typeof s.creativeNestLevels === 'number') creativeNestLevels.value = s.creativeNestLevels
    if (typeof s.standardWeightMin === 'number') standardWeightMin.value = s.standardWeightMin
    if (typeof s.standardWeightMax === 'number') standardWeightMax.value = s.standardWeightMax
    if (typeof s.naiWeightMin === 'number') naiWeightMin.value = s.naiWeightMin
    if (typeof s.naiWeightMax === 'number') naiWeightMax.value = s.naiWeightMax
    if (Array.isArray(s.preselected)) preselectedNames.value = s.preselected
    if (typeof s.final === 'string') finalResult.value = s.final
  } catch {}
}

restoreState()

watch([
  selectedMode,
  outputFormat,
  artistCount,
  postCountFilterMode,
  postCountThreshold,
  creativeBracketStyle,
  creativeNestLevels,
  standardWeightMin,
  standardWeightMax,
  naiWeightMin,
  naiWeightMax,
  preselectedNames,
  finalResult
], saveState, { deep: true })

// 旧导出/复制/组合逻辑已移除，保留精简的生成与复制（见上）
</script>

<style scoped>
/* 保持极简，主要靠原子类与轻边框 */
</style>