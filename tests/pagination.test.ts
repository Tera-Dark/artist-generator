import { describe, expect, it } from 'vitest'
import { parsePageNumber, pickPageItem } from '../src/core/pagination'

describe('library page controls', () => {
  it('accepts only pages within the current filtered result set', () => {
    expect(parsePageNumber(' 42 ', 2431)).toBe(42)
    expect(parsePageNumber('2431', 2431)).toBe(2431)
    for (const invalid of ['', '0', '-1', '1.2', '1e3', '2a', '2432', '99999999999999999999']) {
      expect(parsePageNumber(invalid, 2431)).toBeNull()
    }
    expect(parsePageNumber('2', 1)).toBeNull()
    expect(parsePageNumber('1', 0)).toBeNull()
    expect(parsePageNumber('１２', 12)).toBeNull()
  })

  it('chooses a visible page for a random item and handles extreme random values', () => {
    const items = Array.from({ length: 53 }, (_, index) => index)
    expect(pickPageItem(items, 24, () => 0)).toEqual({ item: 0, index: 0, page: 1 })
    expect(pickPageItem(items, 24, () => 1)).toEqual({ item: 52, index: 52, page: 3 })
    expect(pickPageItem(items, 24, () => -1)).toEqual({ item: 0, index: 0, page: 1 })
    expect(pickPageItem(items, 24, () => Number.NaN)).toEqual({ item: 0, index: 0, page: 1 })
    expect(pickPageItem([], 24)).toBeNull()
    expect(pickPageItem(items, 0)).toBeNull()
  })
})
