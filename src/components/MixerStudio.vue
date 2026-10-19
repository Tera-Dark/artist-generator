<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { usePreferences } from '@/composables/usePreferences'
import { useStudio } from '@/composables/useStudio'
import { useVault } from '@/composables/useVault'
import { loadArtistLibrary } from '@/data/artistLibrary'
import type { Artist } from '@/core/generator'
import { formatMix, exportBatchText, STUDIO_FILE_LIMIT, type MixArtist, type MixFormat, type MixPreset } from '@/core/studio'
import { copyText } from '@/utils/clipboard'

const props = defineProps<{ request: { name: string; role: 'main' | 'support'; nonce: number } | null }>()
const studio = useStudio()
const vault = useVault()
const prefs = usePreferences()
const available = shallowRef<readonly Artist[]>([])
const loading = ref(true)
const selected = ref<MixArtist[]>([])
const query = ref('')
const activeRole = ref<'main' | 'support'>('support')
const poolMode = ref<'all' | 'favorite' | 'rated'>('all')
const auxCount = ref(4)
const mainPinned = ref(true)
const format = ref<MixFormat>('nai')
const withPrefix = ref(true)
const presetName = ref('')
const presetId = ref('')
const notice = ref('')
const error = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const savedQuery = ref('')

const precision = computed(() => prefs.generator.weightPrecision)
const nameSet = computed(() => new Set(available.value.map(a => a.name)))
const suggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return available.value.filter(a => a.name.toLowerCase().includes(q)).slice(0, 8)
})
const output = computed(() => selected.value.length && selected.value.some(a => a.role === 'main')
  ? formatMix(selected.value, format.value, withPrefix.value, precision.value) : '')
const filteredPresets = computed(() => {
  const q = savedQuery.value.trim().toLowerCase()
  return studio.presets.value.filter(p => !q || p.title.toLowerCase().includes(q) || p.artists.some(a => a.name.toLowerCase().includes(q))).slice(0, 40)
})
const favoriteCount = computed(() => studio.profiles.value.filter(p => p.status === 'favorite').length)

function announce(message: string, isError = false) { notice.value = message; error.value = isError }
function decimal(v: number) { return v.toFixed(precision.value) }
function newArtist(name: string, role: 'main' | 'support'): MixArtist {
  return { name, role, weight: role === 'main' ? 1.1 : 0.5, locked: role === 'main' }
}
function selectName(name: string, role: 'main' | 'support' = activeRole.value) {
  name = name.trim()
  if (!nameSet.value.has(name)) { announce('请从本地画师库中选择有效的画师名', true); return }
  const without = selected.value.filter(a => a.name !== name)
  if (role === 'main') {
    selected.value = [newArtist(name, 'main'), ...without.filter(a => a.role === 'support')]
    mainPinned.value = true
  } else {
    if (selected.value.find(a => a.name === name)?.role === 'main') {
      announce('当前画师已经是主画师', true); return
    }
    selected.value = [...without, newArtist(name, 'support')]
  }
  query.value = ''
  presetId.value = ''
}
function applyRequest(request: NonNullable<typeof props.request>) {
  if (!available.value.length) return
  selectName(request.name, request.role)
}
watch(() => props.request?.nonce, () => { if (props.request) applyRequest(props.request) })
onMounted(async () => {
  await Promise.all([studio.initStudio(), vault.init()])
  try { available.value = await loadArtistLibrary() }
  catch { announce('本地画师数据载入失败，请刷新页面', true) }
  finally { loading.value = false }
  if (props.request) applyRequest(props.request)
})

function editWeight(name: string, value: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return
  selected.value = selected.value.map(a => a.name === name ? { ...a, weight: Math.max(0, Math.min(2, n)) } : a)
  presetId.value = ''
}
function toggleLock(name: string) {
  selected.value = selected.value.map(a => a.name === name ? { ...a, locked: !a.locked } : a)
  presetId.value = ''
}
function remove(name: string) {
  selected.value = selected.value.filter(a => a.name !== name)
  presetId.value = ''
}
function candidatePool(role: 'main' | 'support', exclude: Set<string>) {
  const profiles = new Map(studio.profiles.value.map(p => [p.name, p]))
  return available.value.filter(a => {
    if (exclude.has(a.name) || (prefs.generator.excludeNumericSuffix && /\d$/.test(a.name))) return false
    const p = profiles.get(a.name)
    if (p?.status === 'blocked') return false
    if (p?.role && p.role !== 'either' && p.role !== role) return false
    if (poolMode.value === 'favorite' && p?.status !== 'favorite') return false
    if (poolMode.value === 'rated' && (p?.rating ?? 0) < 8) return false
    return a.post_count >= prefs.generator.minPosts
  })
}
function chooseOne(pool: readonly Artist[]) {
  if (!pool.length) throw new Error('符合条件的画师不足，请切换画师池或降低筛选条件')
  return pool[Math.floor(Math.random() * pool.length)]!.name
}
function randomWeight(min: number, max: number) {
  const places = 10 ** precision.value
  return Math.round((min + Math.random() * (max - min)) * places) / places
}
function shuffle(onlyAux = false) {
  try {
    if (loading.value) return
    const pinned = selected.value.find(a => a.role === 'main')
    let main: MixArtist
    if (pinned && (mainPinned.value || onlyAux)) main = { ...pinned }
    else {
      const name = chooseOne(candidatePool('main', new Set()))
      main = { ...newArtist(name, 'main'), weight: randomWeight(1, 1.3), locked: false }
    }
    const keep = selected.value.filter(a => a.role === 'support' && a.locked && a.name !== main.name)
    const want = Math.max(0, Math.min(20, Math.trunc(auxCount.value || 0)))
    if (keep.length > want) throw new Error('锁定的辅助画师数量超过目标数量')
    const used = new Set([main.name, ...keep.map(a => a.name)])
    const supports = [...keep]
    while (supports.length < want) {
      const candidate = chooseOne(candidatePool('support', used))
      used.add(candidate)
      supports.push({ ...newArtist(candidate, 'support'), weight: randomWeight(0.3, 0.8), locked: false })
    }
    selected.value = [main, ...supports]
    presetId.value = ''
    announce('已更新组合；锁定的画师保持不变')
  } catch (cause) { announce(cause instanceof Error ? cause.message : '随机组合失败', true) }
}
function rerollWeights() {
  selected.value = selected.value.map(a => a.locked ? a : {
    ...a, weight: a.role === 'main' ? randomWeight(1, 1.3) : randomWeight(0.3, 0.8),
  })
  presetId.value = ''
  announce('已更新未锁定画师的权重')
}
async function copyOutput() {
  if (!output.value) return
  try { await copyText(output.value); announce('画师串已复制') }
  catch { announce('复制失败，请手动选中文本', true) }
}
async function save() {
  if (!output.value) { announce('请至少设置一位主画师', true); return }
  try {
    const entry = await studio.savePreset({
      id: presetId.value || undefined,
      title: presetName.value.trim() || `画师组合 ${new Date().toLocaleDateString('zh-CN')}`,
      artists: selected.value, format: format.value, withPrefix: withPrefix.value, precision: precision.value,
    })
    presetId.value = entry.id
    presetName.value = entry.title
    if (!vault.favorites.value.some(v => v.text === output.value)) {
      await vault.toggleFavorite(output.value, selected.value.map(a => a.name), format.value, 'edited')
    }
    announce(studio.status.value === 'ready' ? '已持久保存组合，并加入「我的串」收藏' : '仅本次会话暂存，建议导出 JSON')
  } catch (cause) { announce(cause instanceof Error ? cause.message : '保存失败', true) }
}
function restore(p: MixPreset) {
  selected.value = p.artists.map(a => ({ ...a }))
  format.value = p.format
  withPrefix.value = p.withPrefix
  presetName.value = p.title
  presetId.value = p.id
  mainPinned.value = true
  announce('已载入保存的组合')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function discard(id: string) {
  if (!window.confirm('确定删除这套精选组合吗？已单独收藏的画师串不受影响。')) return
  await studio.removePreset(id)
  if (presetId.value === id) presetId.value = ''
  announce('已删除组合')
}
function updateStatus(name: string, status: 'favorite' | 'neutral' | 'blocked') {
  void studio.updateProfile(name, { status }).catch(e => announce(String(e), true))
}
function updateRole(name: string, role: 'main' | 'support' | 'either') {
  void studio.updateProfile(name, { role }).catch(e => announce(String(e), true))
}
function updateNote(name: string, note: string) {
  void studio.updateProfile(name, { note }).catch(e => announce(String(e), true))
}
function updateRating(name: string, raw: string) {
  const rating = raw === '' ? null : Number(raw)
  void studio.updateProfile(name, { rating }).catch(e => announce(String(e), true))
}
function download(content: string, fileName: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url; link.download = fileName; document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function exportJson() {
  download(JSON.stringify(studio.exportStudio(), null, 2), 'artist-studio-backup.json', 'application/json')
  announce('已导出全部个人评分和精选组合（JSON v1）')
}
function exportTxt() {
  download(exportBatchText(studio.presets.value), 'artist-studio-strings.txt', 'text/plain;charset=utf-8')
  announce('已导出精选画师串（一行一组）')
}
async function importFile(event: Event) {
  const el = event.target as HTMLInputElement
  const file = el.files?.[0]
  if (!file) return
  try {
    if (file.size > STUDIO_FILE_LIMIT) throw new Error('文件过大，最多 2 MB')
    const text = await file.text()
    const result = file.name.toLowerCase().endsWith('.json')
      ? await studio.importStudioJson(JSON.parse(text))
      : await studio.importStudioText(text)
    announce(`导入成功：新增 ${result.presets} 组画师串、${result.profiles} 条个人资料（已自动去重）`)
  } catch (cause) { announce(cause instanceof Error ? cause.message : '导入失败', true) }
  finally { el.value = '' }
}
</script>

<template>
  <div class="studio">
    <p class="studio-eyebrow">ARTIST STUDIO / 专业混合</p>
    <h1>画师混合实验室<span class="dot">.</span></h1>
    <p class="studio-desc">锁定主画师，挑选辅助画师并独立调权。喜欢的组合可长期保存，也可以批量导入导出。</p>
    <p v-if="studio.status.value === 'unavailable'" class="studio-warn">浏览器拒绝 IndexedDB，当前更改仅在本次页面会话保留，请检查存储权限。</p>
    <div class="studio-grid">
      <section class="studio-panel" aria-label="画师选择">
        <h2>01 / 选择画师</h2>
        <div class="studio-row">
          <label class="studio-field">加入位置
            <select v-model="activeRole"><option value="main">主画师</option><option value="support">辅助画师</option></select>
          </label>
          <label class="studio-field studio-grow">搜索画师
            <input v-model="query" type="search" :disabled="loading" placeholder="输入 Danbooru 画师名称" @keydown.enter.prevent="suggestions[0] && selectName(suggestions[0].name)" />
          </label>
        </div>
        <div v-if="query" class="studio-suggestions">
          <button v-for="item in suggestions" :key="item.name" type="button" @click="selectName(item.name)">
            <span>{{ item.name }}</span><small>{{ item.post_count }} posts</small>
          </button>
          <p v-if="!suggestions.length">没有匹配的画师</p>
        </div>
        <div class="studio-row studio-top-gap">
          <label class="studio-field studio-grow">随机画师池
            <select v-model="poolMode">
              <option value="all">所有画师（自动排除黑名单）</option>
              <option value="favorite">仅个人喜欢的画师（{{ favoriteCount }}）</option>
              <option value="rated">仅评分达到 8 分的画师</option>
            </select>
          </label>
          <label class="studio-field studio-small">辅助数量
            <input v-model.number="auxCount" type="number" min="0" max="20" />
          </label>
        </div>
        <label class="studio-inline"><input v-model="mainPinned" type="checkbox" /> 随机时固定当前主画师</label>
        <div class="studio-actions">
          <button type="button" class="studio-primary" :disabled="loading" @click="shuffle(false)">生成主辅组合</button>
          <button type="button" :disabled="loading" @click="shuffle(true)">只重抽辅助</button>
          <button type="button" @click="rerollWeights">只重随权重</button>
        </div>
      </section>
      <section class="studio-panel" aria-label="组合编辑">
        <h2>02 / 可视化编辑</h2>
        <p v-if="!selected.length" class="studio-empty">还没有画师，先搜索或随机生成一组。</p>
        <div v-for="item in selected" :key="item.name" class="studio-artist">
          <div class="studio-artist-top">
            <span class="studio-role">{{ item.role === 'main' ? '主' : '辅' }}</span>
            <strong :title="item.name">{{ item.name }}</strong>
            <button type="button" class="studio-minor" :aria-label="item.locked ? '解除锁定' : '锁定画师'" @click="toggleLock(item.name)">{{ item.locked ? '🔒 锁定' : '锁定' }}</button>
            <button type="button" class="studio-minor" :aria-label="'移除 '+item.name" @click="remove(item.name)">移除</button>
          </div>
          <div class="studio-artist-bottom">
            <label>权重 <input type="number" min="0" max="2" :step="precision === 2 ? 0.01 : 0.1" :value="decimal(item.weight)" @change="editWeight(item.name, ($event.target as HTMLInputElement).value)" /></label>
            <label>评分 <select :value="studio.profileOf(item.name)?.rating ?? ''" @change="updateRating(item.name, ($event.target as HTMLSelectElement).value)">
              <option value="">未评分</option><option v-for="i in 21" :key="i" :value="(i-1)/2">{{ ((i-1)/2).toFixed(1) }}</option>
            </select></label>
            <label>适用角色 <select :value="studio.profileOf(item.name)?.role ?? 'either'" @change="updateRole(item.name, ($event.target as HTMLSelectElement).value as 'main' | 'support' | 'either')"><option value="either">主辅均可</option><option value="main">仅主画师</option><option value="support">仅辅助</option></select></label>
            <label>个人池 <select :value="studio.profileOf(item.name)?.status ?? 'neutral'" @change="updateStatus(item.name, ($event.target as HTMLSelectElement).value as 'favorite' | 'neutral' | 'blocked')">
              <option value="neutral">普通</option><option value="favorite">喜欢</option><option value="blocked">排除</option>
            </select></label>
          </div>
          <label class="studio-field studio-top-gap">个人备注 <input type="text" maxlength="500" :value="studio.profileOf(item.name)?.note ?? ''" placeholder="画风特点、混合表现……" @change="updateNote(item.name, ($event.target as HTMLInputElement).value)" /></label>
        </div>
        <div class="studio-row studio-top-gap">
          <label class="studio-field studio-grow">输出格式
            <select v-model="format"><option value="nai">NovelAI 格式</option><option value="standard">标准权重</option></select>
          </label>
          <label class="studio-inline"><input v-model="withPrefix" type="checkbox" /> artist: 前缀</label>
        </div>
        <p class="studio-help">权重保留 {{ precision }} 位小数（设置中修改）；单独调权或锁定后，可只重抽其他画师。</p>
      </section>
    </div>
    <section class="studio-panel studio-result">
      <h2>03 / 输出与保存</h2>
      <div class="studio-code">{{ output || '先添加主画师' }}</div>
      <div class="studio-row studio-top-gap">
        <label class="studio-field studio-grow">组合名称
          <input v-model="presetName" maxlength="100" placeholder="例如：清透浅色系肖像" />
        </label>
        <button type="button" @click="copyOutput" :disabled="!output">复制画师串</button>
        <button type="button" class="studio-primary" @click="save" :disabled="!output">保存精选组合</button>
      </div>
    </section>
    <section class="studio-panel">
      <div class="studio-row studio-between">
        <div><h2>04 / 我的精选组合</h2><p class="studio-help">当前已保存 {{ studio.presets.value.length }} 组，IndexedDB 本地持久保存；JSON 可完整备份，TXT 一行一组。</p></div>
        <div class="studio-actions">
          <button type="button" @click="exportJson">导出 JSON</button>
          <button type="button" @click="exportTxt" :disabled="!studio.presets.value.length">批量导出 TXT</button>
          <button type="button" @click="fileInput?.click()">批量导入</button>
          <input ref="fileInput" class="studio-hidden" type="file" accept=".json,.txt,application/json,text/plain" @change="importFile" />
        </div>
      </div>
      <p class="studio-help">TXT：一行一套完整画师串，允许 NAI 或标准权重；忽略空行和以 # 开头的注释。JSON：studio-data v1，包含个人评分、黑名单及精选组合，合并导入不覆盖现有内容。</p>
      <input v-model="savedQuery" class="studio-search" type="search" placeholder="搜索已保存的组合名或画师…" />
      <p v-if="!filteredPresets.length" class="studio-empty">暂无匹配的精选组合。</p>
      <div v-for="p in filteredPresets" :key="p.id" class="studio-saved">
        <div class="studio-saved-title"><strong>{{ p.title }}</strong><small>{{ p.artists.length }} 位 · {{ new Date(p.updatedAt).toLocaleDateString('zh-CN') }}</small></div>
        <p>{{ formatMix(p.artists, p.format, p.withPrefix, p.precision) }}</p>
        <div class="studio-actions"><button type="button" @click="restore(p)">载入编辑</button><button type="button" @click="copyText(formatMix(p.artists, p.format, p.withPrefix, p.precision)).then(() => announce('已复制')).catch(() => announce('复制失败', true))">复制</button><button type="button" @click="discard(p.id)">删除</button></div>
      </div>
      <p v-if="studio.presets.value.length > 40" class="studio-help">最多展示 40 条，可通过搜索找到更早的组合。</p>
    </section>
    <p v-if="notice" class="studio-message" :class="{ 'studio-error': error }" role="status">{{ notice }}</p>
  </div>
</template>

<style scoped>
.studio { max-width:1120px;margin:0 auto;padding:16px 0 70px;color:var(--text-primary,inherit) }
.studio-eyebrow { font-size:12px;letter-spacing:.16em;font-weight:700;color:#548e80 }
.studio h1 { font-size:clamp(29px,4vw,44px);line-height:1.15;margin:8px 0 12px }
.dot { color:#479b84 }
.studio-desc,.studio-help { color:var(--text-muted,#87918d);line-height:1.65;font-size:13px }
.studio-desc { margin-bottom:22px;font-size:15px }
.studio-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px }
.studio-panel { border:1px solid #95a79c45;border-radius:16px;padding:22px;margin-bottom:16px;background:var(--surface,#ffffff08);min-width:0 }
.studio h2 { font-size:16px;margin:0 0 18px;font-weight:700 }
.studio-row { display:flex;align-items:end;gap:12px;flex-wrap:wrap }
.studio-grow { flex:1;min-width:155px }.studio-small { width:104px }
.studio-field { display:flex;flex-direction:column;gap:8px;font-size:12px;font-weight:600;min-width:0 }
.studio input:not([type=checkbox]),.studio select { padding:10px 12px;background:var(--surface-secondary,#f5f8f6);color:inherit;border:1px solid #95a79c77;border-radius:8px;width:100%;min-height:40px }
.studio button { border:1px solid #9ab2a44f;border-radius:8px;padding:9px 12px;font-weight:600;font-size:12px;background:var(--surface-secondary,#f5f8f6);color:inherit;cursor:pointer }
.studio button:hover { border-color:#59a38a }.studio button:disabled { opacity:.45;cursor:not-allowed }
.studio button.studio-primary { background:#317e6b;color:white;border-color:#317e6b }
.studio-actions { display:flex;gap:8px;flex-wrap:wrap;margin-top:14px }
.studio-top-gap { margin-top:16px }
.studio-inline { display:flex;align-items:center;gap:7px;font-size:12px;white-space:nowrap;margin:12px 0 0 }
.studio-inline input { accent-color:#317e6b }
.studio-suggestions { padding:6px 0;max-height:260px;overflow:auto;border-bottom:1px solid #95a79c55 }
.studio-suggestions button { width:100%;display:flex;justify-content:space-between;text-align:left;border:0;background:transparent }
.studio-suggestions small { color:#7d968a }
.studio-artist { border:1px solid #96aa9c55;border-radius:10px;padding:12px;margin-bottom:10px }
.studio-artist-top { display:flex;gap:8px;align-items:center;flex-wrap:wrap }
.studio-artist-top strong { flex:1;overflow-wrap:anywhere;font-size:14px }
.studio-role { background:#317e6b;color:white;border-radius:5px;padding:3px 6px;font-size:11px }
.studio-artist-top button.studio-minor { border:0;padding:5px;background:transparent }
.studio-artist-bottom { display:flex;flex-wrap:wrap;gap:10px;margin-top:12px }
.studio-artist-bottom label { display:flex;align-items:center;gap:6px;font-size:12px }
.studio-artist-bottom input { max-width:90px }.studio-artist-bottom select { max-width:115px }
.studio-code { word-break:break-word;line-height:1.9;padding:18px;background:var(--surface-secondary,#f4f7f5);border-radius:10px;font-family:monospace;font-size:13px;min-height:76px }
.studio-between { justify-content:space-between;align-items:start }.studio-between .studio-actions { margin-top:0 }
.studio-search { max-width:410px;margin:12px 0 }
.studio-saved { border-top:1px solid #95a79c44;padding:14px 0 }
.studio-saved-title { display:flex;align-items:center;gap:12px;justify-content:space-between }
.studio-saved small { color:#84958b }
.studio-saved p { overflow-wrap:anywhere;font-family:monospace;font-size:12px;line-height:1.6;opacity:.85 }
.studio-saved .studio-actions { margin-top:8px }
.studio-empty { font-size:13px;opacity:.65;padding:14px 0 }
.studio-message,.studio-warn { padding:12px;border:1px solid #63a48c;border-radius:8px;margin:10px 0 }
.studio-error,.studio-warn { border-color:#c38677 }
.studio-hidden { display:none }
@media(max-width:800px){.studio-grid{grid-template-columns:1fr}.studio-panel{padding:16px}.studio-row{align-items:stretch}.studio h1{font-size:30px}}
</style>
