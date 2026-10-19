import { describe, expect, it } from 'vitest'
import {
  formatMix, exportBatchText, parseBatchText, makeStudioArchive, readStudioArchive,
  validPreset, type ArtistProfile, type MixPreset,
} from '../src/core/studio'

const profile: ArtistProfile = {
  name: 'qianben_shan', rating: 9, role: 'either', status: 'favorite', note: '清透女性肖像', updatedAt: 123,
}
const preset: MixPreset = {
  id: 'preset-example-001', title: '清透', createdAt: 123, updatedAt: 123,
  format: 'nai', precision: 2, withPrefix: true,
  artists: [
    { name: 'qianben_shan', weight: 1.05, role: 'main', locked: true },
    { name: 'kurikabacha', weight: 0.55, role: 'support', locked: false },
  ],
}
describe('curated studio preset and batch exchange', () => {
  it('exports canonical NAI and standard strings without losing decimal precision', () => {
    expect(formatMix(preset.artists, 'nai', true, 2)).toBe('1.05::artist:qianben_shan ::, 0.55::artist:kurikabacha ::')
    expect(formatMix(preset.artists, 'standard', true, 1)).toBe('(artist:qianben_shan:1.1), (artist:kurikabacha:0.6)')
  })
  it('supports one preset per line and roundtrip TXT batch exchange', () => {
    const exported = exportBatchText([preset])
    const imported = parseBatchText(exported)
    expect(imported).toHaveLength(1)
    expect(imported[0]?.artists.map(a => [a.name, a.weight])).toEqual([
      ['qianben_shan', 1.05], ['kurikabacha', 0.55],
    ])
    expect(imported[0]?.withPrefix).toBe(true)
    expect(imported[0]?.precision).toBe(2)
    expect(exportBatchText(imported)).toBe(exported)
  })
  it('supports standard/NAI mixed batch with comment lines', () => {
    const data = parseBatchText('# studio batches\n(artist:alpha:1.2), (beta:0.7)\n1.0::artist:gamma ::')
    expect(data).toHaveLength(2)
    expect(data[0]?.format).toBe('standard')
    expect(data[1]?.format).toBe('nai')
  })
  it('validates versioned JSON backup and rejects invalid records', () => {
    const archive = makeStudioArchive([profile], [preset])
    expect(readStudioArchive(archive)).toEqual(archive)
    expect(() => readStudioArchive({ ...archive, version: 2 })).toThrow()
    expect(() => readStudioArchive({ ...archive, profiles: [{ ...profile, rating: 8.7 }] })).toThrow()
    expect(() => readStudioArchive({ ...archive, presets: [{ ...preset, artists: [preset.artists[0], preset.artists[0]] }] })).toThrow()
  })
  it('requires exactly one main and refuses duplicate artist names', () => {
    expect(validPreset(preset)).toBe(true)
    expect(validPreset({ ...preset, artists: preset.artists.map(a => ({ ...a, role: 'support' })) })).toBe(false)
    expect(() => parseBatchText('foo, foo')).toThrow('重复画师')
  })
})
