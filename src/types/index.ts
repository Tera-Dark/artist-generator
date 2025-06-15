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

// 画师数据类型
export interface ArtistData {
  artists: string[]
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