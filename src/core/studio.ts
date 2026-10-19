import { parseArtistString } from './stringEditor'

export type ArtistRole = 'main' | 'support' | 'either'
export type ArtistStatus = 'favorite' | 'neutral' | 'blocked'
export type MixFormat = 'nai' | 'standard'

export interface ArtistProfile {
  name: string
  rating: number | null
  role: ArtistRole
  status: ArtistStatus
  note: string
  updatedAt: number
}

export interface MixArtist {
  name: string
  weight: number
  role: 'main' | 'support'
  locked: boolean
}

export interface MixPreset {
  id: string
  title: string
  artists: MixArtist[]
  format: MixFormat
  withPrefix: boolean
  precision: 1 | 2
  createdAt: number
  updatedAt: number
}

export interface StudioArchive {
  format: 'artist-generator.studio-data'
  version: 1
  exportedAt: string
  profiles: ArtistProfile[]
  presets: MixPreset[]
}

export const STUDIO_LIMIT = 1000
export const STUDIO_FILE_LIMIT = 2 * 1024 * 1024

const validName = (name: unknown): name is string =>
  typeof name === 'string' && !!name.trim() && name.length <= 300 && !/[\r\n]/.test(name)

function validProfile(v: unknown): v is ArtistProfile {
  if (!v || typeof v !== 'object') return false
  const x = v as Partial<ArtistProfile>
  return validName(x.name) &&
    (x.rating === null || (typeof x.rating === 'number' && Number.isFinite(x.rating) && x.rating >= 0 && x.rating <= 10 && x.rating * 2 % 1 === 0)) &&
    ['main', 'support', 'either'].includes(x.role || '') &&
    ['favorite', 'neutral', 'blocked'].includes(x.status || '') &&
    typeof x.note === 'string' && x.note.length <= 500 &&
    typeof x.updatedAt === 'number' && Number.isSafeInteger(x.updatedAt) && x.updatedAt >= 0
}

export function validPreset(v: unknown): v is MixPreset {
  if (!v || typeof v !== 'object') return false
  const x = v as Partial<MixPreset>
  if (typeof x.id !== 'string' || !/^[\w-]{8,80}$/.test(x.id) ||
    typeof x.title !== 'string' || !x.title.trim() || x.title.length > 100 ||
    !Array.isArray(x.artists) || !x.artists.length || x.artists.length > 99 ||
    !['nai', 'standard'].includes(x.format || '') || typeof x.withPrefix !== 'boolean' ||
    ![1, 2].includes(x.precision as number) ||
    typeof x.createdAt !== 'number' || !Number.isSafeInteger(x.createdAt) || x.createdAt < 0 ||
    typeof x.updatedAt !== 'number' || !Number.isSafeInteger(x.updatedAt) || x.updatedAt < 0) return false
  let mains = 0
  const names = new Set<string>()
  for (const a of x.artists) {
    if (!validName(a?.name) || typeof a.weight !== 'number' || !Number.isFinite(a.weight) ||
      a.weight < 0 || a.weight > 2 || !['main', 'support'].includes(a.role) ||
      typeof a.locked !== 'boolean' || names.has(a.name)) return false
    names.add(a.name)
    if (a.role === 'main') mains++
  }
  return mains === 1
}

export function formatMix(artists: readonly MixArtist[], format: MixFormat, withPrefix: boolean, precision: 1 | 2) {
  return artists.map(a => {
    const name = (withPrefix ? 'artist:' : '') + a.name
    const weight = Math.max(0, Math.min(2, a.weight)).toFixed(precision)
    return format === 'nai' ? `${weight}::${name} ::` : `(${name}:${weight})`
  }).join(', ')
}

export function makeStudioArchive(profiles: ArtistProfile[], presets: MixPreset[]): StudioArchive {
  return { format: 'artist-generator.studio-data', version: 1, exportedAt: new Date().toISOString(), profiles, presets }
}

export function readStudioArchive(value: unknown): StudioArchive {
  if (!value || typeof value !== 'object') throw new Error('不是有效的 Studio JSON 文件')
  const x = value as Partial<StudioArchive>
  if (x.format !== 'artist-generator.studio-data' || x.version !== 1 ||
    typeof x.exportedAt !== 'string' || !Number.isFinite(Date.parse(x.exportedAt)) ||
    !Array.isArray(x.profiles) || !Array.isArray(x.presets) ||
    x.profiles.length > STUDIO_LIMIT || x.presets.length > STUDIO_LIMIT ||
    !x.profiles.every(validProfile) || !x.presets.every(validPreset)) {
    throw new Error('不支持的画师工作台备份格式或记录不合规范（需要 studio-data v1）')
  }
  return x as StudioArchive
}

/** One nonempty line = one full artist string. Commas separate artists, not presets. */
export function parseBatchText(raw: string): MixPreset[] {
  if (raw.length > STUDIO_FILE_LIMIT) throw new Error('批量文本超过 2 MB')
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith('#'))
  if (!lines.length || lines.length > STUDIO_LIMIT) throw new Error('每次支持 1–1000 行画师串')
  return lines.map((line, index) => {
    const tokens = parseArtistString(line)
    if (tokens.length > 99) throw new Error(`第 ${index + 1} 行超过 99 位画师`)
    if (new Set(tokens.map(t => t.name)).size !== tokens.length) throw new Error(`第 ${index + 1} 行存在重复画师`)
    const now = Date.now()
    return {
      id: crypto.randomUUID(), title: `批量导入 ${index + 1}`,
      artists: tokens.map((token, i) => ({
        name: token.name, weight: Math.max(0, Math.min(2, Number(token.weight ?? '1'))),
        role: i === 0 ? 'main' as const : 'support' as const, locked: true,
      })),
      format: line.includes('::') ? 'nai' as const : 'standard' as const,
      withPrefix: tokens.some(t => t.prefix),
      precision: tokens.some(t => (t.weight || '').split('.')[1]?.length >= 2) ? 2 as const : 1 as const,
      createdAt: now, updatedAt: now,
    }
  })
}

export function exportBatchText(presets: readonly MixPreset[]) {
  return presets.map(p => formatMix(p.artists, p.format, p.withPrefix, p.precision)).join('\n')
}
