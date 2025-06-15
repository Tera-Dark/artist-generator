import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  PresetConfig, 
  GenerationResult, 
  GenerationConfig, 
  ArtistData,
  ToastMessage 
} from '@/types'

export const useGeneratorStore = defineStore('generator', () => {
  // 状态
  const isLoading = ref(false)
  const selectedPreset = ref<string | null>(null)
  const showAdvancedSettings = ref(false)
  const showArtistLibrary = ref(false)
  const currentResult = ref<GenerationResult | null>(null)
  const artists = ref<string[]>([])
  const toasts = ref<ToastMessage[]>([])

  // 预设配置
  const presets = ref<PresetConfig[]>([
    {
      id: 'random',
      name: '🎲 随机探索',
      icon: '🎲',
      description: '适合尝试新画师',
      config: { 
        countRange: [1, 3], 
        weightRange: [0.8, 1.2] 
      },
      color: 'blue',
      popularity: 1
    },
    {
      id: 'precise',
      name: '🎯 精准控制',
      icon: '🎯',
      description: '平衡的画师组合',
      config: { 
        countRange: [2, 4], 
        weightRange: [1.0, 1.5] 
      },
      color: 'green',
      popularity: 2
    },
    {
      id: 'creative',
      name: '✨ 创意爆发',
      icon: '✨',
      description: '强烈风格混合',
      config: { 
        countRange: [3, 6], 
        weightRange: [1.2, 1.8] 
      },
      color: 'purple',
      popularity: 3
    }
  ])

  // 计算属性
  const currentPreset = computed(() => 
    presets.value.find(p => p.id === selectedPreset.value)
  )

  const canGenerate = computed(() => 
    artists.value.length > 0 && selectedPreset.value !== null
  )

  // 动作
  const loadArtists = async (): Promise<void> => {
    try {
      isLoading.value = true
      const response = await fetch('/data/artists.json')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data: ArtistData = await response.json()
      artists.value = data.artists
      
    } catch (error) {
      console.error('加载失败:', error)
      artists.value = []
    } finally {
      isLoading.value = false
    }
  }

  const generateArtists = (): GenerationResult | null => {
    if (!canGenerate.value || !currentPreset.value) return null

    const config = currentPreset.value.config
    const count = Math.floor(
      Math.random() * (config.countRange[1] - config.countRange[0] + 1)
    ) + config.countRange[0]

    const selectedArtists: string[] = []
    const selectedWeights: number[] = []
    const usedIndices = new Set<number>()

    for (let i = 0; i < count && usedIndices.size < artists.value.length; i++) {
      let randomIndex: number
      
      do {
        randomIndex = Math.floor(Math.random() * artists.value.length)
      } while (usedIndices.has(randomIndex))

      usedIndices.add(randomIndex)
      selectedArtists.push(artists.value[randomIndex])
      
      const weight = parseFloat(
        (Math.random() * (config.weightRange[1] - config.weightRange[0]) + 
         config.weightRange[0]).toFixed(1)
      )
      selectedWeights.push(weight)
    }

    const formatted = selectedArtists
      .map((artist, index) => `(${artist}:${selectedWeights[index]})`)
      .join(', ')

    const result: GenerationResult = {
      id: `gen_${Date.now()}`,
      artists: selectedArtists,
      weights: selectedWeights,
      formatted,
      timestamp: new Date(),
      presetUsed: selectedPreset.value || undefined
    }

    currentResult.value = result
    return result
  }

  const copyResult = async (): Promise<boolean> => {
    if (!currentResult.value) return false

    try {
      await navigator.clipboard.writeText(currentResult.value.formatted)
      return true
    } catch {
      return false
    }
  }

  return {
    // 状态
    isLoading,
    selectedPreset,
    showAdvancedSettings,
    showArtistLibrary,
    currentResult,
    artists,
    toasts,
    presets,

    // 计算属性
    currentPreset,
    canGenerate,

    // 动作
    loadArtists,
    generateArtists,
    copyResult
  }
}) 