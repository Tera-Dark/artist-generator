// 预设配置类型
export interface PresetConfig {
  id: string
  name: string
  icon: string
  description: string
  config: {
    countRange: [number, number]
    weightRange: [number, number]
  }
  color: string
  popularity: number
}

// 生成结果类型
export interface GenerationResult {
  id: string
  artists: string[]
  weights: number[]
  formatted: string
  timestamp: Date
  presetUsed?: string
}

// 用户偏好类型
export interface UserPreferences {
  favoritePresets: string[]
  customPresets: PresetConfig[]
  recentGenerations: GenerationResult[]
  settings: {
    enableHapticFeedback: boolean
    enableVoiceInput: boolean
    preferredTheme: 'light' | 'dark' | 'auto'
    enableAnimations: boolean
  }
}

// 画师对象类型
export interface Artist {
  name: string           // 主名称
  other_names: string[]  // 别名数组
  post_count: number     // 作品数量
}

// 画师数据类型
export interface ArtistData {
  artists: Artist[]
}

// 搜索结果类型
export interface SearchResult {
  artists: Artist[]      // 匹配的画师
  total: number         // 总匹配数
  query: string         // 搜索查询
}

// 格式化显示类型
export interface FormattedArtist {
  displayName: string   // 格式化后的显示名称
  originalArtist: Artist // 原始画师对象
}

// 生成配置类型
export interface GenerationConfig {
  countRange: [number, number]
  weightRange: [number, number]
  avoidDuplicates: boolean
  customArtists?: string[]
}

// Toast通知类型
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

// 应用状态类型
export interface AppState {
  isLoading: boolean
  selectedPreset: string | null
  customConfig: GenerationConfig
  showAdvancedSettings: boolean
  showArtistLibrary: boolean
  currentResult: GenerationResult | null
  toasts: ToastMessage[]
} 