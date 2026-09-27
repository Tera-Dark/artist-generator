// Images are strictly limited to Danbooru's small, immutable preview URLs.
import { thumbnail, ProxyError } from '../server/danbooruProxy.mjs'

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const image = await thumbnail(req.query.url)
    res.setHeader('Content-Type', image.type)
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=31536000, immutable')
    return res.status(200).end(Buffer.from(image.bytes))
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(error instanceof ProxyError ? error.status : 502).end()
  }
}
