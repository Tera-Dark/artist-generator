<template>
  <div class="app-shell">
    <!-- 顶部导航（统一组件） -->
    <AppHeader sectionLabel="工作区" />

    <!-- 主体：两步流程 -->
    <main class="section section-spacing fade-in-up">
      <div class="container-responsive">
        <section class="max-w-4xl mx-auto text-center mb-16">
          <h1 class="text-5xl md:text-6xl font-black tracking-tighter uppercase mb-6">画师串生成器</h1>
          <p class="text-xl text-neutral-500 max-w-2xl mx-auto">选择模式，设定数量，一键生成。支持多种权重格式与组合方式。</p>
        </section>

        <!-- 快速输出（置顶可见） -->
        <section class="mb-20 fade-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold uppercase tracking-wide">输出结果</h2>
            <div class="text-sm text-neutral-500">预览结果将显示在这里</div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-2 card p-8 md:sticky md:top-28">
              <div class="text-base text-muted mb-4 uppercase tracking-wide font-bold">最终输出</div>
              <div class="font-mono text-lg bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] min-h-[120px]" aria-live="polite">{{ finalResult || '等待生成...' }}</div>
            </div>
            <div class="md:col-span-1 card p-8 md:sticky md:top-28 h-fit">
              <div class="grid grid-cols-1 gap-6">
                <button
                  id="generate-btn-top"
                  class="btn btn-primary w-full text-xl py-6"
                  @click="generate"
                  :disabled="store.isLoading"
                  :aria-busy="store.isLoading"
                >
                  <span>生成</span>
                  <span v-if="store.isLoading" class="ml-2 text-base animate-pulse">加载中…</span>
                </button>
                <button id="copy-btn-top" class="btn btn-secondary w-full text-lg py-4" @click="copyOutput">复制结果</button>
              </div>
            </div>
          </div>
        </section>

        <!-- 步骤 1：选择模式、数量与格式（随机从库） -->
        <section class="mb-20">
          <h2 class="text-xl font-black tracking-wide text-neutral-900 dark:text-neutral-100 mb-8 border-b-4 border-primary-500 inline-block pb-2">步骤 1：模式、数量与格式</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button :class="['card p-8 transition-all text-left group', selectedMode==='pure' ? 'ring-4 ring-primary-500 bg-neutral-50 shadow-lg dark:bg-neutral-800' : 'hover:-translate-y-1']" @click="selectedMode='pure'">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <span v-if="selectedMode==='pure'" class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></span>
                  <span v-else class="w-4 h-4 border-2 border-neutral-300"></span>
                </div>
                <div>
                  <div class="text-xl font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">纯净模式</div>
                  <div class="text-base text-muted mt-2">只输出画师名，无任何权重符号。</div>
                </div>
              </div>
            </button>
            <button :class="['card p-8 transition-all text-left group', selectedMode==='standard' ? 'ring-4 ring-primary-500 bg-neutral-50 shadow-lg dark:bg-neutral-800' : 'hover:-translate-y-1']" @click="selectedMode='standard'">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                   <span v-if="selectedMode==='standard'" class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></span>
                   <span v-else class="w-4 h-4 border-2 border-neutral-300"></span>
                </div>
                <div>
                  <div class="text-xl font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">标准模式</div>
                  <div class="text-base text-muted mt-2">使用 (name:weight) 格式，权重均衡。</div>
                </div>
              </div>
            </button>
            <button :class="['card p-8 transition-all text-left group', selectedMode==='creative' ? 'ring-4 ring-primary-500 bg-neutral-50 shadow-lg dark:bg-neutral-800' : 'hover:-translate-y-1']" @click="selectedMode='creative'">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                   <span v-if="selectedMode==='creative'" class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></span>
                   <span v-else class="w-4 h-4 border-2 border-neutral-300"></span>
                </div>
                <div>
                  <div class="text-xl font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">括号模式</div>
                  <div class="text-base text-muted mt-2" v-pre>使用 {{{name}}} 叠加权重，增强表现。</div>
                </div>
              </div>
            </button>

            <button :class="['card p-8 transition-all text-left group', selectedMode==='nai' ? 'ring-4 ring-primary-500 bg-neutral-50 shadow-lg dark:bg-neutral-800' : 'hover:-translate-y-1']" @click="selectedMode='nai'">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                   <span v-if="selectedMode==='nai'" class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></span>
                   <span v-else class="w-4 h-4 border-2 border-neutral-300"></span>
                </div>
                <div>
                  <div class="text-xl font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">NAI 模式</div>
                  <div class="text-base text-muted mt-2">NovelAI 专用格式，大括号权重。</div>
                </div>
              </div>
            </button>
          </div>

          <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="card p-8">
              <label class="block text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">艺术家数量</label>
              <div class="flex items-center gap-6 justify-center py-4">
                <button @click="decrementCount" class="btn btn-secondary w-16 h-16 !p-0 flex items-center justify-center text-3xl" aria-label="减少">−</button>
                <div class="text-6xl font-black w-24 text-center tabular-nums" aria-live="polite">{{ artistCount }}</div>
                <button @click="incrementCount" class="btn btn-secondary w-16 h-16 !p-0 flex items-center justify-center text-3xl" aria-label="增加">+</button>
              </div>
              <div class="mt-4 text-sm text-muted text-center">生成数量：1 - 20</div>
            </div>
            <div class="card p-8">
               <label class="block text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">随机来源策略</label>
               <div class="p-4 bg-neutral-100 dark:bg-neutral-800 border-l-4 border-neutral-500">
                 <div class="text-base">从全库随机补足</div>
                 <div class="text-sm text-muted mt-1">优先排除已选，保证不重复</div>
               </div>
            </div>
          </div>

          <!-- 可选功能块：自定义格式包装 -->
          <div class="mt-8 card p-8 border-l-4 border-neutral-500">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <input type="checkbox" id="enable-custom-fmt" v-model="enableCustomFormat" class="w-5 h-5 accent-primary-500 cursor-pointer" />
                <label for="enable-custom-fmt" class="text-lg font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer select-none">启用自定义格式包装</label>
              </div>
              <div class="text-sm text-muted">适配所有模式结果</div>
            </div>

            <div v-if="enableCustomFormat" class="fade-in">
               <div class="flex flex-col md:flex-row gap-4">
                  <input v-model="customFormatString" type="text" class="input-field flex-1 font-mono" placeholder="例: (draw by {name}:1.2)" />
                  <div class="flex gap-2">
                     <button @click="customFormatString='by {name}'" class="btn btn-secondary text-xs px-2 whitespace-nowrap">by {name}</button>
                     <button @click="customFormatString='artist:{name}'" class="btn btn-secondary text-xs px-2 whitespace-nowrap">artist:{name}</button>
                  </div>
               </div>
               <div class="mt-2 text-xs text-muted">使用 <span class="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{name}</span> 代表当前模式生成的画师串（可能是纯名、权重或嵌套结果）。</div>
            </div>
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
        <h2 class="text-xl font-black tracking-wide text-neutral-900 dark:text-neutral-100 mb-8 border-b-4 border-primary-500 inline-block pb-2">步骤 2：预选艺术家（可选）</h2>

        <div ref="artistDropdownRef" class="relative max-w-3xl">
          <label class="block text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">搜索并添加艺术家</label>

          <!-- 多选输入框容器 (Neo-Brutalist Style) -->
          <div
            class="min-h-[72px] p-3 flex flex-wrap items-center gap-3 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all"
            :class="[dropdownOpen ? 'translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]' : 'hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]']"
            @click="focusInput"
          >
            <!-- 已选标签 (Chips: Hard Borders) -->
            <transition-group name="list" appear>
              <span
                v-for="(n, i) in preselectedNames"
                :key="n"
                class="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500 text-neutral-900 text-sm font-bold border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-90 duration-200"
              >
                <span>{{ n }}</span>
                <button
                  class="p-0.5 hover:bg-neutral-900 hover:text-white transition-colors border border-transparent hover:border-white/20 rounded-sm"
                  @click.stop="removePreselected(i)"
                  tabindex="-1"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            </transition-group>

            <!-- 输入框 -->
            <input
              ref="artistInputRef"
              v-model="artistQuery"
              type="text"
              class="flex-1 min-w-[150px] bg-transparent border-none outline-none text-lg font-medium text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-500 h-10 px-2"
              placeholder="输入名字查找..."
              @keydown="onArtistKeydown"
              @focus="dropdownOpen = true"
              @blur="onInputBlur"
              aria-autocomplete="list"
              aria-controls="artist-suggestion-list"
              :aria-expanded="suggestions.length > 0"
            />

            <!-- 图标区 -->
            <div class="flex items-center gap-3 pr-1 border-l-2 border-neutral-200 dark:border-neutral-800 pl-3 ml-2">
              <div v-if="store.isLoading" class="animate-spin text-neutral-900 dark:text-neutral-100">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              </div>
              <button
                v-if="preselectedNames.length > 0"
                @click.stop="clearPreselected"
                class="group flex items-center justify-center p-2 hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-neutral-900 transition-all rounded-md"
                title="清空"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>

          <!-- 下拉菜单 (Hard Borders & Shadows) -->
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-y-95 opacity-0"
            enter-to-class="transform scale-y-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-y-100 opacity-100"
            leave-to-class="transform scale-y-95 opacity-0"
          >
            <div v-if="suggestions.length && dropdownOpen" class="absolute left-0 right-0 top-full mt-4 z-50">
              <ul
                id="artist-suggestion-list"
                role="listbox"
                class="border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-h-[400px] overflow-y-auto"
              >
                <li
                  v-for="(s, i) in suggestions"
                  :key="s.name + '-' + i"
                  role="option"
                  :aria-selected="i === activeIndex"
                  @mouseenter="activeIndex = i"
                  @click.stop="!isPreselected(s.name) && selectSuggestion(s)"
                  class="group px-5 py-4 border-b-2 border-neutral-100 dark:border-neutral-800 last:border-0 cursor-pointer flex items-center justify-between transition-colors"
                  :class="[
                    i === activeIndex ? 'bg-primary-50 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900',
                    isPreselected(s.name) ? 'opacity-50 grayscale cursor-not-allowed' : ''
                  ]"
                >
                  <div class="flex-1 min-w-0 pr-4">
                    <div class="flex items-center gap-3">
                       <div class="font-black text-lg text-neutral-900 dark:text-neutral-100 truncate" v-html="renderHighlightedName(s.name)"></div>
                       <span v-if="isPreselected(s.name)" class="text-xs font-bold px-2 py-0.5 border-2 border-neutral-900 bg-neutral-200 text-neutral-900">ADDED</span>
                    </div>
                    <div v-if="matchedAliases(s).length" class="mt-1 text-sm text-neutral-600 dark:text-neutral-400 truncate font-mono">
                      ↳ <span v-html="renderHighlightedAliases(s)"></span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                     <span class="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">WORKS</span>
                     <span class="inline-block px-2 py-0.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-sm font-bold font-mono">{{ s.post_count || 0 }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </transition>
        </div>

        <!-- 推荐面板 (Bold Buttons) -->
        <div class="mt-8">
          <div class="flex items-center justify-between mb-4">
             <div class="text-sm font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">热门推荐</div>
             <button
               @click="refreshRecommendations"
               class="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-primary-600"
               title="换一批"
             >
               <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
          </div>
          <div class="flex flex-wrap gap-4">
            <button
              v-for="(r,i) in recommendedArtists"
              :key="r.name + '-' + i"
              class="group relative px-5 py-2.5 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:bg-primary-500 transition-all active:translate-y-0 active:shadow-none"
              @click="addPreselected(r.name)"
            >
              <span class="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-900">{{ r.name }}</span>
              <span class="absolute -top-3 -right-3 px-1.5 py-0.5 bg-neutral-900 text-white text-[10px] font-mono border border-white">{{ r.post_count }}</span>
            </button>
          </div>
        </div>
      </section>

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
</script>

<style scoped>
/* 保持极简，主要靠原子类与轻边框 */
</style>
