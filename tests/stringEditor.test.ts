import { describe, expect, it } from 'vitest'
import { editArtistString, parseArtistString } from '../src/core/stringEditor'

const options = { action: 'convert' as const, format: 'nai' as const, min: 0.5, max: 1.5 }

describe('non-destructive string editor', () => {
  it('removes only numeric weights and keeps names with parentheses and artist: prefixes', () => {
    const input = 'artist:(kiyo_(kiyo_mariari):1.2), (miko:0.8)'
    expect(editArtistString(input, { ...options, action: 'strip' }).text)
      .toBe('artist:kiyo_(kiyo_mariari), miko')
    expect(input).toBe('artist:(kiyo_(kiyo_mariari):1.2), (miko:0.8)')
  })

  it('converts standard to NAI and back without losing precision', () => {
    const output = editArtistString('(foo:1.25), artist:(bar:0.70)', options).text
    expect(output).toBe('1.25::foo ::, artist:0.70::bar ::')
    expect(editArtistString(output, { ...options, format: 'standard' }).text)
      .toBe('(foo:1.25), artist:(bar:0.70)')
  })

  it('assigns 1.0 when converting an unweighted token', () => {
    expect(editArtistString('foo, bar', options).text).toBe('1.0::foo ::, 1.0::bar ::')
  })

  it('rerolls weights without resampling names or changing their order', () => {
    const result = editArtistString('foo, 1.4::bar ::', { ...options, action: 'reroll', format: 'standard' }, () => 0)
    expect(result).toEqual({ text: '(foo:0.5), (bar:0.5)', names: ['foo', 'bar'], count: 2 })
  })

  it('can strip the creative bracket formats produced by the generator', () => {
    expect(editArtistString('((kiyo_(user))), {{foo}}, [bar]', { ...options, action: 'strip' }).text)
      .toBe('kiyo_(user), foo, bar')
  })

  it('converts to all four generator formats and preserves names/prefixes', () => {
    const input = 'artist:(foo:1.25), (bar:0.8)'
    expect(editArtistString(input, { ...options, format: 'pure' }).text).toBe('artist:foo, bar')
    expect(editArtistString(input, { ...options, format: 'creative', bracketStyle: 'curly', bracketLevels: 2 }).text)
      .toBe('artist:{{foo}}, {{bar}}')
    expect(editArtistString('((foo)), [bar]', { ...options, format: 'creative', bracketStyle: 'square' }, () => 0).text)
      .toBe('[[foo]], [bar]')
    expect(editArtistString(input, { ...options, format: 'standard' }).text).toBe(input)
  })

  it('rerolls creative nesting but refuses to reroll weightless plain text', () => {
    expect(editArtistString('foo, bar', { ...options, action: 'reroll', format: 'creative', bracketStyle: 'square' }, () => 1).text)
      .toBe('[[[[[foo]]]]], [[[[[bar]]]]]')
    expect(() => editArtistString('foo', { ...options, action: 'reroll', format: 'pure' })).toThrow('纯文本没有权重')
  })

  it('rejects malformed or unexportable content instead of saving an invalid backup', () => {
    expect(() => parseArtistString('1.0::foo')).toThrow('格式不完整')
    expect(() => parseArtistString('   ')).toThrow('先粘贴')
    expect(() => parseArtistString('x'.repeat(20001))).toThrow('过长')
    expect(() => parseArtistString('x'.repeat(301))).toThrow('画师名过长')
    const longInput = Array(200).fill('x'.repeat(97)).join(', ')
    expect(longInput.length).toBeLessThan(20000)
    expect(() => editArtistString(longInput, { ...options, format: 'standard' })).toThrow('处理结果超过')
  })
})
