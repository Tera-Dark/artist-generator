import { afterEach, describe, expect, it, vi } from 'vitest'
import artworkHandler from '../api/danbooru.js'
import thumbnailHandler from '../api/thumbnail.js'

const preview = 'https://cdn.donmai.us/180x180/86/c5/86c536ee3ce8dec03fec38eb4cb88ab4.jpg'

function response() {
  return {
    headers: {} as Record<string, string>,
    code: 0,
    body: undefined as unknown,
    setHeader(name: string, value: string) { this.headers[name] = value; return this },
    status(code: number) { this.code = code; return this },
    json(body: unknown) { this.body = body; return this },
    end(body?: unknown) { this.body = body; return this },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('optional Vercel read-only handlers', () => {
  it('allows only GET and validates incoming tags/URLs without fetching', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const post = response(), invalid = response(), image = response()
    await artworkHandler({ method: 'POST', query: {} }, post)
    await artworkHandler({ method: 'GET', query: { artist: 'foo rating:e' } }, invalid)
    await thumbnailHandler({ method: 'GET', query: { url: 'http://localhost/admin' } }, image)
    expect(post.code).toBe(405)
    expect(invalid.code).toBe(400)
    expect(image.code).toBe(400)
    for (const res of [post, invalid, image]) expect(res.headers['X-Content-Type-Options']).toBe('nosniff')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('serializes valid G-rated metadata and small image bytes with correct headers', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json([{ id: 123, rating: 'g', preview_file_url: preview }]))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } })))
    const post = response(), image = response()
    await artworkHandler({ method: 'GET', query: { artist: 'dairi' } }, post)
    await thumbnailHandler({ method: 'GET', query: { url: preview } }, image)
    expect(post.code).toBe(200)
    expect(post.body).toMatchObject({ postId: 123, url: preview })
    expect(image.code).toBe(200)
    expect(image.headers['Content-Type']).toBe('image/jpeg')
    expect(image.headers['Cache-Control']).toContain('immutable')
    expect(Array.from(image.body as Buffer)).toEqual([1, 2, 3])
  })
})
