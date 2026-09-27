// Optional Vercel function. Static deployments fall back to the public Danbooru API.
import { latestArtwork, ProxyError } from '../server/danbooruProxy.mjs'

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const data = await latestArtwork(req.query.artist)
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400')
    return res.status(200).json(data)
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(error instanceof ProxyError ? error.status : 502).json({ error: 'Artwork unavailable' })
  }
}
