import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { deleteUserEntry, getPreviewRecord, putPreviewRecord, putUserEntry, readUserData, replaceUserData } from '../src/data/localDatabase'
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
})
