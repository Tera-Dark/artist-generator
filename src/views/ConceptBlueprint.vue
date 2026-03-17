<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader sectionLabel="工作区" />

    <!-- 主体：两步流程 -->
    <main class="section py-6 fade-in-up">
      <div class="page-stack">
        <section class="hero-panel hero-panel-accent">
          <div class="hero-layout lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div class="hero-eyebrow">Workspace</div>
              <h1 class="hero-title">工作区</h1>
              <p class="hero-body">把生成配置、预选画师、格式工具和结果输出收在同一条工作流里，专注快速试错与产出。</p>
            </div>
            <div class="metric-grid">
              <div class="metric-tile">
                <div class="metric-label">生成模式</div>
                <div class="metric-value text-xl">{{ selectedMode }}</div>
              </div>
              <div class="metric-tile">
                <div class="metric-label">预选数量</div>
                <div class="metric-value text-xl">{{ preselectedNames.length }}</div>
              </div>
              <div class="metric-tile">
                <div class="metric-label">画师库</div>
                <div class="metric-value text-xl">{{ store.artists.length ? '已就绪' : '加载中' }}</div>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 页面网格：左控制面，右结果固定 -->
        <div class="workspace-grid">
          
          <!-- 左侧：总控台 -->
          <div class="workspace-main">

            <!-- 核心配置区 -->
            <section class="section-shell-tight">
              <div class="section-heading">
                <h2 class="section-heading-title">核心配置</h2>
              </div>
              
              <!-- 模式选择 (Compact Tabs) -->
              <div class="mb-4">
                <label class="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">生成模式</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="mode in [{id:'pure', label:'纯净模式'}, {id:'standard', label:'标准模式'}, {id:'creative', label:'括号模式'}, {id:'nai', label:'NAI模式'}]" 
                    :key="mode.id" 
                    @click="selectedMode = mode.id as import('@/composables/useGeneratorLogic').GeneratorMode"
                    :class="['px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all duration-200', selectedMode === mode.id ? 'bg-primary-500 border-primary-500 text-white shadow-soft' : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600']"
                  >
                    {{ mode.label }}
                  </button>
                </div>
              </div>

              <!-- 数量与快速过滤 (Compact Row) -->
              <div class="mini-toolbar">
                <div class="flex items-center gap-3">
                  <label class="text-xs font-bold text-neutral-500 uppercase">生成数量</label>
                  <div class="flex items-center">
                    <button @click="decrementCount" class="w-6 h-6 flex items-center justify-center bg-white border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white pb-0.5 text-lg leading-none select-none font-bold" aria-label="减少">−</button>
                    <input type="number" v-model.number="artistCount" min="1" max="20" class="w-12 h-6 text-center text-sm font-bold border-y border-x-0 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-0" />
                    <button @click="incrementCount" class="w-6 h-6 flex items-center justify-center bg-white border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white pb-0.5 text-lg leading-none select-none font-bold" aria-label="增加">+</button>
                  </div>
                </div>

                <div class="w-px h-6 bg-neutral-300 dark:bg-neutral-700"></div>

                <div class="flex items-center gap-3 flex-1">
                  <label class="text-xs font-bold text-neutral-500 uppercase whitespace-nowrap">作品数过滤</label>
                  <select v-model="postCountFilterMode" class="input-field py-1 px-2 h-7 text-xs flex-shrink-0 w-20">
                    <option value="none">不限</option>
                    <option value="gt">大于</option>
                    <option value="lt">小于</option>
                  </select>
                  <input v-if="postCountFilterMode !== 'none'" v-model.number="postCountThreshold" type="number" min="0" class="input-field py-1 px-2 h-7 text-xs w-20" placeholder="阈值" />
                </div>
              </div>

              <!-- 模式配置 (Conditional, Compact) -->
              <div class="mt-4 border-l-2 border-primary-500 pl-3">
                <div v-if="selectedMode === 'pure'" class="text-xs text-neutral-500">此模式只输出画师名，无任何权重符号。</div>
                <div v-if="selectedMode === 'creative'" class="flex items-center gap-6">
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-bold text-neutral-600 dark:text-neutral-400">括号</label>
                    <select v-model="creativeBracketStyle" class="input-field py-1 px-2 h-7 text-xs">
                      <option value="paren">圆() ×1.1</option>
                      <option value="curly">花{} ×1.05</option>
                      <option value="square">方[] ×0.9</option>
                    </select>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-bold text-neutral-600 dark:text-neutral-400">随机叠加(0-5)</label>
                    <input v-model.number="creativeNestLevels" type="number" min="0" max="5" class="input-field py-1 px-2 h-7 text-xs w-16" />
                  </div>
                </div>
                <div v-if="selectedMode === 'standard'" class="flex items-center gap-4">
                  <label class="text-xs font-bold text-neutral-600 dark:text-neutral-400">随机权重</label>
                  <input v-model.number="standardWeightMin" type="number" min="0" max="2" step="0.1" class="input-field py-1 px-2 h-7 text-xs w-16 text-center" />
                  <span class="text-neutral-400">-</span>
                  <input v-model.number="standardWeightMax" type="number" min="0" max="2" step="0.1" class="input-field py-1 px-2 h-7 text-xs w-16 text-center" />
                </div>
                <div v-if="selectedMode === 'nai'" class="flex items-center gap-4">
                  <label class="text-xs font-bold text-neutral-600 dark:text-neutral-400">NAI随机权重</label>
                  <input v-model.number="naiWeightMin" type="number" min="0" max="2" step="0.1" class="input-field py-1 px-2 h-7 text-xs w-16 text-center" />
                  <span class="text-neutral-400">-</span>
                  <input v-model.number="naiWeightMax" type="number" min="0" max="2" step="0.1" class="input-field py-1 px-2 h-7 text-xs w-16 text-center" />
                </div>
              </div>

              <!-- 自定义格式包装 -->
              <div class="mt-4 flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" v-model="enableCustomFormat" class="w-4 h-4 accent-primary-500" />
                  <span class="text-xs font-bold text-neutral-900 dark:text-neutral-100">格式包装</span>
                </label>
                <div v-if="enableCustomFormat" class="flex-1 flex gap-2 fade-in">
                  <input v-model="customFormatString" type="text" class="input-field flex-1 h-7 py-1 px-2 text-xs font-mono" placeholder="by {name}" />
                  <button @click="customFormatString='by {name}'" class="btn btn-secondary py-1 px-2 h-7 text-xs">by</button>
                  <button @click="customFormatString='artist:{name}'" class="btn btn-secondary py-1 px-2 h-7 text-xs">artist:</button>
                </div>
              </div>
            </section>

            <!-- 实用工具 (Compact Row) -->
            <section class="section-shell-tight">
              <div class="section-heading">
                 <h2 class="section-heading-title">格式工具</h2>
                 <div class="flex items-center gap-2">
                   <select v-model="formatToolMode" class="input-field py-1 px-2 h-7 text-xs flex-shrink-0 w-24 bg-white/50 dark:bg-neutral-900/50">
                     <option value="anima">Anima格式</option>
                     <option value="custom">?????</option>
                   </select>
                   <input v-if="formatToolMode === 'custom'" v-model="customFormatToolString" type="text" class="input-field py-1 px-2 h-7 text-xs w-32 font-mono" placeholder="模板: {tag}" />
                 </div>
              </div>
              <div class="text-[10px] text-neutral-400 mb-3 -mt-2">
                <span v-if="formatToolMode === 'anima'">Anima????? `@artist \(tag\),` ?????????????????</span>
                <span v-else>???????? {tag} ????????????????</span>
              </div>
              <div class="flex items-stretch gap-4 h-24">
                <textarea v-model="rawPromptInput" class="input-field flex-1 h-full p-2 text-xs font-mono resize-none leading-relaxed" placeholder="粘贴凌乱画师串如: a, b, c"></textarea>
                <div class="flex flex-col gap-2 w-20 flex-shrink-0">
                   <button @click="processPrompt" class="btn btn-primary flex-1 text-xs py-1 px-0 shadow-none">处理</button>
                   <button @click="rawPromptInput = ''; processedPromptOutput = ''" class="btn btn-secondary flex-1 text-xs py-1 px-0">清空</button>
                </div>
                <div class="flex-1 relative">
                  <textarea v-model="processedPromptOutput" readonly class="input-field w-full h-full p-2 text-xs font-mono resize-none leading-relaxed bg-neutral-50 dark:bg-neutral-950 focus:ring-0 cursor-copy" placeholder="结果..."></textarea>
                  <button v-if="processedPromptOutput" @click="copyProcessedPrompt" class="absolute top-1 right-1 p-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded shadow-sm text-neutral-600 dark:text-neutral-300 transition-colors" title="复制">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                  </button>
                </div>
              </div>
            </section>

            <!-- 定制预选区 -->
            <section class="section-shell-tight relative overflow-visible z-20">
              <div class="section-heading">
                 <h2 class="section-heading-title">搜索与预选</h2>
                 <span class="text-[10px] text-neutral-400">将包含在每次生成中</span>
              </div>
              
              <div ref="artistDropdownRef" class="relative">
                <!-- 输入与标签框 -->
                <div class="min-h-[40px] p-2 flex flex-wrap items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-soft hover:shadow-soft-lg transition-shadow cursor-text" @click="focusInput">
                  
                  <transition-group name="list" appear>
                    <span v-for="(n, i) in preselectedNames" :key="n" class="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md text-xs font-semibold">
                      <span>{{ n }}</span>
                      <button class="p-0.5 rounded-sm hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors" @click.stop="removePreselected(i)" tabindex="-1"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </span>
                  </transition-group>

                  <input ref="artistInputRef" v-model="artistQuery" type="text" class="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 px-1" placeholder="查找画师..." @keydown="onArtistKeydown" @focus="dropdownOpen = true" @blur="onInputBlur" />
                  
                  <button v-if="preselectedNames.length > 0" @click.stop="clearPreselected" class="p-1 hover:text-red-500" title="清空"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>

                <!-- 联想菜单 -->
                <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-y-95 opacity-0" enter-to-class="transform scale-y-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-y-100 opacity-100" leave-to-class="transform scale-y-95 opacity-0">
                  <ul v-if="suggestions.length && dropdownOpen" class="absolute left-0 right-0 top-full mt-2 z-[80] border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white/95 backdrop-blur-md dark:bg-neutral-900/95 shadow-soft-lg max-h-[250px] overflow-y-auto">
                    <li v-for="(s, i) in suggestions" :key="s.name" @mouseenter="activeIndex = i" @click.stop="!isPreselected(s.name) && selectSuggestion(s)" class="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 cursor-pointer flex justify-between items-center text-sm transition-colors" :class="[i === activeIndex ? 'bg-primary-50 dark:bg-neutral-800' : '', isPreselected(s.name) ? 'opacity-50 grayscale' : '']">
                      <div class="truncate">
                        <span class="font-bold" v-html="renderHighlightedName(s.name)"></span>
                        <span v-if="matchedAliases(s).length" class="ml-2 text-[10px] text-neutral-500" v-html="renderHighlightedAliases(s)"></span>
                      </div>
                      <span class="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-1">{{ s.post_count }}</span>
                    </li>
                  </ul>
                </transition>
              </div>
            </section>

          </div>

          <!-- 右侧：固定操作台 -->
          <div class="workspace-side">
            
            <button @click="generate" :disabled="isGenerating || store.isArtistsLoading" class="btn btn-primary w-full h-16 text-lg tracking-widest font-black active:scale-95 transition-all group overflow-hidden relative shadow-soft-lg hover:shadow-xl dark:shadow-soft-dark dark:hover:shadow-soft-dark-lg disabled:cursor-not-allowed disabled:opacity-70">
              <span class="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></span>
              <span v-if="!isGenerating && !store.isArtistsLoading" class="relative z-10">一键生成</span>
              <span v-else class="relative z-10 flex items-center justify-center gap-2"><svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{{ store.isArtistsLoading ? '加载画师库...' : '处理中...' }}</span>
            </button>

            <div class="card p-0 flex flex-col flex-1 min-h-[300px] border border-neutral-200 dark:border-neutral-800 shadow-soft-lg overflow-hidden">
              <div class="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-3 font-semibold flex justify-between items-center text-sm">
                 <span>输出结果</span>
                 <button @click="copyOutput" class="text-xs font-bold hover:underline flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> 复制</button>
              </div>
              <textarea v-model="finalResult" readonly class="flex-1 w-full bg-white dark:bg-neutral-950 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-0 leading-relaxed" placeholder="等待生成..."></textarea>
            </div>

            <!-- 热词面板 (Ultra Compact Slider/Chips) -->
            <div class="panel-card p-4">
               <div class="flex items-center justify-between mb-3 text-xs font-bold text-neutral-500">
                  <span>快速随选推荐</span>
                  <button @click="refreshRecommendations" class="hover:text-primary-600"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
               </div>
               <div class="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                 <button v-for="r in recommendedArtists" :key="r.name" @click="addPreselected(r.name)" class="px-2 py-0.5 border border-neutral-300 dark:border-neutral-700 text-[10px] bg-white dark:bg-neutral-900 hover:border-primary-500 hover:text-primary-600 hover:-translate-y-px transition-all rounded-sm flex items-center gap-1">
                    {{ r.name }}<span class="opacity-50 inline-block scale-90">{{r.post_count}}</span>
                 </button>
               </div>
            </div>

          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useGeneratorStore } from '@/stores/generator'
import { useGeneratorLogic, type Artist } from '@/composables/useGeneratorLogic'

const {
  selectedMode,
  enableCustomFormat,
  artistCount,
  finalResult,
  isGenerating,
  postCountFilterMode,
  postCountThreshold,
  creativeBracketStyle,
  creativeNestLevels,
  standardWeightMin,
  standardWeightMax,
  naiWeightMin,
  naiWeightMax,
  customFormatString,
  preselectedNames,
  generate,
  copyOutput,
  incrementCount,
  decrementCount,
  isPreselected,
  addPreselected,
  removePreselected,
  clearPreselected,
  passesPostCountFilter
} = useGeneratorLogic()

const store = useGeneratorStore()

// --- UI / Dropdown Logic (View Specific) ---

const artistQuery = ref('')
const artistInputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(-1)
const dropdownOpen = ref(false)
const artistDropdownRef = ref<HTMLElement | null>(null)
const debouncedQuery = ref('')
let debounceTimer: number | undefined

// 文档外部点击关闭下拉（需在 setup 同步注册卸载钩子）
const onDocClick = (e: MouseEvent) => {
  if (!artistDropdownRef.value) return
  if (!artistDropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(async () => {
  if (!store.artists.length) {
    await store.loadArtists({ silent: true })
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
  if (val.trim() && !store.artists.length && !store.isArtistsLoading) {
    await store.loadArtists({ silent: true })
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
  const src = escapeHtml(text)
  const tokens = query.trim().split(/\s+/).filter(t => t.length > 0)
  if (!tokens.length) return src

  // Construct regex for all tokens: (token1|token2|...)
  const pattern = tokens.map(escapeRegExp).join('|')
  const re = new RegExp(`(${pattern})`, 'ig')

  return src.replace(re, (m) => `<mark class="bg-primary-500 text-white px-0.5 rounded-sm">${escapeHtml(m)}</mark>`)
}
function renderHighlightedName(name: string): string {
  return highlightText(name, debouncedQuery.value)
}
function matchedAliases(a: { other_names?: string[] }): string[] {
  const q = debouncedQuery.value.trim().toLowerCase()
  if (!q) return []
  const tokens = q.split(/\s+/).filter(t => t.length > 0)

  return (a.other_names || []).filter(n => {
    const lower = n.toLowerCase()
    // Show alias if it matches ANY token (or maybe stricter? let's show if it contributes to the match)
    // Actually, for "matched aliases" display, we usually want to show aliases that matched the query.
    // If the main name didn't match some tokens, the alias MUST match them.
    // For simplicity, we just show aliases that contain at least one of the tokens.
    return tokens.some(t => lower.includes(t))
  })
}
function renderHighlightedAliases(a: { other_names?: string[] }): string {
  return matchedAliases(a).map(n => highlightText(n, debouncedQuery.value)).join('、 ')
}

// 推荐：随机选择 post_count > 100 的画师
const recommendedArtists = ref<Artist[]>([])

function refreshRecommendations() {
  const pool = store.artists.filter(a => (a.post_count || 0) > 100 && !isPreselected(a.name))
  // Fisher-Yates shuffle or simple random pick
  const result: Artist[] = []
  const tempPool = [...pool]

  for (let i = 0; i < 8 && tempPool.length > 0; i++) {
    const idx = Math.floor(Math.random() * tempPool.length)
    result.push(tempPool[idx])
    tempPool.splice(idx, 1)
  }
  recommendedArtists.value = result
}

// 初始加载或 artists 变化时刷新
watch(() => store.artists, () => {
  if (store.artists.length && recommendedArtists.value.length === 0) {
    refreshRecommendations()
  }
}, { immediate: true })

function selectSuggestion(a: Artist) {
  addPreselected(a.name)
  artistQuery.value = ''
  activeIndex.value = -1
  // 保持焦点，便于连续添加
  artistInputRef.value?.focus()
}

function focusInput() {
  artistInputRef.value?.focus()
}

function onInputBlur() {
  // 简短延迟以允许点击下拉项
  setTimeout(() => {
    dropdownOpen.value = false
  }, 200)
}

function onArtistKeydown(e: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Backspace'].includes(e.key)) return

  // 处理退格删除标签
  if (e.key === 'Backspace' && artistQuery.value === '') {
    if (preselectedNames.value.length > 0) {
      removePreselected(preselectedNames.value.length - 1)
    }
    return
  }

  if (e.key === 'Escape') {
    artistQuery.value = ''
    activeIndex.value = -1
    dropdownOpen.value = false
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
    if (len === 0) {
        // 如果没有下拉项，且输入不为空，尝试直接作为新名字添加（可选功能，此处暂不开启，保持严格选择）
        return
    }
    const idx = activeIndex.value >= 0 ? activeIndex.value : 0
    const target = suggestions.value[idx]
    if (target && !isPreselected(target.name)) selectSuggestion(target)
  }
}

// --- 实用工具：画师串处理 Logic ---
const rawPromptInput = ref('')
const processedPromptOutput = ref('')
const formatToolMode = ref<'anima' | 'custom'>('anima')
const customFormatToolString = ref('@{tag},')

function normalizeAnimaTag(tag: string) {
  return tag
    .trim()
    .replace(/^@+/, '')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function processPrompt() {
  if (!rawPromptInput.value.trim()) {
    processedPromptOutput.value = ''
    return
  }
  const parts = rawPromptInput.value.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean)


  if (formatToolMode.value === 'anima') {
    const result = parts.map(tag => `@${normalizeAnimaTag(tag)}`)
    processedPromptOutput.value = result.join(', ') + ','
  } else {
    const template = customFormatToolString.value || '{tag}'
    const result = parts.map(tag => template.replace(/\{tag\}/g, tag))
    processedPromptOutput.value = result.join(' ')
  }
}

function copyProcessedPrompt() {
  if (!processedPromptOutput.value) return
  if (navigator.clipboard) {
    navigator.clipboard.writeText(processedPromptOutput.value)
      .then(() => store.addToast('success', '已复制', '处理后的画师串已复制到剪贴板', 1800))
      .catch(() => store.addToast('error', '复制失败', '请手动复制文本内容'))
  }
}
</script>

<style scoped>
/* 自定义细滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
:deep(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
