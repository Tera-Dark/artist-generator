import { reactive, watch } from 'vue'
import { DEFAULT_OPTIONS, normalizeOptions, type GeneratorOptions } from '@/core/generator'

export type ImageQuality = 'low' | 'balanced' | 'high'
export type GalleryDensity = 'comfortable' | 'compact'

export interface AppPreferences {
  generator: GeneratorOptions
  imageQuality: ImageQuality
  galleryDensity: GalleryDensity
  imagePageSize: 12 | 18 | 24
  autoCopy: boolean
  autoScroll: boolean
  avoidLastArtists: boolean
}

const KEY = 'artist-generator-preferences-v1'
const LEGACY_GENERATOR_KEY = 'artist-generator-settings-v2'
export const DEFAULT_PREFERENCES: AppPreferences = {
  generator: { ...DEFAULT_OPTIONS },
  imageQuality: 'balanced',
  galleryDensity: 'comfortable',
  imagePageSize: 18,
  autoCopy: false,
  autoScroll: true,
  avoidLastArtists: false,
}

export function normalizePreferences(value: unknown): AppPreferences {
  const input = value && typeof value === 'object' ? value as Partial<AppPreferences> : {}
  return {
    generator: normalizeOptions(input.generator),
    imageQuality: input.imageQuality === 'low' || input.imageQuality === 'high' ? input.imageQuality : 'balanced',
    galleryDensity: input.galleryDensity === 'compact' ? 'compact' : 'comfortable',
    imagePageSize: input.imagePageSize === 12 || input.imagePageSize === 24 ? input.imagePageSize : 18,
    autoCopy: typeof input.autoCopy === 'boolean' ? input.autoCopy : false,
    autoScroll: typeof input.autoScroll === 'boolean' ? input.autoScroll : true,
    avoidLastArtists: typeof input.avoidLastArtists === 'boolean' ? input.avoidLastArtists : false,
  }
}

function restore(): AppPreferences {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return normalizePreferences(JSON.parse(saved))
    const old = localStorage.getItem(LEGACY_GENERATOR_KEY)
    if (old) return normalizePreferences({ generator: JSON.parse(old) })
  } catch { /* Storage is optional; the generator still works. */ }
  return normalizePreferences(null)
}

const preferences = reactive(restore())
watch(preferences, () => {
  try { localStorage.setItem(KEY, JSON.stringify(preferences)) }
  catch { /* Private browsers may deny localStorage. */ }
}, { deep: true })

export function usePreferences() { return preferences }

export function normalizeGeneratorPreferences() {
  Object.assign(preferences.generator, normalizeOptions(preferences.generator))
}

export function resetPreferences() {
  Object.assign(preferences.generator, DEFAULT_OPTIONS)
  preferences.imageQuality = DEFAULT_PREFERENCES.imageQuality
  preferences.galleryDensity = DEFAULT_PREFERENCES.galleryDensity
  preferences.imagePageSize = DEFAULT_PREFERENCES.imagePageSize
  preferences.autoCopy = DEFAULT_PREFERENCES.autoCopy
  preferences.autoScroll = DEFAULT_PREFERENCES.autoScroll
  preferences.avoidLastArtists = DEFAULT_PREFERENCES.avoidLastArtists
}
