import { afterEach, describe, expect, it, vi } from 'vitest'
import { latestArtwork, thumbnail } from '../server/danbooruProxy.mjs'

const preview = 'https://cdn.donmai.us/180x180/86/c5/86c536ee3ce8dec03fec38eb4cb88ab4.jpg'
const medium = preview.replace('/180x180/', '/360x360/')
const high = preview.replace('/180x180/', '/720x720/').replace(/\.jpg$/, '.webp')
afterEach(() => vi.unstubAllGlobals())

describe('read-only Danbooru bridge', () => {
  it('restricts artist tags and image URLs before any external request', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(latestArtwork('bad tag rating:e')).rejects.toThrow('Invalid artist tag')
    await expect(thumbnail('http://localhost:8000/private')).rejects.toThrow('Invalid thumbnail URL')
    await expect(thumbnail('https://cdn.donmai.us.evil.test/180x180/86/c5/86c536ee3ce8dec03fec38eb4cb88ab4.jpg')).rejects.toThrow('Invalid thumbnail URL')
    await expect(thumbnail(medium.replace('/86/c5/', '/00/00/'))).rejects.toThrow('Invalid thumbnail URL')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('requests only G-rated artwork and returns verified 180/360/720 variants', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([{
      id: 42, rating: 'g', preview_file_url: preview,
      media_asset: { variants: [
        { type: '180x180', url: preview, width: 180, height: 145 },
        { type: '360x360', url: medium, width: 360, height: 290 },
        { type: '720x720', url: high, width: 720, height: 580 },
        { type: '720x720', url: 'https://example.org/evil.webp', width: 720, height: 580 },
      ] },
    }]))
    vi.stubGlobal('fetch', fetcher)
    expect(await latestArtwork('tkr_241')).toEqual({
      postId: 42, url: preview, variants: {
        low: { url: preview, width: 180, height: 145 },
        balanced: { url: medium, width: 360, height: 290 },
        high: { url: high, width: 720, height: 580 },
      },
    })
    const request = new URL(fetcher.mock.calls[0][0])
    expect(request.searchParams.get('tags')).toBe('tkr_241 rating:g')
    expect(request.searchParams.get('limit')).toBe('1')
    expect(request.searchParams.get('only')).toContain('media_asset')
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error' })
  })

  it('rejects non-General posts and unexpected upstream image hosts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{ id: 42, rating: 'e', preview_file_url: preview }])))
    expect(await latestArtwork('tkr_241')).toEqual({ postId: null, url: null, variants: {} })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{ id: 42, rating: 'g', preview_file_url: 'https://example.org/photo.jpg' }])))
    expect(await latestArtwork('tkr_241')).toEqual({ postId: null, url: null, variants: {} })
  })

  it('serves small image responses and rejects invalid MIME types', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }))
    vi.stubGlobal('fetch', fetcher)
    expect((await thumbnail(medium)).bytes).toEqual(new Uint8Array([1, 2, 3]))
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not an image', { headers: { 'content-type': 'text/html' } })))
    await expect(thumbnail(high)).rejects.toThrow('Unexpected content type')
  })
})
