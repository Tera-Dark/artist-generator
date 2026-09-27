import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SavedString } from '@/core/dataFormat'

import type { ImageQuality } from '@/composables/usePreferences'

export interface PreviewVariant {
  url: string
  width: number
  height: number
}

export interface PreviewRecord {
  id: string // canonical artist tag
  postId: number | null
  url: string | null // Original 180px field remains for old cached entries.
  variants?: Partial<Record<ImageQuality, PreviewVariant>>
  fetchedAt: number
}

interface LocalDB extends DBSchema {
  history: { key: string; value: SavedString }
  favorites: { key: string; value: SavedString }
  previews: { key: string; value: PreviewRecord }
}

type UserStore = 'history' | 'favorites'
let pending: Promise<IDBPDatabase<LocalDB>> | null = null

function database() {
  pending ??= openDB<LocalDB>('artist-generator-v1', 1, {
    upgrade(db) {
      db.createObjectStore('history', { keyPath: 'id' })
      db.createObjectStore('favorites', { keyPath: 'id' })
      db.createObjectStore('previews', { keyPath: 'id' })
    },
  }).catch((error: unknown) => {
    pending = null
    throw error
  })
  return pending
}

export async function readUserData() {
  const db = await database()
  const [history, favorites] = await Promise.all([db.getAll('history'), db.getAll('favorites')])
  return { history, favorites }
}

export async function putUserEntry(store: UserStore, entry: SavedString) {
  const db = await database()
  const tx = db.transaction(store, 'readwrite')
  await tx.store.put(entry)
  await tx.done
}

export async function deleteUserEntry(store: UserStore, id: string) {
  const db = await database()
  const tx = db.transaction(store, 'readwrite')
  await tx.store.delete(id)
  await tx.done
}

export async function replaceUserData(history: SavedString[], favorites: SavedString[]) {
  const db = await database()
  const tx = db.transaction(['history', 'favorites'], 'readwrite')
  const historyStore = tx.objectStore('history')
  const favoriteStore = tx.objectStore('favorites')
  await Promise.all([historyStore.clear(), favoriteStore.clear()])
  await Promise.all([
    ...history.map((item) => historyStore.put(item)),
    ...favorites.map((item) => favoriteStore.put(item)),
  ])
  await tx.done
}

export async function getPreviewRecord(id: string) {
  const db = await database()
  return db.get('previews', id)
}

export async function putPreviewRecord(record: PreviewRecord) {
  const db = await database()
  const tx = db.transaction('previews', 'readwrite')
  await tx.store.put(record)
  await tx.done
}

export async function clearPreviewRecords() {
  const db = await database()
  const tx = db.transaction('previews', 'readwrite')
  await tx.store.clear()
  await tx.done
}
