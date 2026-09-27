export class ProxyError extends Error {
  status: number
  constructor(status: number, message: string)
}
export type ArtworkVariant = { url: string; width: number; height: number }
export function latestArtwork(artist: string): Promise<{
  postId: number | null
  url: string | null
  variants: Partial<Record<'low' | 'balanced' | 'high', ArtworkVariant>>
}>
export function thumbnail(url: string): Promise<{ bytes: Uint8Array; type: string }>
