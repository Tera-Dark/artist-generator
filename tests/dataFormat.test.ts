import { describe, expect, it } from 'vitest'
import { isProxy, reactive } from 'vue'
import { ARCHIVE_FORMAT, createArchive, makeEntry, mergeEntries, readArchive, type SavedString } from '../src/core/dataFormat'

const first: SavedString = { id: 'first-123', text: '(foo:1.2)', names: ['foo'], mode: 'standard', source: 'generated', createdAt: 1000 }
const second: SavedString = { id: 'second-123', text: '(bar:1.1)', names: ['bar'], mode: 'standard', source: 'edited', createdAt: 2000 }

describe('versioned JSON backup', () => {
  it('copies reactive artist names into a plain IndexedDB-cloneable array', () => {
    const names = reactive(['foo', 'bar'])
    const entry = makeEntry('foo, bar', names, 'pure', 'generated')
    expect(isProxy(entry.names)).toBe(false)
    expect(structuredClone(entry).names).toEqual(['foo', 'bar'])
  })

  it('round-trips a v1 archive and keeps structured records', () => {
    const archive = createArchive([first], [second])
    expect(archive.format).toBe(ARCHIVE_FORMAT)
    expect(readArchive(JSON.parse(JSON.stringify(archive)))).toEqual(archive)
  })

  it('rejects unknown versions, malformed entries and extra fields', () => {
    const archive = createArchive([first], [])
    expect(() => readArchive({ ...archive, version: 999 })).toThrow('不是支持')
    expect(() => readArchive({ ...archive, exportedAt: '2026-09-27' })).toThrow('文件结构')
    expect(() => readArchive({ ...archive, favorites: [{ ...second, text: '' }] })).toThrow('无效记录')
    expect(() => readArchive({ ...archive, history: [{ ...first, untrusted: 'x' }] })).toThrow('无效记录')
    expect(() => readArchive({ ...archive, history: [{ ...first, createdAt: Number.MAX_SAFE_INTEGER }] })).toThrow('无效记录')
  })

  it('merges history by id and favorites by content', () => {
    expect(mergeEntries([first], [first, second], 250).map((item) => item.id)).toEqual(['second-123', 'first-123'])
    expect(mergeEntries([first], [{ ...second, text: first.text }], 1000, true)).toEqual([first])
  })
})
