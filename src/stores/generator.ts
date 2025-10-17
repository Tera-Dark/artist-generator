import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Artist,
  ToastMessage,
} from '@/types'

export const useGeneratorStore = defineStore('generator', () => {
  // 状态
  const isLoading = ref(false)
  const artistsLoadedAt = ref<number | null>(null)
  const artists = ref<Artist[]>([])
  const toasts = ref<ToastMessage[]>([])

  // 日志：仅开发环境输出，生产环境静默
  const devLog = (...args: any[]) => { if (import.meta.env.DEV) console.log(...args) }
  const devWarn = (...args: any[]) => { if (import.meta.env.DEV) console.warn(...args) }
  const devError = (...args: any[]) => { if (import.meta.env.DEV) console.error(...args) }

  // 内部：加载中的Promise，避免重复并发加载
  let pendingLoad: Promise<void> | null = null
  const ARTISTS_TTL_MS = 15 * 60 * 1000 // 15分钟缓存TTL

  // 计算属性（精简后无需）

  // 动作
  const loadArtists = async (opts?: { force?: boolean }): Promise<void> => {
    const force = !!opts?.force
    // TTL 缓存：在有效期内且非强制刷新则跳过
    if (!force && artists.value.length > 0 && artistsLoadedAt.value) {
      const fresh = Date.now() - artistsLoadedAt.value < ARTISTS_TTL_MS
      if (fresh) return
    }
    // 正在加载时复用同一个Promise
    if (pendingLoad) return pendingLoad

    pendingLoad = (async () => {
    try {
      isLoading.value = true
      devLog('开始加载画师数据...')

      // 基于 BASE_URL 计算路径，兼容开发与构建
      const base = (import.meta as any)?.env?.BASE_URL || '/'
      const normalizedBase = String(base).endsWith('/') ? String(base) : String(base) + '/'
      // 路径收敛：优先使用 BASE_URL 下的 public 资源，开发环境保留一个根路径回退
      const primaryPath = normalizedBase + 'data/artists.json'
      const fallbackDevPath = '/data/artists.json'
      const possiblePaths = Array.from(new Set([primaryPath, fallbackDevPath]))

      let loadSuccess = false

      for (const path of possiblePaths) {
        try {
          devLog(`尝试加载路径: ${path}`)
          const response = await fetch(path)
          devLog(`响应状态: ${response.status} ${response.statusText}`)

          if (response.ok) {
            const data = await response.json()
            // 新格式：直接是Artist数组
            if (Array.isArray(data) && data.length > 0) {
              artists.value = data as Artist[]
              devLog(`✅ 成功加载 ${artists.value.length} 个画师 (路径: ${path})`)
              loadSuccess = true
              // 成功提示
              addToast('success', '画师库已加载', `共 ${artists.value.length} 个画师`, 1500)
              break
            }
            // 旧格式兼容：包装在artists属性中
            else if (
              data &&
              data.artists &&
              Array.isArray(data.artists) &&
              data.artists.length > 0
            ) {
              artists.value = data.artists
              devLog(`✅ 成功加载 ${artists.value.length} 个画师 (旧格式兼容，路径: ${path})`)
              loadSuccess = true
              addToast('success', '画师库已加载', `共 ${artists.value.length} 个画师`, 1500)
              break
            } else {
              devWarn(`⚠️ 数据格式不正确 (路径: ${path})`, data)
            }
          }
        } catch (pathError) {
          devWarn(`❌ 路径 ${path} 加载失败:`, pathError)
        }
      }

      if (!loadSuccess) {
        throw new Error('所有路径都加载失败')
      }
    } catch (error) {
      devError('❌ 画师数据加载完全失败:', error)
      devWarn('🔄 使用测试数据')
      artists.value = [
        { name: 'test_artist_1', other_names: ['test1'], post_count: 100 },
        { name: 'test_artist_2', other_names: ['test2'], post_count: 200 },
        { name: 'test_artist_3', other_names: ['test3'], post_count: 300 },
      ]
      addToast('warning', '加载失败，使用测试数据', '未能获取远程画师数据', 2000)
    } finally {
      isLoading.value = false
      devLog(`最终加载结果: ${artists.value.length} 个画师`)
      artistsLoadedAt.value = Date.now()
    }
    })()

    try {
      await pendingLoad
    } finally {
      pendingLoad = null
    }
  }

  // Toast：新增/移除
  const addToast = (type: ToastMessage['type'], title: string, message: string, duration = 2000): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const t: ToastMessage = { id, type, title, message, duration }
    toasts.value.push(t)
    if (duration && duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    return id
  }
  const removeToast = (id: string) => {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx >= 0) toasts.value.splice(idx, 1)
  }

  // 搜索画师功能
  const searchArtists = (query: string): Artist[] => {
    if (!query.trim()) return []

    const lowerQuery = query.toLowerCase().trim()

    return artists.value
      .filter((artist) => {
        // 主名称匹配
        if (artist.name.toLowerCase().includes(lowerQuery)) return true
        // 别名匹配
        return (artist.other_names || []).some((name) => name.toLowerCase().includes(lowerQuery))
      })
      .sort((a, b) => (b.post_count || 0) - (a.post_count || 0)) // 按作品数量降序排列
  }

  // 格式化画师显示
  // 保留最小化的 store，不包含未使用的格式化函数

  return {
    // 状态
    isLoading,
    artistsLoadedAt,
    artists,
    toasts,

    // 动作
    loadArtists,
    addToast,
    removeToast,
    searchArtists,
  }
})
