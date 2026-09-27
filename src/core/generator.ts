export interface Artist {
  name: string
  post_count: number
}

export type GeneratorMode = 'pure' | 'standard' | 'creative' | 'nai'
export type BracketStyle = 'paren' | 'curly' | 'square'
export type CountMode = 'fixed' | 'range'
export const HARD_MAX_ARTISTS = 99

export interface GeneratorOptions {
  countMode: CountMode
  count: number
  rangeMin: number
  rangeMax: number
  maxCount: number // User-adjustable safety ceiling; never exceeds HARD_MAX_ARTISTS.
  mode: GeneratorMode
  minPosts: number
  weightMin: number
  weightMax: number
  bracketStyle: BracketStyle
  bracketLevels: number // 0 = random, otherwise 1–5
  withPrefix: boolean
}

export interface GeneratorResult {
  names: string[]
  text: string
  eligible: number
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  countMode: 'fixed',
  count: 3,
  rangeMin: 2,
  rangeMax: 5,
  maxCount: HARD_MAX_ARTISTS,
  mode: 'standard',
  minPosts: 0,
  weightMin: 0.5,
  weightMax: 1.5,
  bracketStyle: 'paren',
  bracketLevels: 0,
  withPrefix: false,
}

const modes: GeneratorMode[] = ['pure', 'standard', 'creative', 'nai']
const brackets: BracketStyle[] = ['paren', 'curly', 'square']

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback
}

/** Never trust persisted, typed or imported settings to bypass the hard 99-person ceiling. */
export function normalizeOptions(value: unknown): GeneratorOptions {
  const input = value && typeof value === 'object' ? (value as Partial<GeneratorOptions>) : {}
  const maxCount = Math.trunc(boundedNumber(input.maxCount, HARD_MAX_ARTISTS, 1, HARD_MAX_ARTISTS))
  const min = Math.trunc(boundedNumber(input.rangeMin, DEFAULT_OPTIONS.rangeMin, 1, maxCount))
  const max = Math.trunc(boundedNumber(input.rangeMax, DEFAULT_OPTIONS.rangeMax, 1, maxCount))
  const weightMin = boundedNumber(input.weightMin, DEFAULT_OPTIONS.weightMin, 0, 2)
  const weightMax = boundedNumber(input.weightMax, DEFAULT_OPTIONS.weightMax, 0, 2)

  return {
    countMode: input.countMode === 'range' ? 'range' : 'fixed',
    count: Math.trunc(boundedNumber(input.count, DEFAULT_OPTIONS.count, 1, maxCount)),
    rangeMin: Math.min(min, max),
    rangeMax: Math.max(min, max),
    maxCount,
    mode: modes.includes(input.mode as GeneratorMode) ? input.mode as GeneratorMode : DEFAULT_OPTIONS.mode,
    minPosts: Math.trunc(boundedNumber(input.minPosts, DEFAULT_OPTIONS.minPosts, 0, 20000)),
    weightMin: Math.min(weightMin, weightMax),
    weightMax: Math.max(weightMin, weightMax),
    bracketStyle: brackets.includes(input.bracketStyle as BracketStyle) ? input.bracketStyle as BracketStyle : DEFAULT_OPTIONS.bracketStyle,
    bracketLevels: Math.trunc(boundedNumber(input.bracketLevels, DEFAULT_OPTIONS.bracketLevels, 0, 5)),
    withPrefix: typeof input.withPrefix === 'boolean' ? input.withPrefix : DEFAULT_OPTIONS.withPrefix,
  }
}

function unitRandom(random: () => number) {
  const value = random()
  return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0
}

function formatName(name: string, options: GeneratorOptions, random: () => number) {
  let item = name
  if (options.mode === 'standard' || options.mode === 'nai') {
    const weight = options.weightMin + unitRandom(random) * (options.weightMax - options.weightMin)
    const rounded = weight.toFixed(1)
    item = options.mode === 'nai' ? `${rounded}::${name} ::` : `(${name}:${rounded})`
  } else if (options.mode === 'creative') {
    const pairs: Record<BracketStyle, [string, string]> = {
      paren: ['(', ')'], curly: ['{', '}'], square: ['[', ']'],
    }
    const [open, close] = pairs[options.bracketStyle]
    const levels = options.bracketLevels || 1 + Math.floor(unitRandom(random) * 5)
    item = `${open.repeat(levels)}${name}${close.repeat(levels)}`
  }
  return options.withPrefix ? `artist:${item}` : item
}

/** Draw distinct artists, optionally avoiding the previous result when enough choices remain. */
export function generateArtistString(
  artists: readonly Artist[],
  settings: unknown,
  random: () => number = Math.random,
  previousNames: readonly string[] = [],
): GeneratorResult {
  const options = normalizeOptions(settings)
  const seen = new Set<string>()
  const eligible = artists.filter((artist) => {
    if (!artist || typeof artist.name !== 'string' || !artist.name.trim()) return false
    if (typeof artist.post_count !== 'number' || !Number.isFinite(artist.post_count) || artist.post_count < options.minPosts) return false
    if (seen.has(artist.name)) return false
    seen.add(artist.name)
    return true
  })

  const minimum = options.countMode === 'range' ? options.rangeMin : options.count
  if (eligible.length < minimum) {
    throw new Error(`符合条件的画师只有 ${eligible.length} 位，请降低作品数筛选或生成数量。`)
  }
  // A range narrows to available choices, while a fixed count reports insufficiency.
  const count = options.countMode === 'range'
    ? options.rangeMin + Math.floor(unitRandom(random) * (Math.min(options.rangeMax, eligible.length) - options.rangeMin + 1))
    : options.count
  const recent = new Set(previousNames)
  const fresh = recent.size ? eligible.filter((artist) => !recent.has(artist.name)) : eligible
  const pool = fresh.length >= count ? fresh : eligible

  // Partial Fisher–Yates: only shuffle the requested number of entries.
  const names: string[] = []
  for (let index = 0; index < count; index++) {
    const chosen = index + Math.floor(unitRandom(random) * (pool.length - index))
    ;[pool[index], pool[chosen]] = [pool[chosen]!, pool[index]!]
    names.push(pool[index]!.name)
  }
  return { names, text: names.map((name) => formatName(name, options, random)).join(', '), eligible: eligible.length }
}
