import { expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, normalizePreferences } from '../src/composables/usePreferences'

it('validates quality, density, page size and QoL toggles without trusting storage', () => {
  expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES)
  expect(normalizePreferences({
    generator: { countMode: 'range', rangeMin: 5, rangeMax: 999, maxCount: 15 },
    imageQuality: 'high', galleryDensity: 'compact', imagePageSize: 24,
    autoCopy: true, autoScroll: false, avoidLastArtists: true,
  })).toMatchObject({
    generator: { countMode: 'range', rangeMin: 5, rangeMax: 15, maxCount: 15 },
    imageQuality: 'high', galleryDensity: 'compact', imagePageSize: 24,
    autoCopy: true, autoScroll: false, avoidLastArtists: true,
  })
  expect(normalizePreferences({ imageQuality: 'original', imagePageSize: 999, autoCopy: 'yes' })).toMatchObject({
    imageQuality: 'balanced', imagePageSize: 18, autoCopy: false,
  })
})
