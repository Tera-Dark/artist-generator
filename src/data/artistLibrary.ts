import type { Artist } from '@/core/generator'

export interface ArtistDetail extends Artist {
  other_names: string[]
  danbooru_url: string
}

let pending: Promise<readonly Artist[]> | undefined
let detailsPending: Promise<readonly ArtistDetail[]> | undefined

function isDanbooruLink(value: unknown) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'danbooru.donmai.us' &&
      (/^\/artists\/\d+$/.test(url.pathname) || (url.pathname === '/posts' && url.searchParams.has('tags')))
  } catch { return false }
}

/** The generator downloads only the lean, same-origin snapshot. */
export function loadArtistLibrary(): Promise<readonly Artist[]> {
  pending ??= fetch(`${import.meta.env.BASE_URL}data/artists.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Artist data: HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (
        !Array.isArray(data) ||
        data.length === 0 ||
        !data.every(
          (item) =>
            item &&
            typeof item.name === 'string' &&
            item.name.trim().length > 0 &&
            typeof item.post_count === 'number' &&
            Number.isFinite(item.post_count),
        )
      ) {
        throw new Error('Artist data is missing or invalid')
      }
      return data as Artist[]
    })
    .catch((error: unknown) => {
      pending = undefined
      throw error
    })
  return pending
}

/** The original name, every alias, count and Danbooru artist URL; downloaded only when browsing. */
export function loadArtistDetails(): Promise<readonly ArtistDetail[]> {
  detailsPending ??= fetch(`${import.meta.env.BASE_URL}data/artists-full.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Full artist data: HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (
        !Array.isArray(data) ||
        !data.length ||
        !data.every((item) =>
          item &&
          typeof item.name === 'string' &&
          Array.isArray(item.other_names) &&
          item.other_names.every((alias: unknown) => typeof alias === 'string') &&
          Number.isFinite(item.post_count) &&
          isDanbooruLink(item.danbooru_url),
        )
      ) throw new Error('Full artist data is invalid')
      return data as ArtistDetail[]
    })
    .catch((error: unknown) => {
      detailsPending = undefined
      throw error
    })
  return detailsPending
}
