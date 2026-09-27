import { readFile } from 'node:fs/promises'
import { afterEach, expect, it, vi } from 'vitest'
import { loadArtistDetails } from '../src/data/artistLibrary'

const originalFile = new URL('../public/data/artists-full.json', import.meta.url)
afterEach(() => vi.unstubAllGlobals())

it('loads every original artist and every alias, including the four post-search fallback links', async () => {
  const original = JSON.parse(await readFile(originalFile, 'utf8'))
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => original })
  vi.stubGlobal('fetch', fetcher)
  const loaded = await loadArtistDetails()
  expect(fetcher).toHaveBeenCalledOnce()
  expect(loaded).toHaveLength(43_743)
  expect(loaded).toEqual(original)
  const lean = JSON.parse(await readFile(new URL('../public/data/artists.json', import.meta.url), 'utf8'))
  expect(loaded.map((artist) => ({ name: artist.name, post_count: artist.post_count }))).toEqual(lean)
  expect(loaded.filter((artist) => artist.danbooru_url.includes('/posts?tags='))).toHaveLength(4)
  expect(loaded.find((artist) => artist.name === 'dairi')?.other_names.length).toBeGreaterThan(1)
})
