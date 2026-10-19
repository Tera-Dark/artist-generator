import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { deleteUserEntry, getPreviewRecord, putPreviewRecord, putUserEntry, readUserData, replaceUserData, readStudioData, putStudioProfile, putStudioPreset, replaceStudioData } from '../src/data/localDatabase'
import type { SavedString } from '../src/core/dataFormat'

const record: SavedString = {
  id: 'test-entry-0001', text: '(foo:1.2)', names: ['foo'], mode: 'standard', source: 'generated', createdAt: 1000,
}

describe('local IndexedDB records', () => {
  it('stores history, favorites, preview metadata, and atomically replaces the user stores', async () => {
    await putUserEntry('history', record)
    await putUserEntry('favorites', record)
    await putPreviewRecord({ id: 'foo', postId: 321, url: 'https://cdn.donmai.us/foo.jpg', fetchedAt: 123 })
    expect(await readUserData()).toEqual({ history: [record], favorites: [record] })
    expect((await getPreviewRecord('foo'))?.postId).toBe(321)

    await replaceUserData([], [record])
    expect(await readUserData()).toEqual({ history: [], favorites: [record] })
    expect((await getPreviewRecord('foo'))?.postId).toBe(321)
    await deleteUserEntry('favorites', record.id)
    expect((await readUserData()).favorites).toHaveLength(0)
  })
  it('persists curated profiles and mixes independently of old favorites/history', async () => {
    const profile = { name: 'qianben_shan', rating: 9, role: 'either' as const, status: 'favorite' as const, note: '清透', updatedAt: 100 }
    const preset = {
      id: 'studio-preset-001', title: '试用', createdAt: 100, updatedAt: 100,
      format: 'nai' as const, precision: 2 as const, withPrefix: true,
      artists: [{ name: 'qianben_shan', weight: 1.05, role: 'main' as const, locked: true }],
    }
    await putStudioProfile(profile)
    await putStudioPreset(preset)
    expect(await readStudioData()).toEqual({ profiles: [profile], presets: [preset] })
    await replaceStudioData([profile], [])
    expect((await readStudioData()).presets).toHaveLength(0)
    expect((await readUserData()).history).toEqual([])
  })

})
