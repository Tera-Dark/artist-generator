import { ref, shallowRef } from 'vue'
import {
  createArchive,
  makeEntry,
  mergeEntries,
  readArchive,
  MAX_FAVORITES,
  MAX_HISTORY,
  type SavedMode,
  type SavedSource,
  type SavedString,
} from '@/core/dataFormat'
import {
  deleteUserEntry,
  putUserEntry,
  readUserData,
  replaceUserData,
} from '@/data/localDatabase'

const history = shallowRef<SavedString[]>([])
const favorites = shallowRef<SavedString[]>([])
const storageStatus = ref<'loading' | 'ready' | 'unavailable'>('loading')
let initialization: Promise<void> | null = null
let lastMutation: Promise<unknown> = Promise.resolve()

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const current = lastMutation.then(task, task)
  lastMutation = current.catch(() => {})
  return current
}

function init() {
  initialization ??= (async () => {
    try {
      const loaded = await readUserData()
      history.value = mergeEntries([], loaded.history, MAX_HISTORY)
      favorites.value = mergeEntries([], loaded.favorites, MAX_FAVORITES, true)
      storageStatus.value = 'ready'
    } catch {
      storageStatus.value = 'unavailable'
    }
  })()
  return initialization
}

function recordHistory(text: string, names: string[], mode: SavedMode, source: SavedSource = 'generated') {
  return serialize(async () => {
    await init()
    const entry = makeEntry(text, names, mode, source)
    if (storageStatus.value === 'ready') {
      try {
        await putUserEntry('history', entry)
        const removed = history.value[MAX_HISTORY - 1]
        if (removed) await deleteUserEntry('history', removed.id)
      } catch {
        storageStatus.value = 'unavailable'
      }
    }
    // Don't announce a saved record in the UI before IndexedDB has committed it.
    history.value = mergeEntries(history.value, [entry], MAX_HISTORY)
    return entry
  })
}

function toggleFavorite(text: string, names: string[], mode: SavedMode, source: SavedSource) {
  return serialize(async () => {
    await init()
    const existing = favorites.value.find((item) => item.text.trim() === text.trim())
    if (existing) {
      if (storageStatus.value === 'ready') {
        try { await deleteUserEntry('favorites', existing.id) } catch { storageStatus.value = 'unavailable' }
      }
      favorites.value = favorites.value.filter((item) => item.id !== existing.id)
      return false
    }

    if (favorites.value.length >= MAX_FAVORITES) throw new Error('收藏已达到 1,000 条上限，请先整理或导出。')
    const entry = makeEntry(text, names, mode, source)
    if (storageStatus.value === 'ready') {
      try { await putUserEntry('favorites', entry) } catch { storageStatus.value = 'unavailable' }
    }
    favorites.value = mergeEntries(favorites.value, [entry], MAX_FAVORITES, true)
    return true
  })
}

function removeSaved(store: 'history' | 'favorites', id: string) {
  return serialize(async () => {
    await init()
    if (storageStatus.value === 'ready') {
      try { await deleteUserEntry(store, id) } catch { storageStatus.value = 'unavailable' }
    }
    if (store === 'history') history.value = history.value.filter((item) => item.id !== id)
    else favorites.value = favorites.value.filter((item) => item.id !== id)
  })
}

function importArchive(raw: unknown) {
  const archive = readArchive(raw) // Reject the entire file before touching local records.
  return serialize(async () => {
    await init()
    if (storageStatus.value !== 'ready') throw new Error('浏览器本地数据库不可用，无法安全导入。')

    const nextHistory = mergeEntries(history.value, archive.history, MAX_HISTORY)
    const nextFavorites = mergeEntries(favorites.value, archive.favorites, MAX_FAVORITES, true)
    await replaceUserData(nextHistory, nextFavorites) // One IndexedDB transaction; all or nothing.
    const existingHistory = new Set(history.value.map((item) => item.id))
    const existingFavorites = new Set(favorites.value.map((item) => item.text.trim()))
    const imported = {
      history: nextHistory.filter((item) => !existingHistory.has(item.id)).length,
      favorites: nextFavorites.filter((item) => !existingFavorites.has(item.text.trim())).length,
    }
    history.value = nextHistory
    favorites.value = nextFavorites
    return imported
  })
}

function exportArchive() {
  return createArchive(history.value, favorites.value)
}

export function useVault() {
  return {
    history,
    favorites,
    storageStatus,
    init,
    recordHistory,
    toggleFavorite,
    removeSaved,
    importArchive,
    exportArchive,
  }
}
