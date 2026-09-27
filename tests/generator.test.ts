import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTIONS,
  generateArtistString,
  normalizeOptions,
  type Artist,
} from '../src/core/generator'

const pool: Artist[] = [
  { name: 'alpha', post_count: 100 },
  { name: 'beta', post_count: 500 },
  { name: 'gamma', post_count: 900 },
  { name: 'delta', post_count: 1200 },
]

describe('local artist snapshot', () => {
  it('keeps all original artist names without duplicates or social metadata', () => {
    const data = JSON.parse(readFileSync(new URL('../public/data/artists.json', import.meta.url), 'utf8')) as Artist[]
    expect(data).toHaveLength(43743)
    expect(new Set(data.map((item) => item.name)).size).toBe(data.length)
    expect(data.every((item) => Object.keys(item).sort().join(',') === 'name,post_count')).toBe(true)
  })
})

describe('generator', () => {
  it('draws distinct names without mutating the source', () => {
    const before = JSON.stringify(pool)
    const result = generateArtistString(pool, { count: 3, mode: 'pure' }, () => 0)
    expect(result.names).toEqual(['alpha', 'beta', 'gamma'])
    expect(result.text).toBe('alpha, beta, gamma')
    expect(result.eligible).toBe(4)
    expect(JSON.stringify(pool)).toBe(before)
  })

  it('filters inclusively by the recorded post count', () => {
    const result = generateArtistString(pool, { count: 2, mode: 'pure', minPosts: 900 }, () => 0)
    expect(result.names).toEqual(['gamma', 'delta'])
    expect(result.eligible).toBe(2)
  })

  it('formats standard weights with one decimal and supports the prefix', () => {
    const result = generateArtistString(pool, { count: 2, withPrefix: true }, () => 0)
    expect(result.text).toBe('artist:(alpha:0.5), artist:(beta:0.5)')
  })

  it('formats NAI weights', () => {
    const result = generateArtistString(pool.slice(0, 1), { mode: 'nai', count: 1 }, () => 1)
    expect(result.text).toBe('1.5::alpha ::')
  })

  it('formats fixed and random bracket nesting', () => {
    expect(generateArtistString(pool.slice(0, 1), { count: 1, mode: 'creative', bracketStyle: 'curly', bracketLevels: 2 }, () => 0).text).toBe('{{alpha}}')
    expect(generateArtistString(pool.slice(0, 1), { count: 1, mode: 'creative', bracketStyle: 'square' }, () => 1).text).toBe('[[[[[alpha]]]]]')
  })

  it('clamps settings from storage or inputs and sorts reversed weights', () => {
    expect(normalizeOptions({ count: 500, mode: 'unknown', minPosts: -5, weightMin: 1.9, weightMax: 0.3, bracketLevels: 22, withPrefix: 'yes' })).toEqual({
      ...DEFAULT_OPTIONS,
      count: 99,
      minPosts: 0,
      weightMin: 0.3,
      weightMax: 1.9,
      bracketLevels: 5,
    })
    expect(normalizeOptions({ count: Number.NaN, weightMin: Infinity })).toEqual(DEFAULT_OPTIONS)
  })

  it('draws a count inclusively from a range and narrows it to available artists', () => {
    const settings = { mode: 'pure', countMode: 'range', rangeMin: 2, rangeMax: 4 }
    expect(generateArtistString(pool, settings, () => 0).names).toHaveLength(2)
    expect(generateArtistString(pool, settings, () => 1).names).toHaveLength(4)
    expect(generateArtistString(pool.slice(0, 3), settings, () => 1).names).toHaveLength(3)
    expect(() => generateArtistString(pool.slice(0, 1), settings)).toThrow('只有 1 位')
  })

  it('honors an adjustable maximum with an immutable 99-person safety ceiling', () => {
    expect(normalizeOptions({ maxCount: 9, count: 60, rangeMin: 8, rangeMax: 200 })).toMatchObject({ maxCount: 9, count: 9, rangeMin: 8, rangeMax: 9 })
    expect(normalizeOptions({ maxCount: 100000, count: 100000, rangeMin: 99, rangeMax: 100000 })).toMatchObject({ maxCount: 99, count: 99, rangeMin: 99, rangeMax: 99 })
    expect(normalizeOptions({ maxCount: 7, rangeMin: 5, rangeMax: 2 })).toMatchObject({ rangeMin: 2, rangeMax: 5 })
  })

  it('avoids last generation when possible and falls back if the pool is too small', () => {
    expect(generateArtistString(pool, { mode: 'pure', count: 2 }, () => 0, ['alpha', 'beta']).names).toEqual(['gamma', 'delta'])
    expect(generateArtistString(pool, { mode: 'pure', count: 3 }, () => 0, ['alpha', 'beta']).names).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('does not duplicate an artist even if the source repeats a name', () => {
    const repeated = [...pool, { name: 'alpha', post_count: 9999 }]
    expect(generateArtistString(repeated, { mode: 'pure', count: 4 }, () => 0).names).toEqual(['alpha', 'beta', 'gamma', 'delta'])
  })

  it('reports insufficient matches instead of silently returning a short string', () => {
    expect(() => generateArtistString(pool, { count: 3, minPosts: 1000 })).toThrow('只有 1 位')
  })

  it('handles an extreme random value without reading beyond the pool', () => {
    expect(generateArtistString(pool, { count: 2, mode: 'pure' }, () => 1).names).toEqual(['delta', 'alpha'])
  })
})
