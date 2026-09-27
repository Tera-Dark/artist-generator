import { expect, it } from 'vitest'
import { buildSearchIndex, DEFAULT_FILTERS, filterArtists, searchTerms } from '../src/core/artistFilters'
import type { ArtistDetail } from '../src/data/artistLibrary'

const artists: ArtistDetail[] = [
  { name: 'dairi', post_count: 1000, other_names: ['dairi155', 'はるか', 'foo bar'], danbooru_url: 'https://danbooru.donmai.us/artists/1' },
  { name: 'ebifurya', post_count: 300, other_names: ['dairi155', 'イラスト'], danbooru_url: 'https://danbooru.donmai.us/artists/2' },
  { name: 'crote', post_count: 50, other_names: [], danbooru_url: 'https://danbooru.donmai.us/artists/3' },
  { name: 'ink', post_count: 700, other_names: ['画师', 'pen'], danbooru_url: 'https://danbooru.donmai.us/artists/4' },
]
const index = buildSearchIndex(artists)
const find = (options: Partial<typeof DEFAULT_FILTERS>) => filterArtists(artists, index, { ...DEFAULT_FILTERS, ...options }).map((item) => item.name)

it('matches multiple aliases across terms and preserves quoted phrases', () => {
  expect(searchTerms('"foo bar", はるか；dairi155')).toEqual(['foo bar', 'はるか', 'dairi155'])
  expect(find({ query: 'dairi155 はるか', scope: 'aliases' })).toEqual(['dairi'])
  expect(find({ query: '"foo bar"' })).toEqual(['dairi'])
  expect(find({ query: 'dairi155, pen', match: 'any', scope: 'aliases' })).toEqual(['dairi', 'ink', 'ebifurya'])
  expect(find({ query: 'dairi155', scope: 'name' })).toEqual([])
})

it('filters by post interval, alias count and Han/Kana spelling', () => {
  expect(find({ minPosts: 500, maxPosts: 900 })).toEqual(['ink'])
  expect(find({ aliasFilter: 'without' })).toEqual(['crote'])
  expect(find({ minAliases: 3, aliasScript: 'kana' })).toEqual(['dairi'])
  expect(find({ aliasScript: 'han' })).toEqual(['ink'])
  expect(find({ sort: 'aliases' })).toEqual(['dairi', 'ink', 'ebifurya', 'crote'])
})
