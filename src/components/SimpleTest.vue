<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <div class="top-nav">
      <button @click="showArtistLibrary = true" class="nav-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M3 7H21L20 19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19L3 7Z"
            stroke="currentColor"
            stroke-width="2"
          />
          <path d="M10 11V17" stroke="currentColor" stroke-width="2" />
          <path d="M14 11V17" stroke="currentColor" stroke-width="2" />
        </svg>
        <span>画师库</span>
      </button>
      <button @click="showHistory = true" class="nav-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 8V12L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path
            d="M3.05 11A9 9 0 1 1 3.05 13"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path d="M3 4V9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>历史</span>
      </button>
    </div>

    <!-- 主标题 -->
    <div class="header-section">
      <div class="title-row">
        <div class="app-icon">🎨</div>
        <h1 class="app-title">画师串生成器</h1>
      </div>
      <p class="app-subtitle">AI绘画用创意画师风格组合工具</p>
    </div>

    <!-- 参数控制卡片 -->
    <div class="control-card">
      <div class="card-header">
        <div class="header-icon">⚙️</div>
        <div class="header-content">
          <h2 class="card-title">生成参数</h2>
          <p class="card-subtitle">自定义你的画师组合</p>
        </div>
      </div>

      <div class="controls-grid">
        <!-- 画师数量控制 -->
        <div class="control-section">
          <div class="control-header">
            <span class="control-label">画师数量</span>
            <div class="control-badge">{{ artistCount }}个</div>
          </div>
          <div class="number-control">
            <button @click="artistCount = Math.max(1, artistCount - 1)" class="number-btn">
              -
            </button>
            <input
              v-model.number="artistCount"
              type="number"
              min="1"
              max="20"
              class="number-input"
            />
            <button @click="artistCount = Math.min(20, artistCount + 1)" class="number-btn">
              +
            </button>
          </div>
        </div>

        <!-- 输出模式控制 -->
        <div class="mode-controls">
          <div class="mode-option" @click="togglePureMode" :class="{ active: pureMode }">
            <div class="mode-icon">🔍</div>
            <div class="mode-info">
              <div class="mode-name">纯净模式</div>
              <div class="mode-desc">仅输出画师名</div>
            </div>
            <div class="mode-checkbox" :class="{ checked: pureMode }">
              <span v-if="pureMode">✓</span>
            </div>
          </div>

          <div class="mode-option" @click="toggleBracketMode" :class="{ active: bracketMode }">
            <div class="mode-icon">📦</div>
            <div class="mode-info">
              <div class="mode-name">括号模式</div>
              <div class="mode-desc">随机括号层数</div>
            </div>
            <div class="mode-checkbox" :class="{ checked: bracketMode }">
              <span v-if="bracketMode">✓</span>
            </div>
          </div>

          <div class="mode-option" @click="toggleNaiMode" :class="{ active: naiMode }">
            <div class="mode-icon">🤖</div>
            <div class="mode-info">
              <div class="mode-name">NAI模式</div>
              <div class="mode-desc">权重::画师 ::格式</div>
            </div>
            <div class="mode-checkbox" :class="{ checked: naiMode }">
              <span v-if="naiMode">✓</span>
            </div>
          </div>
        </div>

        <!-- 权重范围控制 -->
        <div class="weight-section" v-if="!pureMode && !bracketMode">
          <div class="weight-controls">
            <!-- 最小权重滑块 -->
            <div class="slider-group">
              <div class="slider-header">
                <span class="slider-label">最小权重</span>
                <div class="slider-value">{{ weightMin }}</div>
              </div>
              <div class="slider-container">
                <input
                  v-model.number="weightMin"
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  class="slider"
                  @input="ensureWeightOrder"
                />
                <div class="slider-track"></div>
              </div>
            </div>

            <!-- 最大权重滑块 -->
            <div class="slider-group">
              <div class="slider-header">
                <span class="slider-label">最大权重</span>
                <div class="slider-value">{{ weightMax }}</div>
              </div>
              <div class="slider-container">
                <input
                  v-model.number="weightMax"
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  class="slider"
                  @input="ensureWeightOrder"
                />
                <div class="slider-track"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 作品数阈值控制 -->
      <div class="config-section">
        <div class="post-count-filter">
          <div class="filter-header">
            <span class="filter-title">作品数筛选</span>
            <label class="filter-toggle">
              <input type="checkbox" v-model="enableMinPostCount" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="filter-content" :class="{ disabled: !enableMinPostCount }">
            <div class="filter-input-group">
              <span class="filter-label">仅选择作品数≥</span>
              <input
                type="number"
                v-model.number="minPostCount"
                :disabled="!enableMinPostCount"
                class="post-count-input"
                min="0"
                step="100"
                placeholder="0"
              />
              <span class="filter-unit">的画师</span>
            </div>
            <div class="filter-hint" v-if="enableMinPostCount && minPostCount > 0">
              将过滤掉作品数少于 {{ minPostCount }} 的画师
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主操作按钮 -->
    <div class="action-section">
      <button @click="generate" :disabled="isLoading || artists.length === 0" class="generate-btn">
        <div v-if="isLoading" class="loading-spinner"></div>
        <span>{{ isLoading ? '生成中...' : '生成画师组合' }}</span>
      </button>
    </div>

    <!-- 快速预设 -->
    <div class="preset-section">
      <h3 class="preset-title">快速预设</h3>
      <div class="preset-grid">
        <div
          v-for="preset in presets"
          :key="preset.id"
          @click="applyPreset(preset)"
          class="preset-card"
          :class="{ active: lastUsedPreset === preset.id }"
        >
          <div class="preset-icon">{{ preset.icon }}</div>
          <div class="preset-info">
            <div class="preset-name">{{ preset.name }}</div>
            <div class="preset-desc">{{ preset.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果显示 -->
    <div v-if="result" class="result-section">
      <div class="result-header">
        <h3 class="result-title">生成结果</h3>
        <button @click="copyResult" class="copy-btn" title="复制结果">
          <span class="copy-icon">📋</span>
          <span class="copy-text">复制</span>
        </button>
      </div>
      <div class="result-content" @dblclick="copyResult" title="双击复制结果">{{ result }}</div>
    </div>

    <!-- 画师库组件 -->
    <ArtistLibrary
      :show="showArtistLibrary"
      :artists="paginatedArtists"
      :total-artists="artists.length"
      :filtered-count="filteredArtists.length"
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :show-pagination="showPagination"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :is-loading="isLoadingArtists"
      @close="showArtistLibrary = false"
      @search="handleSearch"
      @sort="handleSort"
      @toggle-pagination="togglePagination"
      @artist-click="openArtistDetail"
      @copy="copyArtistName"
      @update:current-page="currentPage = $event"
    />

    <!-- 画师详情组件 -->
    <ArtistDetail
      :show="showArtistDetail"
      :artist="selectedArtist"
      @close="closeArtistDetail"
      @copy="copyArtistName"
    />

    <!-- 历史记录组件 -->
    <HistoryPanel
      :show="showHistory"
      :history="history"
      :current-page="historyCurrentPage"
      :page-size="historyPageSize"
      @close="showHistory = false"
      @restore="restoreFromHistory"
      @update:current-page="historyCurrentPage = $event"
    />

    <!-- 通知提示组件 -->
    <NotificationToast :notifications="notifications" @remove="removeNotification" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGeneratorStore } from '@/stores/generator'
import type { Artist } from '@/types'
import ArtistLibrary from './artist/ArtistLibrary.vue'
import ArtistDetail from './artist/ArtistDetail.vue'
import HistoryPanel from './history/HistoryPanel.vue'
import NotificationToast from './common/NotificationToast.vue'

// 使用 store
const store = useGeneratorStore()

// 响应式数据
const isLoading = ref(false)
const result = ref('')
const generatedArtists = ref<string[]>([])

// 参数控制
const artistCount = ref(3)
const weightMin = ref(1.0)
const weightMax = ref(1.5)

// 模式控制
const pureMode = ref(false)
const bracketMode = ref(false)
const naiMode = ref(false)
const minPostCount = ref(0)
const enableMinPostCount = ref(false)

// 预设相关
const lastUsedPreset = ref<string | null>(null)

// 界面状态
const showArtistLibrary = ref(false)
const showHistory = ref(false)
const showArtistDetail = ref(false)
const selectedArtist = ref<Artist | null>(null)

// 画师相关
const artists = computed(() => store.artists)
const filteredArtists = ref<Artist[]>([])
const searchQuery = ref('')
const isLoadingArtists = ref(false)
const showPagination = ref(true)

// 排序相关
const sortBy = ref<'name' | 'postCount'>('postCount')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 分页相关
const currentPage = ref(1)
const pageSize = 40
const historyCurrentPage = ref(1)
const historyPageSize = 20

// 历史记录
const history = ref<
  Array<{
    id: string
    result: string
    artists: string[]
    timestamp: Date
    params: {
      count: number
      minWeight: number
      maxWeight: number
      pureMode?: boolean
      bracketMode?: boolean
      naiMode?: boolean
      minPostCount?: number
    }
  }>
>([])

// 通知系统
interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const notifications = ref<ToastNotification[]>([])

// 预设配置
const presets = [
  {
    id: 'random',
    name: '🎲 随机探索',
    icon: '🎲',
    description: '适合尝试新画师',
    config: { countRange: [2, 3], weightRange: [0.8, 1.2], minPostCount: 0 },
  },
  {
    id: 'precise',
    name: '🎯 精准控制',
    icon: '🎯',
    description: '平衡的画师组合',
    config: { countRange: [3, 3], weightRange: [0.8, 1.2], minPostCount: 0 },
  },
  {
    id: 'primary',
    name: '⭐ 主次风格',
    icon: '⭐',
    description: '主要风格+次要风格',
    config: { countRange: [3, 5], weightRange: [0.5, 1.3], minPostCount: 0 },
  },
  {
    id: 'popular',
    name: '🌟 热门画师',
    icon: '🌟',
    description: '高作品数画师组合',
    config: { countRange: [2, 4], weightRange: [0.8, 1.2], minPostCount: 1000 },
  },
  {
    id: 'creative',
    name: '✨ 创意爆发',
    icon: '✨',
    description: '强烈风格混合',
    config: { countRange: [4, 8], weightRange: [0.5, 1.5], minPostCount: 0 },
  },
]

// 计算属性
const totalPages = computed(() => {
  if (!showPagination.value) return 1
  const total = searchQuery.value ? filteredArtists.value.length : artists.value.length
  return Math.ceil(total / pageSize)
})

const sortedArtists = computed(() => {
  const list = searchQuery.value ? filteredArtists.value : artists.value
  return sortArtists(list)
})

const paginatedArtists = computed(() => {
  const list = sortedArtists.value

  if (!showPagination.value) {
    return list
  }

  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return list.slice(start, end)
})

// 方法
const ensureWeightOrder = () => {
  if (weightMin.value > weightMax.value) {
    weightMax.value = weightMin.value
  }
}

const togglePureMode = () => {
  pureMode.value = !pureMode.value
  if (pureMode.value) {
    bracketMode.value = false
    naiMode.value = false
  }
}

const toggleBracketMode = () => {
  bracketMode.value = !bracketMode.value
  if (bracketMode.value) {
    pureMode.value = false
    naiMode.value = false
  }
}

const toggleNaiMode = () => {
  naiMode.value = !naiMode.value
  if (naiMode.value) {
    pureMode.value = false
    bracketMode.value = false
  }
}

const applyPreset = (preset: (typeof presets)[0]) => {
  const config = preset.config
  artistCount.value = Math.floor((config.countRange[0] + config.countRange[1]) / 2)
  weightMin.value = config.weightRange[0]
  weightMax.value = config.weightRange[1]

  // 应用作品数阈值
  if (config.minPostCount && config.minPostCount > 0) {
    enableMinPostCount.value = true
    minPostCount.value = config.minPostCount
  } else {
    enableMinPostCount.value = false
    minPostCount.value = 0
  }

  lastUsedPreset.value = preset.id
}

const generate = () => {
  if (artists.value.length === 0) {
    displayNotification('画师数据未加载，请稍后再试', 'error')
    return
  }

  // 显示生成开始提示
  displayNotification('正在生成画师串...', 'info', 1000)
  
  const count = artistCount.value
  const selectedArtists: string[] = []
  const selectedWeights: number[] = []

  // 根据作品数阈值筛选画师
  let availableArtists = artists.value
  if (enableMinPostCount.value && minPostCount.value > 0) {
    availableArtists = artists.value.filter((artist) => artist.post_count >= minPostCount.value)
    if (availableArtists.length === 0) {
      displayNotification(`没有找到作品数≥${minPostCount.value}的画师`, 'error')
      return
    }
  }

  const usedIndices = new Set<number>()

  for (let i = 0; i < count && usedIndices.size < availableArtists.length; i++) {
    let randomIndex: number
    do {
      randomIndex = Math.floor(Math.random() * availableArtists.length)
    } while (usedIndices.has(randomIndex))

    usedIndices.add(randomIndex)
    selectedArtists.push(availableArtists[randomIndex].name)

    if (!pureMode.value && !bracketMode.value && !naiMode.value) {
      let weight: number
      if (lastUsedPreset.value === 'primary') {
        if (i === 0) {
          weight = parseFloat((Math.random() * 0.3 + 1.0).toFixed(1))
        } else {
          weight = parseFloat((Math.random() * 0.3 + 0.5).toFixed(1))
        }
      } else {
        weight = parseFloat(
          (Math.random() * (weightMax.value - weightMin.value) + weightMin.value).toFixed(1),
        )
      }
      selectedWeights.push(weight)
    } else if (naiMode.value) {
      let weight: number
      if (lastUsedPreset.value === 'primary') {
        if (i === 0) {
          weight = parseFloat((Math.random() * 0.3 + 1.0).toFixed(1))
        } else {
          weight = parseFloat((Math.random() * 0.3 + 0.5).toFixed(1))
        }
      } else {
        weight = parseFloat(
          (Math.random() * (weightMax.value - weightMin.value) + weightMin.value).toFixed(1),
        )
      }
      selectedWeights.push(weight)
    }
  }

  generatedArtists.value = selectedArtists

  // 格式化结果
  result.value = selectedArtists
    .map((artist, index) => {
      if (pureMode.value) {
        return artist
      } else if (bracketMode.value) {
        const layers = Math.floor(Math.random() * 5) + 1
        let formatted = artist
        for (let i = 0; i < layers; i++) {
          formatted = `{${formatted}}`
        }
        return formatted
      } else if (naiMode.value) {
        const weight = selectedWeights[index]
        return `${weight}::${artist} ::`
      } else {
        return `(${artist}:${selectedWeights[index]})`
      }
    })
    .join(', ')

  saveToHistory()
  
  // 显示生成成功提示
  displayNotification(`成功生成 ${selectedArtists.length} 个画师的组合`, 'success', 2000)
}

const saveToHistory = () => {
  const historyItem = {
    id: Date.now().toString(),
    result: result.value,
    artists: generatedArtists.value,
    timestamp: new Date(),
    params: {
      count: artistCount.value,
      minWeight: weightMin.value,
      maxWeight: weightMax.value,
      pureMode: pureMode.value,
      bracketMode: bracketMode.value,
      naiMode: naiMode.value,
      minPostCount: enableMinPostCount.value ? minPostCount.value : 0,
    },
  }
  history.value.unshift(historyItem)
  if (history.value.length > 20) {
    history.value = history.value.slice(0, 20)
  }
}

const restoreFromHistory = (item: (typeof history.value)[0]) => {
  result.value = item.result
  generatedArtists.value = item.artists
  artistCount.value = item.params.count
  weightMin.value = item.params.minWeight
  weightMax.value = item.params.maxWeight
  pureMode.value = item.params.pureMode || false
  bracketMode.value = item.params.bracketMode || false
  naiMode.value = item.params.naiMode || false

  if (item.params.minPostCount && item.params.minPostCount > 0) {
    enableMinPostCount.value = true
    minPostCount.value = item.params.minPostCount
  } else {
    enableMinPostCount.value = false
    minPostCount.value = 0
  }

  showHistory.value = false
  displayNotification('已恢复历史记录参数', 'success')
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(result.value)
    displayNotification('结果已复制到剪贴板', 'success')
  } catch {
    displayNotification('复制失败，请手动复制', 'error')
  }
}

// 搜索相关
let searchTimeout: NodeJS.Timeout | null = null

const handleSearch = (query: string) => {
  searchQuery.value = query

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (!query.trim()) {
    filteredArtists.value = []
    isLoadingArtists.value = false
    return
  }

  isLoadingArtists.value = true

  searchTimeout = setTimeout(() => {
    const lowerQuery = query.toLowerCase().trim()

    filteredArtists.value = artists.value.filter((artist) => {
      if (artist.name.toLowerCase().includes(lowerQuery)) return true
      return artist.other_names.some((name) => name.toLowerCase().includes(lowerQuery))
    })

    currentPage.value = 1
    isLoadingArtists.value = false
  }, 300)
}

// 排序相关
const handleSort = (field: 'name' | 'postCount') => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'name' ? 'asc' : 'desc'
  }
  currentPage.value = 1
}

const sortArtists = (artistList: Artist[]): Artist[] => {
  return [...artistList].sort((a, b) => {
    let comparison = 0

    if (sortBy.value === 'name') {
      comparison = a.name.localeCompare(b.name, 'zh-CN', { numeric: true })
    } else if (sortBy.value === 'postCount') {
      comparison = a.post_count - b.post_count
    }

    return sortOrder.value === 'asc' ? comparison : -comparison
  })
}

const togglePagination = () => {
  showPagination.value = !showPagination.value
  if (showPagination.value) {
    currentPage.value = 1
  }
}

// 画师详情相关
const openArtistDetail = (artist: Artist) => {
  selectedArtist.value = artist
  showArtistDetail.value = true
}

const closeArtistDetail = () => {
  showArtistDetail.value = false
  selectedArtist.value = null
}

// 复制画师名称
const copyArtistName = async (name: string) => {
  try {
    await navigator.clipboard.writeText(name)
    displayNotification(`已复制: ${name}`, 'success', 1500)
  } catch {
    displayNotification('复制失败，请手动复制', 'error', 2000)
  }
}

// 通知系统
const displayNotification = (
  message: string,
  type: ToastNotification['type'] = 'info',
  duration = 3000,
) => {
  const notification: ToastNotification = {
    id: Date.now().toString(),
    message,
    type,
    duration,
  }

  notifications.value.push(notification)

  if (duration > 0) {
    setTimeout(() => {
      removeNotification(notification.id)
    }, duration)
  }
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex((n) => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// 生命周期
onMounted(async () => {
  isLoading.value = true
  await store.loadArtists()
  isLoading.value = false
})
</script>

<style scoped>
/* 现代化美化样式 */
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    system-ui,
    sans-serif;
  background: #f9fafb;
  min-height: 100vh;
  position: relative;
}

.app-container > *:not(.modal-overlay) {
  position: relative;
  z-index: 1;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  padding: 20px;
  background: #ffffff;
  border-radius: 20px;
  border: none;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.05);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 28px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  color: #2d2d2d;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-btn:hover {
  background: #ffc700;
  border-color: #ffc700;
  color: #2d2d2d;
  transform: translateY(-2px);
  box-shadow: 0px 6px 20px rgba(255, 199, 0, 0.25);
}

.nav-btn:active {
  transform: translateY(-1px) scale(0.98);
}

/* 主标题 */
.header-section {
  text-align: center;
  margin-bottom: 48px;
  padding: 32px 24px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  position: relative;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 12px;
}

.app-icon {
  font-size: 48px;
}

.app-title {
  font-size: 42px;
  font-weight: 800;
  color: #000000;
  margin: 0;
}

.app-subtitle {
  font-size: 18px;
  color: #666666;
  margin: 0;
  font-weight: 500;
  opacity: 0.8;
}

/* 控制卡片 */
.control-card {
  background: #ffffff;
  border: none;
  border-radius: 24px;
  padding: 40px;
  margin-bottom: 32px;
  box-shadow: 0px 8px 30px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.control-card:hover {
  box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header-icon {
  font-size: 24px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.card-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* 控制网格 */
.controls-grid {
  display: grid;
  gap: 24px;
}

/* 数量控制 */
.control-section {
  background: #ffffff;
  border: none;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.control-section:hover {
  box-shadow: 0px 8px 30px rgba(0, 0, 0, 0.08);
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.control-label {
  font-size: 18px;
  font-weight: 700;
  color: inherit;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.control-badge {
  background: #ffc700;
  color: #2d2d2d;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.25);
  transition: all 0.2s ease;
}

.number-control {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.number-btn {
  width: 48px;
  height: 48px;
  background: #ffc700;
  border: none;
  border-radius: 12px;
  color: #2d2d2d;
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 2px 8px rgba(255, 199, 0, 0.2);
}

.number-btn:hover {
  background: #ffd640;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.3);
  transform: translateY(-1px);
}

.number-input {
  width: 80px;
  height: 48px;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #ffffff;
  color: #2d2d2d;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05);
}

.number-input:focus {
  border-color: #ffc700;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.15);
}

/* 模式控制 */
.mode-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05);
}

.mode-option:hover {
  background: #fff2cc;
  border-color: #ffc700;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.15);
}

.mode-option.active {
  background: #ffc700;
  color: #2d2d2d;
  border-color: #ffc700;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.25);
}

.mode-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.mode-info {
  flex: 1;
}

.mode-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d2d2d;
  margin-bottom: 2px;
}

.mode-desc {
  font-size: 12px;
  color: #757575;
}

.mode-checkbox {
  width: 20px;
  height: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #ffffff;
  transition: all 0.2s ease;
  background: #ffffff;
}

.mode-checkbox.checked {
  background: #ffc700;
  color: #2d2d2d;
  border-color: #ffc700;
}

/* 权重控制 */
.weight-section {
  position: relative;
}

.weight-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-label {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.slider-value {
  background: #ffc700;
  color: #2d2d2d;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
  box-shadow: 0px 2px 6px rgba(255, 199, 0, 0.2);
}

.slider-container {
  position: relative;
  height: 8px;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
}

.slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #ffc700;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(255, 199, 0, 0.3);
}

.slider::-webkit-slider-thumb:hover {
  background: #ffb700;
  transform: scale(1.1);
  box-shadow: 0px 4px 12px rgba(255, 199, 0, 0.4);
}

/* 作品数筛选控件 */
.post-count-filter {
  background: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05);
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filter-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.filter-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.filter-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f5f5f5;
  border: none;
  transition: 0.4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-toggle input:checked + .toggle-slider {
  background-color: #ffc700;
  border: none;
}

.filter-toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
  box-shadow: 0px 2px 6px rgba(255, 199, 0, 0.3);
}

.filter-content {
  transition: opacity 0.3s ease;
}

.filter-content.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.filter-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.filter-label,
.filter-unit {
  font-size: 14px;
  color: #666666;
}

.post-count-input {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: #2d2d2d;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
}

.post-count-input:focus {
  outline: none;
  border-color: #ffc700;
  box-shadow: 0px 2px 8px rgba(255, 199, 0, 0.15);
}

.post-count-input:disabled {
  background-color: #f5f5f5;
  color: #999999;
  border-color: #e0e0e0;
}

.filter-hint {
  font-size: 12px;
  color: #2d2d2d;
  background: #fff2cc;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid #ffc700;
}

/* 主操作按钮 */
.action-section {
  margin-bottom: 40px;
  position: relative;
}

.generate-btn {
  width: 100%;
  height: 64px;
  background: #ffc700;
  border: none;
  border-radius: 16px;
  color: #2d2d2d;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-transform: none;
  letter-spacing: 0.5px;
  box-shadow: 0px 6px 20px rgba(255, 199, 0, 0.3);
}

.generate-btn:hover:not(:disabled) {
  background: #ffb700;
  transform: translateY(-2px);
  box-shadow: 0px 8px 25px rgba(255, 199, 0, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0px 6px 20px rgba(255, 199, 0, 0.15);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #ffc700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 预设区域 */
.preset-section {
  margin-bottom: 40px;
  padding: 32px;
  background: #ffffff;
  border: none;
  border-radius: 20px;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.05);
}

.preset-title {
  font-size: 22px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 20px 0;
  text-align: center;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05);
}

.preset-card:hover {
  background: #fff2cc;
  border-color: #ffc700;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.15);
}

.preset-card.active {
  background: #ffc700;
  color: #2d2d2d;
  border-color: #ffc700;
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.25);
}

.preset-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d2d2d;
  margin-bottom: 2px;
}

.preset-desc {
  font-size: 12px;
  color: #757575;
  line-height: 1.3;
}

/* 结果区域 */
.result-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 28px;
  margin-bottom: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  position: relative;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-title {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  color: #2d2d2d;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05);
}

.copy-btn:hover {
  background: #ffc700;
  border-color: #ffc700;
  color: #2d2d2d;
  transform: translateY(-1px);
  box-shadow: 0px 4px 15px rgba(255, 199, 0, 0.25);
}

.result-content {
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 4px;
  padding: 20px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 15px;
  line-height: 1.6;
  color: #000000;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .app-container {
    padding: 16px;
  }

  .top-nav {
    position: static;
    justify-content: center;
    margin-bottom: 24px;
  }

  .title-row {
    flex-direction: column;
    gap: 8px;
  }

  .app-title {
    font-size: 24px;
  }

  .weight-controls {
    grid-template-columns: 1fr;
  }

  .mode-controls {
    grid-template-columns: 1fr;
  }

  .preset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
