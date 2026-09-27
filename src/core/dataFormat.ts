export const ARCHIVE_FORMAT = 'artist-generator.local-data'
export const ARCHIVE_VERSION = 1
export const MAX_HISTORY = 250
export const MAX_FAVORITES = 1000
export const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024 // Keep imports bounded while accepting large local exports.

export type SavedMode = 'pure' | 'standard' | 'creative' | 'nai' | 'mixed'
export type SavedSource = 'generated' | 'edited' | 'imported'

export interface SavedString {
  id: string
  text: string
  names: string[]
  mode: SavedMode
  source: SavedSource
  createdAt: number
}

export interface DataArchive {
  format: typeof ARCHIVE_FORMAT
  version: typeof ARCHIVE_VERSION
  exportedAt: string
  history: SavedString[]
  favorites: SavedString[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertEntry(raw: unknown, label: string): asserts raw is SavedString {
  if (!isObject(raw) ||
    typeof raw.id !== 'string' || !/^[\w-]{8,80}$/.test(raw.id) ||
    typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 20000 ||
    !Array.isArray(raw.names) || raw.names.length > 200 ||
    !raw.names.every((name: unknown) => typeof name === 'string' && name.length > 0 && name.length <= 300) ||
    !['pure', 'standard', 'creative', 'nai', 'mixed'].includes(raw.mode as string) ||
    !['generated', 'edited', 'imported'].includes(raw.source as string) ||
    typeof raw.createdAt !== 'number' || !Number.isSafeInteger(raw.createdAt) || raw.createdAt < 0 || raw.createdAt > 8_640_000_000_000_000 ||
    Object.keys(raw).some((key) => !['id', 'text', 'names', 'mode', 'source', 'createdAt'].includes(key))
  ) throw new Error(`${label}有无效记录；仅接受符合 v1 规范的画师串。`)
}

export function readArchive(raw: unknown): DataArchive {
  if (!isObject(raw) || raw.format !== ARCHIVE_FORMAT || raw.version !== ARCHIVE_VERSION) {
    throw new Error('不是支持的画师串数据文件（需要 artist-generator.local-data v1）。')
  }
  if (typeof raw.exportedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw.exportedAt) ||
    !Number.isFinite(Date.parse(raw.exportedAt)) ||
    !Array.isArray(raw.history) || !Array.isArray(raw.favorites) ||
    raw.history.length > 5000 || raw.favorites.length > 5000 ||
    Object.keys(raw).some((key) => !['format', 'version', 'exportedAt', 'history', 'favorites'].includes(key))
  ) throw new Error('文件结构不符合 v1 规范，或记录数量过大。')
  raw.history.forEach((item: unknown, index: number) => assertEntry(item, `历史第 ${index + 1} 项`))
  raw.favorites.forEach((item: unknown, index: number) => assertEntry(item, `收藏第 ${index + 1} 项`))
  return raw as unknown as DataArchive
}

export function createArchive(history: SavedString[], favorites: SavedString[]): DataArchive {
  return {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    history,
    favorites,
  }
}

export function makeEntry(
  text: string,
  names: string[],
  mode: SavedMode,
  source: SavedSource,
): SavedString {
  // Vue refs expose reactive array proxies; IndexedDB cannot structured-clone them.
  return { id: crypto.randomUUID(), text, names: Array.from(names), mode, source, createdAt: Date.now() }
}

export function mergeEntries(current: SavedString[], incoming: SavedString[], limit: number, dedupeText = false) {
  const byId = new Map<string, SavedString>()
  const texts = new Set<string>()
  for (const item of [...current, ...incoming]) {
    if (byId.has(item.id) || (dedupeText && texts.has(item.text.trim()))) continue
    byId.set(item.id, item)
    texts.add(item.text.trim())
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
}
