// Optional read-only bridge for Vite dev/preview and Vercel deployments.
// Pure static hosts cannot run this; the browser tries Danbooru directly instead.

export class ProxyError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const USER_AGENT = 'ArtistGenerator/2.2 (https://github.com/Tera-Dark/artist-generator)'
const CDN_IMAGE = /^https:\/\/cdn\.donmai\.us\/(180x180|360x360|720x720)\/([a-f0-9]{2})\/([a-f0-9]{2})\/([a-f0-9]{32})\.(?:jpg|jpeg|png|webp|gif)$/i
const SIZES = { '180x180': 500_000, '360x360': 900_000, '720x720': 2_000_000 }
const QUALITY = { '180x180': 'low', '360x360': 'balanced', '720x720': 'high' }

function safeAsset(url, hash) {
  if (typeof url !== 'string') return null
  const matched = CDN_IMAGE.exec(url)
  if (!matched || matched[2].toLowerCase() !== matched[4].slice(0, 2).toLowerCase() ||
    matched[3].toLowerCase() !== matched[4].slice(2, 4).toLowerCase() ||
    (hash && matched[4].toLowerCase() !== hash.toLowerCase())) return null
  return matched
}

export async function latestArtwork(artist) {
  if (typeof artist !== 'string' || artist.length < 1 || artist.length > 200 || /[\s,\x00-\x1f]/.test(artist)) {
    throw new ProxyError(400, 'Invalid artist tag')
  }
  const params = new URLSearchParams({ tags: `${artist} rating:g`, limit: '1', only: 'id,rating,preview_file_url,image_width,image_height,media_asset' })
  const upstream = await fetch(`https://danbooru.donmai.us/posts.json?${params}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    redirect: 'error', // Never follow an upstream redirect to an unverified host.
    signal: AbortSignal.timeout(10000),
  })
  if (!upstream.ok) throw new ProxyError(upstream.status === 429 ? 429 : 502, 'Danbooru unavailable')
  const data = await upstream.json()
  if (!Array.isArray(data)) throw new ProxyError(502, 'Invalid Danbooru response')
  const post = data[0]
  if (!post || post.rating !== 'g' || !Number.isSafeInteger(post.id) || post.id <= 0) return { postId: null, url: null, variants: {} }
  const low = safeAsset(post.preview_file_url)
  if (!low || low[1] !== '180x180') return { postId: null, url: null, variants: {} }

  const variants = {}
  for (const item of Array.isArray(post.media_asset?.variants) ? post.media_asset.variants : []) {
    const match = safeAsset(item?.url, low[4])
    if (!match || item.type !== match[1] || !Number.isSafeInteger(item.width) || !Number.isSafeInteger(item.height) ||
      item.width < 1 || item.height < 1 || item.width > Number(item.type.slice(0, 3)) || item.height > Number(item.type.slice(0, 3))) continue
    variants[QUALITY[item.type]] = { url: item.url, width: item.width, height: item.height }
  }
  if (!variants.low) {
    const width = post.image_width, height = post.image_height
    const ratio = Number.isFinite(width) && Number.isFinite(height) && height > 0 ? width / height : 1
    variants.low = { url: post.preview_file_url, width: Math.min(180, Math.round(180 * ratio)) || 1, height: Math.min(180, Math.round(180 / ratio)) || 1 }
  }
  return { postId: post.id, url: post.preview_file_url, variants }
}

export async function thumbnail(url) {
  const matched = safeAsset(url)
  if (!matched) throw new ProxyError(400, 'Invalid thumbnail URL')
  const limit = SIZES[matched[1]]
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif' },
    redirect: 'error', // A CDN URL must not redirect the proxy to an arbitrary address.
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new ProxyError(502, 'Thumbnail unavailable')
  const type = response.headers.get('content-type') || ''
  if (!/^image\/(?:avif|jpeg|png|webp|gif)$/.test(type.split(';')[0])) throw new ProxyError(502, 'Unexpected content type')
  const advertised = Number(response.headers.get('content-length'))
  if (advertised > limit) { await response.body?.cancel(); throw new ProxyError(502, 'Thumbnail too large') }
  if (!response.body) throw new ProxyError(502, 'Empty thumbnail')
  const reader = response.body.getReader()
  const chunks = []
  let length = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.length
    if (length > limit) { await reader.cancel(); throw new ProxyError(502, 'Thumbnail too large') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return { bytes, type }
}
