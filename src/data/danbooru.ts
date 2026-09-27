import { clearPreviewRecords, getPreviewRecord, putPreviewRecord, type PreviewRecord, type PreviewVariant } from './localDatabase'
import type { ImageQuality } from '@/composables/usePreferences'

const API_INTERVAL_MS = 1100 // Keep metadata requests near one sustained read per second.
const META_TTL_MS = 24 * 60 * 60 * 1000
const EMPTY_TTL_MS = 6 * 60 * 60 * 1000
const IMAGE_CACHE = 'artist-generator-thumbnails-v1'
const MAX_CACHED_IMAGES = 80
const MAX_CACHE_BYTES = 40_000_000
const MAX_VARIANT_BYTES: Record<ImageQuality, number> = { low: 500_000, balanced: 900_000, high: 2_000_000 }
const CDN_IMAGE = /^https:\/\/cdn\.donmai\.us\/(180x180|360x360|720x720)\/([a-f0-9]{2})\/([a-f0-9]{2})\/([a-f0-9]{32})\.(?:jpg|jpeg|png|webp|gif)$/i
const sizeOf: Record<ImageQuality, string> = { low: '180x180', balanced: '360x360', high: '720x720' }

interface PreviewTask {
  signal: AbortSignal
  run: () => Promise<PreviewRecord>
  resolve: (value: PreviewRecord) => void
  reject: (reason: unknown) => void
}

let active = 0
let nextStart = 0
let timer: ReturnType<typeof setTimeout> | null = null
const tasks: PreviewTask[] = []
const backgroundRefreshes = new Set<string>()

function drain() {
  if (timer || active >= 2 || !tasks.length) return
  const wait = Math.max(0, nextStart - Date.now())
  if (wait > 0) {
    timer = setTimeout(() => { timer = null; drain() }, wait)
    return
  }
  const task = tasks.shift()!
  if (task.signal.aborted) {
    task.reject(new DOMException('Cancelled', 'AbortError'))
    drain()
    return
  }
  active++
  nextStart = Date.now() + API_INTERVAL_MS
  task.run().then(task.resolve, task.reject).finally(() => { active--; drain() })
  drain()
}

function enqueue(signal: AbortSignal, run: PreviewTask['run']): Promise<PreviewRecord> {
  return new Promise((resolve, reject) => { tasks.push({ signal, run, resolve, reject }); drain() })
}

function imageMatch(url: unknown) {
  if (typeof url !== 'string') return null
  const match = CDN_IMAGE.exec(url)
  if (!match || match[2]?.toLowerCase() !== match[4]?.slice(0, 2).toLowerCase() ||
    match[3]?.toLowerCase() !== match[4]?.slice(2, 4).toLowerCase()) return null
  return match
}

function verifiedVariant(raw: unknown, quality: ImageQuality, hash: string): PreviewVariant | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const item = raw as Partial<PreviewVariant>
  const match = imageMatch(item.url)
  const limit = Number(sizeOf[quality].slice(0, 3))
  if (!match || match[1] !== sizeOf[quality] || match[4]?.toLowerCase() !== hash.toLowerCase() ||
    !Number.isSafeInteger(item.width) || !Number.isSafeInteger(item.height) ||
    !item.width || !item.height || item.width > limit || item.height > limit) return undefined
  return { url: item.url!, width: item.width, height: item.height }
}

function artworkFromResponse(post: Record<string, unknown>, bridge: boolean) {
  const id = bridge ? post.postId : post.id
  const image = bridge ? post.url : post.preview_file_url
  const low = imageMatch(image)
  if (!Number.isSafeInteger(id) || (id as number) <= 0 || !low || low[1] !== '180x180') {
    return { postId: null, url: null, variants: {} }
  }
  const variants: PreviewRecord['variants'] = {}
  if (bridge && post.variants && typeof post.variants === 'object') {
    for (const quality of ['low', 'balanced', 'high'] as const) {
      const variant = verifiedVariant((post.variants as Record<string, unknown>)[quality], quality, low[4]!)
      if (variant) variants[quality] = variant
    }
  }
  if (!bridge && post.media_asset && typeof post.media_asset === 'object') {
    const entries = (post.media_asset as Record<string, unknown>).variants
    if (Array.isArray(entries)) {
      for (const quality of ['low', 'balanced', 'high'] as const) {
        const candidate = entries.find((item) => item?.type === sizeOf[quality])
        const variant = verifiedVariant(candidate, quality, low[4]!)
        if (variant) variants[quality] = variant
      }
    }
  }
  if (!variants.low) variants.low = { url: image as string, width: 180, height: 180 }
  return { postId: id as number, url: image as string, variants }
}

async function fetchPreview(name: string, signal: AbortSignal): Promise<PreviewRecord> {
  let result: ReturnType<typeof artworkFromResponse> | undefined
  try {
    const bridge = await fetch(`${import.meta.env.BASE_URL}api/danbooru?${new URLSearchParams({ artist: name })}`, { signal })
    if (bridge.ok) {
      const data: unknown = await bridge.json()
      if (data && typeof data === 'object' && 'postId' in data && 'url' in data) {
        result = artworkFromResponse(data as Record<string, unknown>, true)
      }
    }
  } catch (error) {
    if (signal.aborted) throw error
  }
  // Pure static hosting has no same-origin bridge. The public API may fail CORS/anti-bot.
  if (!result) {
    const query = new URLSearchParams({ tags: `${name} rating:g`, limit: '1', only: 'id,rating,preview_file_url,media_asset' })
    const response = await fetch(`https://danbooru.donmai.us/posts.json?${query}`, { signal })
    if (!response.ok) throw new Error(`Danbooru HTTP ${response.status}`)
    const data: unknown = await response.json()
    if (!Array.isArray(data)) throw new Error('Danbooru returned invalid data')
    const post = data[0]
    result = post?.rating === 'g' ? artworkFromResponse(post, false) : { postId: null, url: null, variants: {} }
  }
  const record: PreviewRecord = { id: name, ...result, fetchedAt: Date.now() }
  try { await putPreviewRecord(record) } catch { /* Browsing still works without IndexedDB. */ }
  return record
}

/** Metadata is cached independently of the selected resolution. */
export async function getArtistPreview(name: string, signal: AbortSignal, quality: ImageQuality = 'low'): Promise<PreviewRecord> {
  let cached: PreviewRecord | undefined
  try { cached = await getPreviewRecord(name) } catch { /* Private mode can block storage. */ }
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
  if (cached) {
    const ttl = cached.postId ? META_TTL_MS : EMPTY_TTL_MS
    const fresh = Date.now() - cached.fetchedAt < ttl || !navigator.onLine
    const legacy = quality !== 'low' && !!cached.url && !cached.variants && navigator.onLine
    if (fresh && !legacy) return cached
    if (cached.url && !legacy) {
      if (!backgroundRefreshes.has(name)) {
        backgroundRefreshes.add(name)
        const controller = new AbortController()
        void enqueue(controller.signal, () => fetchPreview(name, controller.signal))
          .catch(() => {}).finally(() => backgroundRefreshes.delete(name))
      }
      return cached
    }
    if (legacy) {
      try { return await enqueue(signal, () => fetchPreview(name, signal)) }
      catch { return cached }
    }
  }
  return enqueue(signal, () => fetchPreview(name, signal))
}

/** Preferred variant followed by lower-resolution fallbacks, all tied to one verified post. */
export function previewVariantCandidates(record: PreviewRecord, quality: ImageQuality) {
  const order: ImageQuality[] = quality === 'high' ? ['high', 'balanced', 'low']
    : quality === 'balanced' ? ['balanced', 'low'] : ['low']
  const candidates: (PreviewVariant & { quality: ImageQuality })[] = []
  const hash = imageMatch(record.url)?.[4]
  for (const candidate of order) {
    const variant = record.variants?.[candidate]
    if (variant && hash && verifiedVariant(variant, candidate, hash)) {
      candidates.push({ ...variant, quality: candidate })
    }
  }
  if (!candidates.some((item) => item.quality === 'low') && imageMatch(record.url)) {
    candidates.push({ url: record.url!, width: 180, height: 180, quality: 'low' })
  }
  return candidates
}

export function selectPreviewVariant(record: PreviewRecord, quality: ImageQuality) {
  return previewVariantCandidates(record, quality)[0] || null
}

async function trimImageCache(cache: Cache) {
  let bytes = 0
  let kept = 0
  const keys = [...await cache.keys()].reverse()
  for (const request of keys) {
    const response = await cache.match(request)
    const length = Number(response?.headers.get('Content-Length')) || 500_000 // Older entries lacked this header.
    if (kept >= MAX_CACHED_IMAGES || bytes + length > MAX_CACHE_BYTES) await cache.delete(request)
    else { kept++; bytes += length }
  }
}

/** Cache 180/360/720 variants separately with both a count and a byte budget. */
export async function getThumbnailSource(url: string, signal: AbortSignal): Promise<string> {
  const match = imageMatch(url)
  if (!match) throw new Error('Unexpected thumbnail URL')
  const quality: ImageQuality = match[1] === '720x720' ? 'high' : match[1] === '360x360' ? 'balanced' : 'low'
  let cache: Cache | undefined
  try {
    if ('caches' in window) {
      cache = await caches.open(IMAGE_CACHE)
      const cached = await cache.match(url)
      if (cached) return URL.createObjectURL(await cached.blob())
    }
  } catch { /* Some private modes disable Cache Storage. */ }

  try {
    let response: Response | undefined
    try {
      const bridge = await fetch(`${import.meta.env.BASE_URL}api/thumbnail?${new URLSearchParams({ url })}`, { signal })
      if (bridge.ok) response = bridge
    } catch (error) {
      if (signal.aborted) throw error
    }
    if (!response) response = await fetch(url, { mode: 'cors', signal })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Image unavailable')
    const blob = await response.blob()
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    if (blob.size <= MAX_VARIANT_BYTES[quality] && cache) {
      try {
        await cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type, 'Content-Length': String(blob.size) } }))
        await trimImageCache(cache)
      } catch { /* A quota failure must not block the picture. */ }
    }
    return URL.createObjectURL(blob)
  } catch (error) {
    if (signal.aborted) throw error
    return url // A plain <img> may still work when CORS disallows fetch.
  }
}

export async function clearArtworkCache() {
  await Promise.all([
    clearPreviewRecords(),
    'caches' in window ? caches.delete(IMAGE_CACHE) : Promise.resolve(false),
  ])
}
