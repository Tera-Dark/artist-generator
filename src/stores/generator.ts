import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  PresetConfig, 
  GenerationResult, 
  GenerationConfig, 
  ArtistData,
  Artist,
  ToastMessage 
} from '@/types'

export const useGeneratorStore = defineStore('generator', () => {
  // 状态
  const isLoading = ref(false)
  const selectedPreset = ref<string | null>(null)
  const showAdvancedSettings = ref(false)
  const showArtistLibrary = ref(false)
  const currentResult = ref<GenerationResult | null>(null)
  const artists = ref<Artist[]>([])
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
      console.log('开始加载画师数据...')
      
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
      // 使用画师的主名称
      selectedArtists.push(artists.value[randomIndex].name)
      
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

  // 搜索画师功能
  const searchArtists = (query: string): Artist[] => {
    if (!query.trim()) return []
    
    const lowerQuery = query.toLowerCase().trim()
    
    return artists.value
      .filter(artist => {
        // 主名称匹配
        if (artist.name.toLowerCase().includes(lowerQuery)) return true
        // 别名匹配
        return artist.other_names.some(name => 
          name.toLowerCase().includes(lowerQuery)
        )
      })
      .sort((a, b) => b.post_count - a.post_count) // 按作品数量降序排列
  }

  // 格式化画师显示
  const formatArtist = (artist: Artist): string => {
    const { name, other_names, post_count } = artist
    
    let otherNamesStr = ''
    if (other_names.length > 0) {
      if (other_names.length <= 4) {
        otherNamesStr = other_names.join(',')
      } else {
        const shown = other_names.slice(0, 4).join(',')
        const remaining = other_names.length - 4
        otherNamesStr = `${shown}...等${remaining}个别名`
      }
    }
    
    return `${name} - ${otherNamesStr} - ${post_count}`
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
    copyResult,
    searchArtists,
    formatArtist
  }
}) 