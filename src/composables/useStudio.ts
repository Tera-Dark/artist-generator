import { shallowRef, ref } from 'vue'
import {
  type ArtistProfile, type ArtistRole, type ArtistStatus, type MixPreset, type MixArtist,
  makeStudioArchive, parseBatchText, readStudioArchive, STUDIO_LIMIT, validPreset, formatMix,
} from '@/core/studio'
import {
  readStudioData, putStudioProfile, putStudioPreset, deleteStudioPreset,
  replaceStudioData,
} from '@/data/localDatabase'

const profiles = shallowRef<ArtistProfile[]>([])
const presets = shallowRef<MixPreset[]>([])
const status = ref<'loading' | 'ready' | 'unavailable'>('loading')
let initialized: Promise<void> | null = null
let pending: Promise<unknown> = Promise.resolve()

function queued<T>(run: () => Promise<T>): Promise<T> {
  const result = pending.then(run, run)
  pending = result.catch(() => {})
  return result
}

function initStudio() {
  initialized ??= (async () => {
    try {
      const data = await readStudioData()
      profiles.value = data.profiles
      presets.value = data.presets.sort((a, b) => b.updatedAt - a.updatedAt)
      status.value = 'ready'
    } catch { status.value = 'unavailable' }
  })()
  return initialized
}

function profileOf(name: string) { return profiles.value.find(p => p.name === name) }

function updateProfile(
  name: string,
  patch: Partial<Pick<ArtistProfile, 'rating' | 'role' | 'status' | 'note'>>,
) {
  return queued(async () => {
    await initStudio()
    const old = profileOf(name)
    const next: ArtistProfile = {
      name, rating: old?.rating ?? null, role: old?.role ?? 'either',
      status: old?.status ?? 'neutral', note: old?.note ?? '',
      ...patch, updatedAt: Date.now(),
    }
    if (next.rating !== null && (!Number.isFinite(next.rating) || next.rating < 0 || next.rating > 10 || next.rating * 2 % 1 !== 0)) {
      throw new Error('画师评分只能为 0–10，间隔 0.5')
    }
    if (next.note.length > 500) throw new Error('画师备注不能超过 500 字')
    if (status.value === 'ready') {
      try { await putStudioProfile(next) }
      catch { status.value = 'unavailable' }
    }
    profiles.value = [...profiles.value.filter(p => p.name !== name), next]
    return next
  })
}

function savePreset(input: Omit<MixPreset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  return queued(async () => {
    await initStudio()
    const old = presets.value.find(p => p.id === input.id)
    const now = Date.now()
    const entry: MixPreset = {
      ...input, artists: input.artists.map(a => ({ ...a })),
      id: old?.id || crypto.randomUUID(), createdAt: old?.createdAt || now, updatedAt: now,
    }
    if (!validPreset(entry)) throw new Error('组合无效，请确认有且仅有一位主画师，权重在 0–2')
    if (!old && presets.value.length >= STUDIO_LIMIT) throw new Error('最多保存 1000 套组合')
    if (status.value === 'ready') {
      try { await putStudioPreset(entry) } catch { status.value = 'unavailable' }
    }
    presets.value = [entry, ...presets.value.filter(p => p.id !== entry.id)]
    return entry
  })
}

function removePreset(id: string) {
  return queued(async () => {
    await initStudio()
    if (status.value === 'ready') {
      try { await deleteStudioPreset(id) } catch { status.value = 'unavailable' }
    }
    presets.value = presets.value.filter(p => p.id !== id)
  })
}

function mergeImported(nextProfiles: ArtistProfile[], nextPresets: MixPreset[]) {
  return queued(async () => {
    await initStudio()
    if (status.value !== 'ready') throw new Error('浏览器持久存储不可用，不能安全导入')
    const profileMap = new Map(profiles.value.map(p => [p.name, p]))
    const presetMap = new Map(presets.value.map(p => [p.id, p]))
    const signature = (p: MixPreset) => formatMix(p.artists, p.format, p.withPrefix, p.precision)
    const signatures = new Set(presets.value.map(signature))
    let addedProfiles = 0, addedPresets = 0
    for (const p of nextProfiles) if (!profileMap.has(p.name)) { profileMap.set(p.name, p); addedProfiles++ }
    for (const p of nextPresets) {
      const sig = signature(p)
      if (!presetMap.has(p.id) && !signatures.has(sig)) {
        presetMap.set(p.id, p); signatures.add(sig); addedPresets++
      }
    }
    if (profileMap.size > STUDIO_LIMIT || presetMap.size > STUDIO_LIMIT) throw new Error('导入后超过单类 1000 条的上限，请先整理数据')
    const mergedProfiles = [...profileMap.values()]
    const mergedPresets = [...presetMap.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    await replaceStudioData(mergedProfiles, mergedPresets)
    profiles.value = mergedProfiles
    presets.value = mergedPresets
    return { profiles: addedProfiles, presets: addedPresets }
  })
}

function importStudioJson(input: unknown) {
  const archive = readStudioArchive(input)
  return mergeImported(archive.profiles, archive.presets)
}

function importStudioText(input: string) {
  const entries = parseBatchText(input)
  return mergeImported([], entries)
}

function exportStudio() { return makeStudioArchive(profiles.value, presets.value) }

export function useStudio() {
  return {
    profiles, presets, status, initStudio, profileOf, updateProfile, savePreset,
    removePreset, importStudioJson, importStudioText, exportStudio,
  }
}

export type { ArtistRole, ArtistStatus, MixArtist }
