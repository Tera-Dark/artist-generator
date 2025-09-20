<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <div class="top-nav">
      <button @click="showArtistLibrary = true" class="nav-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7" stroke="currentColor" stroke-width="2"/>
          <path d="M3 7H21L20 19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19L3 7Z" stroke="currentColor" stroke-width="2"/>
          <path d="M10 11V17" stroke="currentColor" stroke-width="2"/>
          <path d="M14 11V17" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>画师库</span>
      </button>
      <button @click="showHistory = true" class="nav-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 8V12L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3.05 11A9 9 0 1 1 3.05 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 4V9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
            <button 
              @click="decreaseCount" 
              :disabled="artistCount <= 1"
              class="control-btn decrease"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </button>
            <div class="number-display">
              <span class="number-value">{{ artistCount }}</span>
            </div>
            <button 
              @click="increaseCount" 
              :disabled="artistCount >= 25"
              class="control-btn increase"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 输出模式控制 -->
        <div class="control-section">
          <div class="control-header">
            <span class="control-label">输出模式</span>
            <div class="control-badge" v-if="pureMode">纯净</div>
            <div class="control-badge" v-else-if="bracketMode">括号</div>
            <div class="control-badge" v-else-if="naiMode">NAI</div>
            <div class="control-badge" v-else>权重</div>
          </div>
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
                <div class="mode-desc">随机1-5层括号</div>
              </div>
              <div class="mode-checkbox" :class="{ checked: bracketMode }">
                <span v-if="bracketMode">✓</span>
              </div>
            </div>
            
            <div class="mode-option" @click="toggleNaiMode" :class="{ active: naiMode }">
              <div class="mode-icon">🎨</div>
              <div class="mode-info">
                <div class="mode-name">NAI模式</div>
                <div class="mode-desc">权重::画师名格式</div>
              </div>
              <div class="mode-checkbox" :class="{ checked: naiMode }">
                <span v-if="naiMode">✓</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 权重范围控制 -->
        <div class="control-section" :class="{ disabled: pureMode || bracketMode }">
          <div class="control-header">
            <span class="control-label">权重范围</span>
            <div class="control-badge">{{ weightMin }} - {{ weightMax }}</div>
          </div>
          
          <div class="slider-controls">
            <!-- 最小权重滑块 -->
            <div class="slider-group">
              <div class="slider-label">
                <span>最小值</span>
                <span class="slider-value">{{ weightMin }}</span>
              </div>
              <div class="slider-container">
                <input 
                  v-model="weightMin" 
                  type="range" 
                  min="0.1" 
                  :max="weightMax" 
                  step="0.1"
                  :disabled="pureMode || bracketMode"
                  class="custom-slider min-slider"
                >
                <div class="slider-track"></div>
              </div>
            </div>

            <!-- 最大权重滑块 -->
            <div class="slider-group">
              <div class="slider-label">
                <span>最大值</span>
                <span class="slider-value">{{ weightMax }}</span>
              </div>
              <div class="slider-container">
                <input 
                  v-model="weightMax" 
                  type="range" 
                  :min="weightMin" 
                  max="2.0" 
                  step="0.1"
                  :disabled="pureMode || bracketMode"
                  class="custom-slider max-slider"
                >
                <div class="slider-track"></div>
              </div>
            </div>
          </div>
          <div v-if="pureMode || bracketMode" class="disabled-overlay">
            <span>{{ pureMode ? '纯净模式下不使用权重' : '括号模式下不使用权重' }}</span>
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
      <button 
        @click="generate"
        :disabled="isLoading || artists.length === 0"
        class="generate-btn"
      >
        <div class="btn-icon">🎨</div>
        <span class="btn-text">{{ isLoading ? '生成中...' : '生成画师串' }}</span>
      </button>
      
      <button 
        v-if="result"
        @click="copyResult"
        class="copy-btn"
      >
        <div class="btn-icon">📋</div>
        <span class="btn-text">复制结果</span>
      </button>
    </div>

    <!-- 快速预设 -->
    <div class="presets-section">
      <div class="section-header">
        <div class="section-icon">🎯</div>
        <h3 class="section-title">快速预设</h3>
      </div>
      
      <div class="presets-grid">
        <div 
          v-for="preset in presets" 
          :key="preset.id"
          @click="applyPreset(preset)"
          class="preset-card"
          :class="{ 'preset-active': lastUsedPreset === preset.id }"
        >
          <div class="preset-icon">{{ preset.icon }}</div>
          <div class="preset-content">
            <h4 class="preset-name">{{ preset.name }}</h4>
            <p class="preset-desc">{{ preset.description }}</p>
            <div class="preset-params">
              数量: {{ preset.config.countRange[0] === preset.config.countRange[1] ? preset.config.countRange[0] : `${preset.config.countRange[0]}-${preset.config.countRange[1]}` }} | 
              权重: {{ preset.config.weightRange[0] }}-{{ preset.config.weightRange[1] }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果显示 -->
    <div v-if="result" class="result-card">
      <div class="result-header">
        <div class="result-icon">✨</div>
        <div class="result-info">
          <h3 class="result-title">生成结果</h3>
          <p class="result-count">共 {{ generatedArtists.length }} 个画师</p>
        </div>
      </div>
      
      <div class="result-content">
        <div class="result-text">{{ result }}</div>
      </div>
    </div>

    <!-- 画师库模态框 -->
    <div v-if="showArtistLibrary" class="modal-overlay" @click="showArtistLibrary = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">画师库</h3>
          <button @click="showArtistLibrary = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="search-box">
            <input 
              v-model="searchQuery" 
              @input="searchArtists"
              placeholder="搜索画师..." 
              class="search-input"
            >
          </div>
          <div class="artist-stats">
            <div class="stats-info">
              共 {{ artists.length }} 个画师
              <span v-if="searchQuery">(筛选出 {{ filteredArtists.length }} 个)</span>
              <span v-if="showPagination && totalPages > 1">- 第 {{ currentPage }} / {{ totalPages }} 页 (每页{{ pageSize }}个)</span>
            </div>
            <div class="stats-controls">
              <button 
                @click="togglePagination" 
                class="pagination-toggle"
                :class="{ active: !showPagination }"
              >
                {{ showPagination ? '显示全部' : '启用分页' }}
              </button>
            </div>
          </div>
          
          <!-- 排序控件 -->
          <div class="sort-controls">
            <span class="sort-label">排序方式：</span>
            <div class="sort-buttons">
              <button 
                class="sort-btn"
                :class="{ 
                  active: sortBy === 'name',
                  'sort-asc': sortBy === 'name' && sortOrder === 'asc',
                  'sort-desc': sortBy === 'name' && sortOrder === 'desc'
                }"
                @click="setSortBy('name')"
                title="按字母顺序排序"
              >
                字母顺序
                <span class="sort-icon" v-if="sortBy === 'name'">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
              <button 
                class="sort-btn"
                :class="{ 
                  active: sortBy === 'postCount',
                  'sort-asc': sortBy === 'postCount' && sortOrder === 'asc',
                  'sort-desc': sortBy === 'postCount' && sortOrder === 'desc'
                }"
                @click="setSortBy('postCount')"
                title="按作品数量排序"
              >
                作品数量
                <span class="sort-icon" v-if="sortBy === 'postCount'">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
            </div>
          </div>
          
          <div v-if="isLoadingArtists" class="loading-state">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else>
            <!-- 搜索结果为空 -->
            <div v-if="searchQuery && filteredArtists.length === 0" class="empty-state">
              <div class="empty-icon">🔍</div>
              <div class="empty-title">未找到匹配的画师</div>
              <div class="empty-description">
                尝试使用其他关键词搜索，或清空搜索框查看所有画师
              </div>
            </div>
            
            <!-- 画师列表 -->
            <div v-else class="artist-list">
              <div 
                v-for="artist in paginatedArtists" 
                :key="artist.name"
                class="artist-card"
                @click="openArtistDetail(artist)"
              >
                <!-- 首字母徽章 -->
                <div 
                  class="artist-avatar"
                  :style="{ backgroundColor: generateAvatarColor(artist.name) }"
                >
                  {{ getInitial(artist.name) }}
                </div>
                
                <!-- 画师信息区域 -->
                <div class="artist-info">
                  <!-- 主名称 -->
                  <div class="artist-name" :title="artist.name">{{ artist.name }}</div>
                  
                  <!-- 别名 -->
                  <div class="artist-aliases" v-if="artist.other_names.length > 0" :title="formatAliases(artist.other_names)">
                    {{ formatAliases(artist.other_names) }}
                  </div>
                </div>
                
                <!-- 作品数量和复制按钮 -->
                <div class="artist-stats">
                  <div class="post-count">
                    <span class="count-number">{{ formatPostCount(artist.post_count) }}</span>
                    <span class="count-label">作品</span>
                  </div>
                  <button 
                    class="copy-btn" 
                    @click.stop="copyArtistName(artist.name)"
                    title="复制画师名称"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
            <!-- 分页控件 -->
            <div v-if="showPagination && totalPages > 1" class="pagination">
              <button 
                @click="goToPage(currentPage - 1)" 
                :disabled="currentPage === 1"
                class="page-btn"
              >
                ‹ 上一页
              </button>
              <div class="page-numbers">
                <button 
                  v-for="page in getPageNumbers()" 
                  :key="page"
                  @click="typeof page === 'number' ? goToPage(page) : null"
                  :class="['page-number', { active: page === currentPage, disabled: typeof page === 'string' }]"
                  :disabled="typeof page === 'string'"
                >
                  {{ page }}
                </button>
              </div>
              <button 
                @click="goToPage(currentPage + 1)" 
                :disabled="currentPage === totalPages"
                class="page-btn"
              >
                下一页 ›
              </button>
              <button 
                @click="goToPage(totalPages)" 
                :disabled="currentPage === totalPages"
                class="page-btn"
                title="跳转到最后一页"
              >
                末页
              </button>
            </div>
            <!-- 页面跳转输入框 -->
            <div v-if="showPagination && totalPages > 1" class="page-jump">
              <span class="page-jump-label">跳转到</span>
              <input 
                v-model.number="pageJumpInput"
                @keyup.enter="jumpToPage"
                @blur="jumpToPage"
                type="number"
                :min="1"
                :max="totalPages"
                class="page-jump-input"
                placeholder="页码"
              >
              <span class="page-jump-total">/ {{ totalPages }} 页</span>
              <button @click="jumpToPage" class="page-jump-btn">跳转</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史记录模态框 -->
    <div v-if="showHistory" class="modal-overlay" @click="showHistory = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">历史记录</h3>
          <button @click="showHistory = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div v-if="history.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p>暂无历史记录</p>
          </div>
          <div v-else>
            <div class="history-stats">
              共 {{ history.length }} 条记录
              <span v-if="historyTotalPages > 1">- 第 {{ historyCurrentPage }} / {{ historyTotalPages }} 页</span>
            </div>
            <div class="history-list">
              <div 
                v-for="item in paginatedHistory" 
                :key="item.id"
                class="history-item"
                @click="restoreFromHistory(item)"
              >
                <div class="history-header">
                  <span class="history-time">{{ formatTime(item.timestamp) }}</span>
                                  <span class="history-params">
                  {{ item.params.count }}个画师 | 
                  <span v-if="item.params.pureMode">纯净模式</span>
                  <span v-else-if="item.params.bracketMode">括号模式</span>
                  <span v-else-if="item.params.naiMode">NAI模式</span>
                  <span v-else>权重{{ item.params.minWeight }}-{{ item.params.maxWeight }}</span>
                  <span v-if="item.params.minPostCount && item.params.minPostCount > 0"> | 作品≥{{ item.params.minPostCount }}</span>
                </span>
                </div>
                <div class="history-result">{{ item.result }}</div>
              </div>
            </div>
            <!-- 历史记录分页控件 -->
            <div v-if="historyTotalPages > 1" class="pagination">
              <button 
                @click="goToHistoryPage(historyCurrentPage - 1)" 
                :disabled="historyCurrentPage === 1"
                class="page-btn"
              >
                ‹ 上一页
              </button>
              <div class="page-numbers">
                <button 
                  v-for="page in getHistoryPageNumbers()" 
                  :key="page"
                  @click="typeof page === 'number' ? goToHistoryPage(page) : null"
                  :class="['page-number', { active: page === historyCurrentPage, disabled: typeof page === 'string' }]"
                  :disabled="typeof page === 'string'"
                >
                  {{ page }}
                </button>
              </div>
              <button 
                @click="goToHistoryPage(historyCurrentPage + 1)" 
                :disabled="historyCurrentPage === historyTotalPages"
                class="page-btn"
              >
                下一页 ›
              </button>
            </div>
            <!-- 历史记录页面跳转输入框 -->
            <div v-if="historyTotalPages > 1" class="page-jump">
              <span class="page-jump-label">跳转到</span>
              <input 
                v-model.number="historyPageJumpInput"
                @keyup.enter="jumpToHistoryPage"
                @blur="jumpToHistoryPage"
                type="number"
                :min="1"
                :max="historyTotalPages"
                class="page-jump-input"
                placeholder="页码"
              >
              <span class="page-jump-total">/ {{ historyTotalPages }} 页</span>
              <button @click="jumpToHistoryPage" class="page-jump-btn">跳转</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 画师详情模态框 -->
    <div v-if="showArtistDetail && selectedArtist" class="modal-overlay" @click="closeArtistDetail">
      <div class="artist-detail-modal" @click.stop>
        <div class="artist-detail-header">
          <div class="artist-detail-avatar" :style="{ backgroundColor: generateAvatarColor(selectedArtist.name) }">
            {{ getInitial(selectedArtist.name) }}
          </div>
          <button @click="closeArtistDetail" class="close-btn">×</button>
        </div>
        
        <div class="artist-detail-body">
          <div class="artist-detail-section">
            <h3 class="section-title">主名称</h3>
            <div class="name-item">
              <span class="name-text">{{ selectedArtist.name }}</span>
              <button class="copy-name-btn" @click="copyArtistName(selectedArtist.name)" title="复制">📋</button>
            </div>
          </div>
          
          <div class="artist-detail-section" v-if="selectedArtist.other_names.length > 0">
            <h3 class="section-title">其他名称 ({{ selectedArtist.other_names.length }}个)</h3>
            <div class="aliases-list">
              <div v-for="alias in selectedArtist.other_names" :key="alias" class="name-item">
                <span class="name-text">{{ alias }}</span>
                <button class="copy-name-btn" @click="copyArtistName(alias)" title="复制">📋</button>
              </div>
            </div>
          </div>
          
          <div class="artist-detail-section">
            <h3 class="section-title">作品统计</h3>
            <div class="stats-display">
              <div class="stat-item">
                <span class="stat-number">{{ selectedArtist.post_count.toLocaleString() }}</span>
                <span class="stat-label">作品总数</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 通知栏容器 -->
    <div class="toast-container">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="toast-notification"
        :class="`toast-${notification.type}`"
      >
        <div class="toast-content">
          <div class="toast-icon">
            <span v-if="notification.type === 'success'">✅</span>
            <span v-else-if="notification.type === 'error'">❌</span>
            <span v-else>ℹ️</span>
          </div>
          <span class="toast-message">{{ notification.message }}</span>
          <button 
            @click="closeNotification(notification.id)"
            class="toast-close"
          >
            ×
          </button>
        </div>
        <div class="toast-progress">
          <div 
            class="toast-progress-bar"
            :style="{ width: notification.progress + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Artist } from '@/types'

// 响应式状态
const isLoading = ref(false)
const result = ref<string>('')
const artists = ref<Artist[]>([])
const generatedArtists = ref<string[]>([])
const lastUsedPreset = ref<string | null>(null)
const showArtistLibrary = ref(false)
const showHistory = ref(false)
const history = ref<Array<{id: string, result: string, artists: string[], timestamp: Date, params: {count: number, minWeight: number, maxWeight: number, pureMode?: boolean, bracketMode?: boolean, naiMode?: boolean}}>>([])
const filteredArtists = ref<Artist[]>([])
const searchQuery = ref('')
const isLoadingArtists = ref(false)
const showPagination = ref(true)
const showArtistDetail = ref(false)
const selectedArtist = ref<Artist | null>(null)

// 排序相关
const sortBy = ref<'name' | 'postCount'>('postCount')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 分页相关
const currentPage = ref(1)
const pageSize = 40
const historyCurrentPage = ref(1)
const historyPageSize = 20
const pageJumpInput = ref<number | null>(null)
const historyPageJumpInput = ref<number | null>(null)

// 参数控制
const artistCount = ref(3)
const weightMin = ref(1.0)
const weightMax = ref(1.5)

// 新增模式控制
const pureMode = ref(false)
const bracketMode = ref(false)
const naiMode = ref(false)
const minPostCount = ref(0)
const enableMinPostCount = ref(false)
const bracketLayers = ref(1)

// 通知系统
interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
  progress: number
  timer?: number
}

const notifications = ref<ToastNotification[]>([])

// 数据持久化相关
const STORAGE_KEYS = {
  HISTORY: 'artist-generator-history',
  PARAMS: 'artist-generator-params',
  PAGINATION: 'artist-generator-pagination'
}

// 保存数据到localStorage（一个月过期）
const saveToStorage = (key: string, data: any) => {
  try {
    const item = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30天过期
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    console.warn('保存数据失败:', error)
  }
}

// 从localStorage读取数据
const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key)
    if (!item) return null
    
    const parsed = JSON.parse(item)
    
    // 检查是否过期
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(key)
      return null
    }
    
    return parsed.data
  } catch (error) {
    console.warn('读取数据失败:', error)
    return null
  }
}

// 清理过期数据
const cleanExpiredStorage = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    const item = localStorage.getItem(key)
    if (item) {
      try {
        const parsed = JSON.parse(item)
        if (Date.now() > parsed.expiry) {
          localStorage.removeItem(key)
        }
      } catch (error) {
        localStorage.removeItem(key)
      }
    }
  })
}

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
    config: { countRange: [3, 3], weightRange: [0.7, 1.0], minPostCount: 1000 },
  },
  {
    id: 'primary',
    name: '⭐ 主次风格',
    icon: '⭐',
    description: '主要风格+次要风格',
    config: { countRange: [3, 5], weightRange: [0.5, 1.3], minPostCount: 1500 },
  },
  {
    id: 'popular',
    name: '🌟 热门画师',
    icon: '🌟',
    description: '高作品数画师组合',
    config: { countRange: [2, 4], weightRange: [0.8, 1.2], minPostCount: 5000 },
  },
  {
    id: 'creative',
    name: '✨ 创意爆发',
    icon: '✨',
    description: '强烈风格混合',
    config: { countRange: [4, 8], weightRange: [0.5, 1.5], minPostCount: 0 },
  }
]

const loadArtists = async () => {
  try {
    isLoading.value = true
    console.log('开始加载画师数据...')
    console.log('当前URL:', window.location.href)
    console.log('Base URL:', document.baseURI)
    
    // 尝试多个可能的路径
    const possiblePaths = [
      './data/artists.json',
      '/data/artists.json',
      '/artist-generator/data/artists.json',
      'data/artists.json'
    ]
    
    let loadSuccess = false
    
    for (const path of possiblePaths) {
      try {
        console.log(`尝试加载路径: ${path}`)
        const response = await fetch(path)
        console.log(`响应状态: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const data = await response.json()
          // 新格式：直接是Artist数组
          if (Array.isArray(data) && data.length > 0) {
            artists.value = data as Artist[]
            console.log(`✅ 成功加载 ${artists.value.length} 个画师 (路径: ${path})`)
            loadSuccess = true
            break
          }
          // 旧格式兼容：包装在artists属性中
          else if (data && data.artists && Array.isArray(data.artists) && data.artists.length > 0) {
            artists.value = data.artists
            console.log(`✅ 成功加载 ${artists.value.length} 个画师 (旧格式兼容，路径: ${path})`)
            loadSuccess = true
            break
          } else {
            console.warn(`⚠️ 数据格式不正确 (路径: ${path})`, data)
          }
        }
      } catch (pathError) {
        console.warn(`❌ 路径 ${path} 加载失败:`, pathError)
      }
    }
    
    if (!loadSuccess) {
      throw new Error('所有路径都加载失败')
    }
    
  } catch (error) {
    console.error('❌ 画师数据加载完全失败:', error)
    console.warn('🔄 使用测试数据')
    artists.value = [
      { name: 'test_artist_1', other_names: ['test1'], post_count: 100 },
      { name: 'test_artist_2', other_names: ['test2'], post_count: 200 },
      { name: 'test_artist_3', other_names: ['test3'], post_count: 300 }
    ]
  } finally {
    isLoading.value = false
    console.log(`最终加载结果: ${artists.value.length} 个画师`)
  }
}

// 数量控制函数
const increaseCount = () => {
  if (artistCount.value < 25) {
    artistCount.value++
    saveParams()
  }
}

const decreaseCount = () => {
  if (artistCount.value > 1) {
    artistCount.value--
    saveParams()
  }
}

// 权重控制函数
const increaseWeightMin = () => {
  if (weightMin.value < weightMax.value) {
    weightMin.value = parseFloat((weightMin.value + 0.1).toFixed(1))
    saveParams()
  }
}

const decreaseWeightMin = () => {
  if (weightMin.value > 0.1) {
    weightMin.value = parseFloat((weightMin.value - 0.1).toFixed(1))
    saveParams()
  }
}

const increaseWeightMax = () => {
  if (weightMax.value < 2.0) {
    weightMax.value = parseFloat((weightMax.value + 0.1).toFixed(1))
    saveParams()
  }
}

const decreaseWeightMax = () => {
  if (weightMax.value > weightMin.value) {
    weightMax.value = parseFloat((weightMax.value - 0.1).toFixed(1))
    saveParams()
  }
}

// 保存参数到localStorage
const saveParams = () => {
  const params = {
    artistCount: artistCount.value,
    weightMin: weightMin.value,
    weightMax: weightMax.value,
    pureMode: pureMode.value,
    bracketMode: bracketMode.value,
    naiMode: naiMode.value,
    bracketLayers: bracketLayers.value,
    lastUsedPreset: lastUsedPreset.value
  }
  saveToStorage(STORAGE_KEYS.PARAMS, params)
}

// 应用预设配置
const applyPreset = (preset: typeof presets[0]) => {
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
  saveParams()
}

const generate = () => {
  if (artists.value.length === 0) return
  
  const count = artistCount.value
  const selectedArtists: string[] = []
  const selectedWeights: number[] = []
  
  // 根据作品数阈值筛选画师
  let availableArtists = artists.value
  if (enableMinPostCount.value && minPostCount.value > 0) {
    availableArtists = artists.value.filter(artist => artist.post_count >= minPostCount.value)
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
    // 使用画师的主名称
    selectedArtists.push(availableArtists[randomIndex].name)
    
    if (!pureMode.value && !bracketMode.value && !naiMode.value) {
      let weight: number
      // 主次风格特殊处理
      if (lastUsedPreset.value === 'primary') {
        if (i === 0) {
          // 第一个画师：主要风格，权重1.0-1.3
          weight = parseFloat((Math.random() * 0.3 + 1.0).toFixed(1))
        } else {
          // 其余画师：次要风格，权重0.5-0.8
          weight = parseFloat((Math.random() * 0.3 + 0.5).toFixed(1))
        }
      } else {
        // 其他预设：正常权重范围
        weight = parseFloat(
          (Math.random() * (weightMax.value - weightMin.value) + weightMin.value).toFixed(1)
        )
      }
      selectedWeights.push(weight)
    } else if (naiMode.value) {
      let weight: number
      // 主次风格特殊处理
      if (lastUsedPreset.value === 'primary') {
        if (i === 0) {
          // 第一个画师：主要风格，权重1.0-1.3
          weight = parseFloat((Math.random() * 0.3 + 1.0).toFixed(1))
        } else {
          // 其余画师：次要风格，权重0.5-0.8
          weight = parseFloat((Math.random() * 0.3 + 0.5).toFixed(1))
        }
      } else {
        // 其他预设：正常权重范围
        weight = parseFloat(
          (Math.random() * (weightMax.value - weightMin.value) + weightMin.value).toFixed(1)
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
        // 纯净模式：只返回画师名
        return artist
      } else if (bracketMode.value) {
        // 括号模式：随机1-5层括号
        const layers = Math.floor(Math.random() * 5) + 1
        let formatted = artist
        for (let i = 0; i < layers; i++) {
          formatted = `{${formatted}}`
        }
        return formatted
      } else if (naiMode.value) {
        // NAI模式：权重::tag格式
        const weight = selectedWeights[index]
        return weight === 1.0 ? artist : `${weight}::${artist}`
      } else {
        // 权重模式
        const weight = selectedWeights[index]
        return weight === 1.0 ? artist : `(${artist}:${weight})`
      }
    })
    .join(', ')
  
  // 保存到历史记录
  const historyItem = {
    id: Date.now().toString(),
    result: result.value,
    artists: selectedArtists,
    timestamp: new Date(),
        params: {
          count: artistCount.value,
          minWeight: weightMin.value,
          maxWeight: weightMax.value,
          pureMode: pureMode.value,
          bracketMode: bracketMode.value,
          naiMode: naiMode.value,
          minPostCount: enableMinPostCount.value ? minPostCount.value : 0
        }
  }
  history.value.unshift(historyItem)
  // 只保留最近20条记录
  if (history.value.length > 20) {
    history.value = history.value.slice(0, 20)
  }
  
  // 保存历史记录到localStorage
  saveToStorage(STORAGE_KEYS.HISTORY, history.value)
  
  // 显示生成成功通知
  displayNotification(`生成成功！获得 ${selectedArtists.length} 个画师`, 'success', 1000)
}

// 显示通知函数
const displayNotification = (message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 1000) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
  
  const notification: ToastNotification = {
    id,
    message,
    type,
    duration,
    progress: 100
  }
  
  notifications.value.push(notification)
  
  // 进度条动画
  const startTime = Date.now()
  const updateProgress = () => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, duration - elapsed)
    notification.progress = (remaining / duration) * 100
    
    if (remaining > 0) {
      notification.timer = requestAnimationFrame(updateProgress)
    } else {
      removeNotification(id)
    }
  }
  
  // 开始进度条动画
  notification.timer = requestAnimationFrame(updateProgress)
}

// 移除通知
const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    const notification = notifications.value[index]
    if (notification.timer) {
      cancelAnimationFrame(notification.timer)
    }
    notifications.value.splice(index, 1)
  }
}

// 手动关闭通知
const closeNotification = (id: string) => {
  removeNotification(id)
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(result.value)
    displayNotification('复制成功！', 'success', 1000)
  } catch {
    displayNotification('复制失败，请手动复制', 'error', 2000)
  }
}

// 搜索画师
// 防抖搜索，减少频繁计算
let searchTimeout: NodeJS.Timeout | null = null

const searchArtists = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  if (!searchQuery.value.trim()) {
    filteredArtists.value = []
    resetPagination()
    isLoadingArtists.value = false
    return
  }
  
  isLoadingArtists.value = true
  
  searchTimeout = setTimeout(() => {
    const lowerQuery = searchQuery.value.toLowerCase().trim()
    
    filteredArtists.value = artists.value
      .filter(artist => {
        // 主名称匹配
        if (artist.name.toLowerCase().includes(lowerQuery)) return true
        // 别名匹配
        return artist.other_names.some(name => 
          name.toLowerCase().includes(lowerQuery)
        )
      })
    
    resetPagination()
    isLoadingArtists.value = false
  }, 300) // 防抖延迟
}

// 生成首字母徽章颜色
// 颜色缓存，避免重复计算
const colorCache = new Map<string, string>()

const generateAvatarColor = (name: string): string => {
  if (colorCache.has(name)) {
    return colorCache.get(name)!
  }
  
  // 使用简单的哈希算法生成颜色
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 预定义的美观色彩组合
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#FCF3CF'
  ]
  
  const color = colors[Math.abs(hash) % colors.length]
  colorCache.set(name, color)
  return color
}

// 获取首字母
const getInitial = (name: string): string => {
  return name.charAt(0).toUpperCase()
}

// 格式化别名显示
// 别名格式化缓存
const aliasCache = new Map<string, string>()

const formatAliases = (other_names: string[]): string => {
  if (other_names.length === 0) return ''
  
  const key = other_names.join('|')
  if (aliasCache.has(key)) {
    return aliasCache.get(key)!
  }
  
  let result: string
  if (other_names.length <= 2) {
    result = other_names.join(', ')
  } else {
    const shown = other_names.slice(0, 2).join(', ')
    const remaining = other_names.length - 2
    result = `${shown} ...等${remaining}个`
  }
  
  aliasCache.set(key, result)
  return result
}

// 作品数格式化缓存
const countCache = new Map<number, string>()

// 格式化作品数量
const formatPostCount = (count: number): string => {
  if (countCache.has(count)) {
    return countCache.get(count)!
  }
  
  let result: string
  if (count >= 10000) {
    result = `${(count / 10000).toFixed(1)}w+`
  } else if (count >= 1000) {
    result = `${(count / 1000).toFixed(1)}k+`
  } else {
    result = count.toString()
  }
  
  countCache.set(count, result)
  return result
}

// 从历史记录恢复
const restoreFromHistory = (item: typeof history.value[0]) => {
  result.value = item.result
  generatedArtists.value = item.artists
  artistCount.value = item.params.count
  weightMin.value = item.params.minWeight
  weightMax.value = item.params.maxWeight
  pureMode.value = item.params.pureMode || false
  bracketMode.value = item.params.bracketMode || false
  naiMode.value = item.params.naiMode || false
  showHistory.value = false
}

// 格式化时间
const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

// 分页切换函数
const togglePagination = () => {
  showPagination.value = !showPagination.value
  if (showPagination.value) {
    currentPage.value = 1
  }
}

// 画师详情相关函数
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

// 排序功能
const setSortBy = (newSortBy: 'name' | 'postCount') => {
  if (sortBy.value === newSortBy) {
    // 如果点击的是当前排序字段，切换排序顺序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 如果点击的是不同字段，设置新字段并使用默认排序
    sortBy.value = newSortBy
    sortOrder.value = newSortBy === 'name' ? 'asc' : 'desc'
  }
  currentPage.value = 1 // 重置到第一页
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

// 计算属性
const totalPages = computed(() => {
  if (!showPagination.value) return 1
  const total = searchQuery.value ? filteredArtists.value.length : artists.value.length
  return Math.ceil(total / pageSize)
})

const historyTotalPages = computed(() => {
  return Math.ceil(history.value.length / historyPageSize)
})

// 优化后的分页逻辑 - 减少重复计算
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

const paginatedHistory = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyPageSize
  const end = start + historyPageSize
  return history.value.slice(start, end)
})

// 分页控制函数
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const goToHistoryPage = (page: number) => {
  if (page >= 1 && page <= historyTotalPages.value) {
    historyCurrentPage.value = page
  }
}

// 页面跳转函数
const jumpToPage = () => {
  if (pageJumpInput.value && pageJumpInput.value >= 1 && pageJumpInput.value <= totalPages.value) {
    goToPage(pageJumpInput.value)
    pageJumpInput.value = null
  }
}

const jumpToHistoryPage = () => {
  if (historyPageJumpInput.value && historyPageJumpInput.value >= 1 && historyPageJumpInput.value <= historyTotalPages.value) {
    goToHistoryPage(historyPageJumpInput.value)
    historyPageJumpInput.value = null
  }
}

const resetPagination = () => {
  currentPage.value = 1
}

// 模式切换函数
const togglePureMode = () => {
  pureMode.value = !pureMode.value
  if (pureMode.value) {
    bracketMode.value = false
    naiMode.value = false
  }
  saveParams()
}

const toggleBracketMode = () => {
  bracketMode.value = !bracketMode.value
  if (bracketMode.value) {
    pureMode.value = false
    naiMode.value = false
  }
  saveParams()
}

const toggleNaiMode = () => {
  naiMode.value = !naiMode.value
  if (naiMode.value) {
    pureMode.value = false
    bracketMode.value = false
  }
  saveParams()
}

// 获取页码数组
const getPageNumbers = () => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // 总页数少于7页，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数多于7页，智能显示页码
    if (current <= 4) {
      // 当前页在前面
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后面
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

// 获取历史记录页码数组
const getHistoryPageNumbers = () => {
  const pages = []
  const total = historyTotalPages.value
  const current = historyCurrentPage.value
  
  if (total <= 5) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 2) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 3; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      pages.push(current)
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

// 加载保存的数据
const loadSavedData = () => {
  // 清理过期数据
  cleanExpiredStorage()
  
  // 加载历史记录
  const savedHistory = loadFromStorage(STORAGE_KEYS.HISTORY)
  if (savedHistory && Array.isArray(savedHistory)) {
    // 转换时间戳为Date对象
    history.value = savedHistory.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }))
  }
  
  // 加载参数
  const savedParams = loadFromStorage(STORAGE_KEYS.PARAMS)
  if (savedParams) {
    artistCount.value = savedParams.artistCount || 3
    weightMin.value = savedParams.weightMin || 1.0
    weightMax.value = savedParams.weightMax || 1.5
    pureMode.value = savedParams.pureMode || false
    bracketMode.value = savedParams.bracketMode || false
    naiMode.value = savedParams.naiMode || false
    bracketLayers.value = savedParams.bracketLayers || 1
    lastUsedPreset.value = savedParams.lastUsedPreset || null
  }
}

onMounted(() => {
  loadArtists()
  loadSavedData()
})
</script>

<style scoped>
/* 全局容器 */
.app-container {
  min-height: 100vh;
  background: #f5f1eb;
  padding: 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
}

/* 顶部导航 */
.top-nav {
  position: absolute;
  top: 24px;
  left: 24px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.nav-btn {
  background: #ffffff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.nav-btn:hover {
  border-color: #fbbf24;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.nav-btn svg {
  color: #666666;
}

/* 头部区域 */
.header-section {
  text-align: center;
  margin-bottom: 24px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.app-icon {
  font-size: 40px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.app-title {
  font-size: 28px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: 14px;
  color: #666666;
  font-weight: 500;
}

/* 控制卡片 */
.control-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  margin: 0 auto 24px;
  max-width: 800px;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.04),
    0 16px 32px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  position: relative;
}

.control-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  border-radius: 20px 20px 0 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.header-icon {
  font-size: 28px;
  color: #fbbf24;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.card-subtitle {
  font-size: 12px;
  color: #666666;
  margin: 2px 0 0 0;
}

/* 控制网格 */
.controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .controls-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .controls-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

/* 控制区域 */
.control-section {
  background: #f8f8f8;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.02);
  position: relative;
}

.control-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px 16px 0 0;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.control-label {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.control-badge {
  background: #fbbf24;
  color: #1a1a1a;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

/* 数字控制 */
.number-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.control-btn {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: none;
  background: #1a1a1a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover:not(:disabled) {
  background: #333333;
  transform: translateY(-2px);
}

.control-btn:active:not(:disabled) {
  transform: translateY(0);
  background: #000000;
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
  background: #cccccc;
}

.number-display {
  background: #ffffff;
  border: 2px solid #e5e5e5;
  border-radius: 20px;
  width: 100px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.number-value {
  font-size: 32px;
  font-weight: 800;
  color: #1a1a1a;
}

/* 模式控制 */
.mode-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #ffffff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-option:hover {
  border-color: #fbbf24;
  background: #fffbf0;
}

.mode-option.active {
  border-color: #fbbf24;
  background: #fbbf24;
  color: #1a1a1a;
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
  margin-bottom: 2px;
}

.mode-desc {
  font-size: 12px;
  opacity: 0.7;
}

.mode-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.mode-checkbox.checked {
  background: #ffffff;
  border-color: #ffffff;
  color: #fbbf24;
}

.mode-option.active .mode-checkbox.checked {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fbbf24;
}

/* 滑块控制 */
.slider-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.slider-group {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #e5e5e5;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.slider-value {
  background: #fbbf24;
  color: #1a1a1a;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
}

.slider-container {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
}

.custom-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e5e5;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.custom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fbbf24;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.custom-slider::-webkit-slider-thumb:hover {
  background: #f59e0b;
  transform: scale(1.1);
}

.custom-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fbbf24;
  cursor: pointer;
  border: none;
}

/* 禁用状态样式 */
.control-section.disabled {
  opacity: 0.5;
  position: relative;
}

.disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-size: 14px;
  color: #666666;
  font-weight: 500;
  backdrop-filter: blur(2px);
}

.custom-slider:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.custom-slider:disabled::-webkit-slider-thumb {
  background: #cccccc;
  cursor: not-allowed;
}

.custom-slider:disabled::-webkit-slider-thumb:hover {
  background: #cccccc;
  transform: none;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin: 24px auto;
  max-width: 400px;
}

@media (min-width: 640px) {
  .action-section {
    flex-direction: row;
    justify-content: center;
  }
}

.generate-btn {
  background: #fbbf24;
  color: #1a1a1a;
  border: none;
  border-radius: 20px;
  padding: 20px 40px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  justify-content: center;
}

.generate-btn:hover:not(:disabled) {
  background: #f59e0b;
  transform: translateY(-2px);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  background: #e5e5e5;
  color: #999999;
}

.copy-btn {
  background: #ffffff;
  color: #1a1a1a;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-btn:hover {
  background: #f8f8f8;
  border-color: #fbbf24;
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  font-weight: 600;
}

/* 预设区域 */
.presets-section {
  margin: 24px auto;
  max-width: 800px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.presets-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .presets-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.preset-card {
  background: #ffffff;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
}

.preset-card:hover {
  transform: translateY(-2px);
  border-color: #fbbf24;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.preset-card.preset-active {
  background: #fbbf24;
  border-color: #fbbf24;
  color: #1a1a1a;
}

.preset-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.preset-content {
  flex: 1;
}

.preset-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.preset-desc {
  font-size: 12px;
  color: #666666;
  margin: 0 0 8px 0;
}

.preset-params {
  font-size: 10px;
  color: #999999;
  opacity: 0.8;
  font-weight: 500;
}

/* 结果卡片 */
.result-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 32px;
  margin: 32px auto;
  max-width: 800px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: none;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.result-icon {
  font-size: 32px;
}

.result-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.result-count {
  font-size: 14px;
  color: #666666;
  margin: 4px 0 0 0;
}

.result-content {
  background: #f8f8f8;
  border-radius: 12px;
  padding: 24px;
  border: none;
}

.result-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #1a1a1a;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  width: 95%;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 16px 32px rgba(0, 0, 0, 0.15);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666666;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #1a1a1a;
}

.modal-body {
  flex: 1;
  padding: 16px 24px 24px;
  overflow-y: auto;
  min-height: 0;
}

/* 搜索框样式 */
.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
}

/* 画师统计 */
.artist-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666666;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.stats-info {
  flex: 1;
}

.stats-controls {
  flex-shrink: 0;
  margin-left: 16px;
}

.pagination-toggle {
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-toggle:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination-toggle.active {
  background: #fbbf24;
  border-color: #f59e0b;
  color: #ffffff;
}

/* 排序控件 */
.sort-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.sort-label {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.sort-buttons {
  display: flex;
  gap: 8px;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.sort-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.sort-btn.active {
  background: #fbbf24;
  border-color: #f59e0b;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(251, 191, 36, 0.2);
}

.sort-icon {
  font-size: 12px;
  font-weight: bold;
  margin-left: 2px;
}

/* 作品数筛选控件 */
.post-count-filter {
  background: #ffffff;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
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
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.filter-toggle input:checked + .toggle-slider {
  background-color: #fbbf24;
}

.filter-toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
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

.filter-label, .filter-unit {
  font-size: 14px;
  color: #666666;
}

.post-count-input {
  width: 100px;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  transition: border-color 0.2s ease;
}

.post-count-input:focus {
  outline: none;
  border-color: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
}

.post-count-input:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
}

.filter-hint {
  font-size: 12px;
  color: #f59e0b;
  background: #fffbeb;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #666666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top: 2px solid #fbbf24;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 画师列表 */
.artist-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
}

/* 优化模态框滚动条 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 画师卡片 */
.artist-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-height: 140px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.artist-card:hover {
  background: #ffffff;
  border-color: #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
  transform: translateY(-2px);
  z-index: 1;
}

/* 首字母徽章 */
.artist-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  margin-bottom: 12px;
}

/* 画师信息区域 */
.artist-info {
  flex: 1;
  text-align: center;
  width: 100%;
  margin-bottom: 8px;
}

.artist-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-aliases {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.3;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 作品统计区域 */
.artist-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.post-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.count-number {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.count-label {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 复制按钮 */
.copy-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.copy-btn:hover {
  background: rgba(251, 191, 36, 0.1);
  opacity: 1;
  transform: scale(1.1);
}

/* 画师详情模态框 */
.artist-detail-modal {
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 16px 32px rgba(0, 0, 0, 0.15);
  animation: modalSlideIn 0.3s ease-out;
}

.artist-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.artist-detail-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.artist-detail-body {
  padding: 20px 24px 24px;
  max-height: calc(80vh - 100px);
  overflow-y: auto;
}

.artist-detail-section {
  margin-bottom: 24px;
}

.artist-detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #fbbf24;
}

.name-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.name-item:hover {
  background: #e9ecef;
}

.name-item:last-child {
  margin-bottom: 0;
}

.name-text {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
  flex: 1;
  word-break: break-all;
}

.copy-name-btn {
  background: #fbbf24;
  border: none;
  color: #ffffff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
  flex-shrink: 0;
}

.copy-name-btn:hover {
  background: #f59e0b;
  transform: scale(1.05);
}

.aliases-list {
  max-height: 200px;
  overflow-y: auto;
}

.aliases-list::-webkit-scrollbar {
  width: 4px;
}

.aliases-list::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.aliases-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.stats-display {
  display: flex;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 12px;
  color: #ffffff;
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: #666666;
  font-size: 14px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-top: 16px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 40px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  max-width: 300px;
  margin: 0 auto;
}

/* 历史记录列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: #f8f8f8;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.history-item:hover {
  background: #ffffff;
  border-color: #fbbf24;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-time {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
}

.history-params {
  font-size: 11px;
  color: #999999;
  background: rgba(251, 191, 36, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.history-result {
  font-size: 13px;
  color: #1a1a1a;
  line-height: 1.4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* 分页控件样式 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 16px 0;
}

.page-btn {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #fbbf24;
  border-color: #fbbf24;
  color: #1a1a1a;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
  color: #999999;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 32px;
  text-align: center;
}

.page-number:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #fbbf24;
}

.page-number.active {
  background: #fbbf24;
  border-color: #fbbf24;
  color: #1a1a1a;
  font-weight: 600;
}

.page-number.disabled {
  cursor: default;
  color: #999999;
}

.page-number.disabled:hover {
  background: #ffffff;
  border-color: #e5e5e5;
}

/* 页面跳转输入框样式 */
.page-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.page-jump-label {
  font-size: 14px;
  color: #666666;
  font-weight: 500;
}

.page-jump-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.page-jump-input:focus {
  outline: none;
  border-color: #fbbf24;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.1);
}

.page-jump-total {
  font-size: 14px;
  color: #666666;
}

.page-jump-btn {
  padding: 6px 12px;
  background: #fbbf24;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-jump-btn:hover {
  background: #f59e0b;
  transform: translateY(-1px);
}

.page-jump-btn:active {
  transform: translateY(0);
}

/* 历史记录统计 */
.history-stats {
  font-size: 14px;
  color: #666666;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .top-nav {
    position: static;
    justify-content: center;
    margin-bottom: 24px;
  }
  
  .modal-content {
    width: 95%;
    max-width: none;
    margin: 10px;
    height: 95vh;
  }
  
  .artist-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .artist-card {
    min-height: 120px;
    padding: 12px 8px;
  }
  
  .artist-avatar {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin-bottom: 8px;
  }
  
  .artist-stats {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .stats-controls {
    margin-left: 0;
  }
  
  .sort-controls {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .sort-buttons {
    justify-content: center;
  }
  
  .artist-card {
    padding: 12px 16px;
    border-right: none !important;
  }
  
  .artist-avatar {
    width: 36px;
    height: 36px;
    font-size: 16px;
    margin-right: 10px;
  }
  
  .artist-name {
    font-size: 15px;
  }
  
  .artist-aliases {
    font-size: 12px;
  }
  
  .count-number {
    font-size: 16px;
  }
  
  .count-label {
    font-size: 10px;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .page-numbers {
    flex-wrap: wrap;
  }
  
  .page-btn {
    padding: 6px 8px;
    font-size: 12px;
  }
  
  .page-number {
    padding: 4px 6px;
    font-size: 12px;
    min-width: 24px;
  }
}

/* Toast通知系统样式 */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast-notification {
  min-width: 320px;
  max-width: 420px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.08),
    0 16px 32px rgba(0, 0, 0, 0.06);
  border: 2px solid;
  overflow: hidden;
  animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  pointer-events: auto;
  position: relative;
}

.toast-success {
  border-color: #22c55e;
}

.toast-error {
  border-color: #ef4444;
}

.toast-info {
  border-color: #3b82f6;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  position: relative;
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.toast-message {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #666666;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1a1a1a;
}

.toast-progress {
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  transition: width 0.1s linear;
  border-radius: 0 2px 2px 0;
}

.toast-success .toast-progress-bar {
  background: #22c55e;
}

.toast-error .toast-progress-bar {
  background: #ef4444;
}

.toast-info .toast-progress-bar {
  background: #3b82f6;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* 移动端Toast适配 */
@media (max-width: 768px) {
  .toast-container {
    top: 16px;
    right: 16px;
    left: 16px;
  }
  
  .toast-notification {
    min-width: auto;
    max-width: none;
  }
  
  .toast-content {
    padding: 14px 16px;
  }
  
  .toast-message {
    font-size: 13px;
  }
  
  .toast-icon {
    font-size: 18px;
  }
}
</style> 