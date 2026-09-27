import { expect, it } from 'vitest'
import { previewVariantCandidates } from '../src/data/danbooru'
import type { PreviewRecord } from '../src/data/localDatabase'

const low = 'https://cdn.donmai.us/180x180/86/c5/86c536ee3ce8dec03fec38eb4cb88ab4.jpg'
const medium = low.replace('/180x180/', '/360x360/')
const high = low.replace('/180x180/', '/720x720/').replace(/\.jpg$/, '.webp')

it('prefers selected image quality and only falls back to verified smaller variants', () => {
  const record: PreviewRecord = { id: 'tkr_241', postId: 1, url: low, fetchedAt: 1, variants: {
    low: { url: low, width: 180, height: 145 },
    balanced: { url: medium, width: 360, height: 291 },
    high: { url: high, width: 720, height: 581 },
  } }
  expect(previewVariantCandidates(record, 'high').map((item) => item.quality)).toEqual(['high', 'balanced', 'low'])
  expect(previewVariantCandidates(record, 'balanced').map((item) => item.quality)).toEqual(['balanced', 'low'])
  expect(previewVariantCandidates(record, 'low').map((item) => item.quality)).toEqual(['low'])
  expect(previewVariantCandidates({ ...record, variants: { high: { url: 'https://example.org/evil.webp', width: 720, height: 581 } } }, 'high').map((item) => item.quality)).toEqual(['low'])
  expect(previewVariantCandidates({ ...record, variants: undefined }, 'high').map((item) => item.quality)).toEqual(['low'])
})
