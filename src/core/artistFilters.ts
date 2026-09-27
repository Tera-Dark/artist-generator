import type { ArtistDetail } from '@/data/artistLibrary'

export type SearchScope = 'all' | 'name' | 'aliases'
export type SearchMatch = 'all' | 'any'
export type AliasFilter = 'any' | 'with' | 'without'
export type AliasScript = 'any' | 'han' | 'kana'
export type ArtistSort = 'count' | 'countAsc' | 'name' | 'aliases' | 'original'

export interface ArtistFilters {
  query: string
  scope: SearchScope
  match: SearchMatch
  minPosts: number
  maxPosts: number | null | '' // v-model.number yields an empty string when cleared.
  aliasFilter: AliasFilter
  aliasScript: AliasScript
  minAliases: number
  sort: ArtistSort
}

export const DEFAULT_FILTERS: ArtistFilters = {
  query: '', scope: 'all', match: 'all', minPosts: 0, maxPosts: null,
  aliasFilter: 'any', aliasScript: 'any', minAliases: 0, sort: 'count',
}

export interface SearchIndexEntry { name: string; aliases: string[] }
const han = /[\u3400-\u9fff]/u
const kana = /[\u3040-\u30ff]/u
const normalized = (value: string) => value.normalize('NFKC').toLocaleLowerCase()

/** Commas, whitespace and full-width separators separate terms; quotes preserve spaces in an alias. */
export function searchTerms(value: string): string[] {
  return [...value.matchAll(/"([^"]+)"|([^\s,，;；]+)/gu)]
    .map((match) => normalized((match[1] || match[2] || '').trim()))
    .filter(Boolean)
    .slice(0, 20)
}

export function buildSearchIndex(artists: readonly ArtistDetail[]): SearchIndexEntry[] {
  return artists.map((artist) => ({ name: normalized(artist.name), aliases: artist.other_names.map(normalized) }))
}

export function filterArtists(
  artists: readonly ArtistDetail[],
  index: readonly SearchIndexEntry[],
  filters: ArtistFilters,
): ArtistDetail[] {
  const terms = searchTerms(filters.query)
  const minPosts = Number.isFinite(filters.minPosts) ? Math.max(0, filters.minPosts) : 0
  const maxPosts = typeof filters.maxPosts === 'number' && Number.isFinite(filters.maxPosts)
    ? Math.max(0, filters.maxPosts) : Infinity
  const minAliases = Number.isFinite(filters.minAliases) ? Math.max(0, filters.minAliases) : 0
  const matches: ArtistDetail[] = []

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i]!
    if (artist.post_count < minPosts || artist.post_count > maxPosts) continue
    const aliases = artist.other_names
    if (filters.aliasFilter === 'with' && !aliases.length) continue
    if (filters.aliasFilter === 'without' && aliases.length) continue
    if (aliases.length < minAliases) continue
    if (filters.aliasScript === 'han' && !aliases.some((alias) => han.test(alias))) continue
    if (filters.aliasScript === 'kana' && !aliases.some((alias) => kana.test(alias))) continue
    if (terms.length) {
      const searchable = index[i]
      if (!searchable) continue
      const matchesTerm = (term: string) =>
        (filters.scope !== 'aliases' && searchable.name.includes(term)) ||
        (filters.scope !== 'name' && searchable.aliases.some((alias) => alias.includes(term)))
      if (filters.match === 'any' ? !terms.some(matchesTerm) : !terms.every(matchesTerm)) continue
    }
    matches.push(artist)
  }
  if (filters.sort === 'count') matches.sort((a, b) => b.post_count - a.post_count || a.name.localeCompare(b.name))
  if (filters.sort === 'countAsc') matches.sort((a, b) => a.post_count - b.post_count || a.name.localeCompare(b.name))
  if (filters.sort === 'name') matches.sort((a, b) => a.name.localeCompare(b.name))
  if (filters.sort === 'aliases') matches.sort((a, b) => b.other_names.length - a.other_names.length || b.post_count - a.post_count)
  return matches
}
