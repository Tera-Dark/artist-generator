<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bookmark, Check, Copy, Download, FileUp, History, PencilLine, Trash2, X, Database, ImageOff } from 'lucide-vue-next'
import { useVault } from '@/composables/useVault'
import { copyText } from '@/utils/clipboard'
import { clearArtworkCache } from '@/data/danbooru'
import { MAX_ARCHIVE_BYTES, type SavedString } from '@/core/dataFormat'

const emit = defineEmits<{ edit: [text: string] }>()
const vault = useVault()
const view = ref<'history' | 'favorites'>('history')
const search = ref('')
const pageSize = ref(20)
const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const error = ref(false)
const busy = ref(false)
const persisted = ref<boolean | null>(null)
const canPersist = ref(false)
const number = new Intl.NumberFormat('zh-CN')

const filtered = computed(() => {
  const q = search.value.trim().toLocaleLowerCase()
  const source = view.value === 'history' ? vault.history.value : vault.favorites.value
  return q ? source.filter((item) => `${item.text} ${item.names.join(' ')}`.toLocaleLowerCase().includes(q)) : source
})
const visible = computed(() => filtered.value.slice(0, pageSize.value))

onMounted(async () => {
  canPersist.value = typeof navigator.storage?.persist === 'function'
  await vault.init()
  try { persisted.value = await navigator.storage?.persisted?.() ?? null } catch { /* Optional API. */ }
})

function notify(text: string, isError = false) { message.value = text; error.value = isError }

function dateTime(ms: number) { return new Date(ms).toLocaleString('zh-CN', { hour12: false }) }

async function copy(item: SavedString) {
  try { await copyText(item.text); notify('已复制画师串') }
  catch { notify('自动复制不可用，请手动选中文本。', true) }
}

async function favorite(item: SavedString) {
  try {
    const added = await vault.toggleFavorite(item.text, item.names, item.mode, item.source)
    notify(added ? vault.storageStatus.value === 'ready' ? '已加入本地收藏' : '仅本次会话收藏；请导出备份' : '已从收藏中移除')
  } catch (cause) {
    notify(cause instanceof Error ? cause.message : '收藏失败', true)
  }
}

async function remove(item: SavedString) {
  if (!window.confirm('确定删除这条记录吗？此操作无法撤销，已导出的备份不受影响。')) return
  await vault.removeSaved(view.value, item.id)
  notify(view.value === 'history' ? '已删除这条历史' : '已删除这条收藏')
}

function exportData() {
  const content = JSON.stringify(vault.exportArchive()) // Compact backups stay small enough to restore.
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `artist-generator-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notify('已导出版本 1 的 JSON 文件')
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  busy.value = true
  try {
    if (file.size > MAX_ARCHIVE_BYTES) throw new Error('文件超过 32 MB，请精简后再导入。')
    const archive: unknown = JSON.parse(await file.text())
    const added = await vault.importArchive(archive)
    notify(`已合并导入：历史 ${added.history} 条，收藏 ${added.favorites} 条。重复 ID / 内容不会再次加入。`)
  } catch (cause) {
    notify(cause instanceof Error ? cause.message : '文件无法解析', true)
  } finally {
    busy.value = false
    input.value = ''
  }
}

async function enablePersistence() {
  try {
    persisted.value = await navigator.storage.persist()
    notify(persisted.value ? '浏览器已允许持久化存储。' : '浏览器未授予持久化权限；建议定期导出备份。', !persisted.value)
  } catch { notify('当前浏览器不支持申请持久化存储。', true) }
}

async function clearImages() {
  try { await clearArtworkCache(); notify('图片缩略图与查询缓存已清理。') }
  catch { notify('无法清理图片缓存，请检查浏览器存储权限。', true) }
}
</script>

<template>
  <section class="saved-page">
    <div class="page-header">
      <p class="section-eyebrow">YOUR LOCAL SPACE / 我的串</p>
      <h1>灵感，留在这里<span class="title-period">.</span></h1>
      <p class="page-subtitle">生成记录自动保留；喜欢的结果单独收藏。数据只存在这个浏览器，可随时导入、导出。</p>
    </div>

    <div v-if="vault.storageStatus.value === 'unavailable'" class="storage-warning" role="alert">浏览器阻止了 IndexedDB：当前记录只在本次打开期间有效。请检查隐私模式或存储权限。</div>
    <div v-else-if="vault.storageStatus.value === 'loading'" class="storage-warning">正在读取本地记录…</div>

    <div class="saved-controlbar">
      <div class="saved-tabs" role="group" aria-label="记录类型">
        <button type="button" :aria-pressed="view === 'history'" @click="view = 'history'; pageSize = 20"><History :size="17" aria-hidden="true" /> 历史 <span>{{ number.format(vault.history.value.length) }}</span></button>
        <button type="button" :aria-pressed="view === 'favorites'" @click="view = 'favorites'; pageSize = 20"><Bookmark :size="17" aria-hidden="true" /> 收藏 <span>{{ number.format(vault.favorites.value.length) }}</span></button>
      </div>
      <input v-model="search" type="search" class="saved-search" placeholder="在记录中搜索…" aria-label="搜索历史和收藏" />
    </div>

    <div v-if="!visible.length" class="empty-surface saved-empty">
      <component :is="view === 'history' ? History : Bookmark" :size="26" aria-hidden="true" />
      <strong>{{ search ? '没有匹配的画师串' : view === 'history' ? '还没有生成记录' : '收藏夹还是空的' }}</strong>
      <span>去工作区生成一串，或者把喜欢的结果加入收藏。</span>
    </div>
    <div v-else class="saved-list">
      <article v-for="item in visible" :key="item.id" class="saved-card panel">
        <div class="saved-card-head"><span>{{ item.source === 'edited' ? '编辑结果' : item.source === 'imported' ? '导入记录' : '随机生成' }} · {{ item.names.length }} 位画师</span><time :datetime="new Date(item.createdAt).toISOString()">{{ dateTime(item.createdAt) }}</time></div>
        <p class="saved-text">{{ item.text }}</p>
        <div class="saved-actions">
          <button type="button" @click="copy(item)"><Copy :size="15" aria-hidden="true" /> 复制</button>
          <button type="button" @click="emit('edit', item.text)"><PencilLine :size="15" aria-hidden="true" /> 继续编辑</button>
          <button type="button" @click="favorite(item)">
            <Check v-if="vault.favorites.value.some((fav) => fav.text === item.text)" :size="15" aria-hidden="true" />
            <Bookmark v-else :size="15" aria-hidden="true" />
            {{ vault.favorites.value.some((fav) => fav.text === item.text) ? '已收藏' : '收藏' }}
          </button>
          <button type="button" class="danger-action" :aria-label="`删除记录：${item.text.slice(0, 24)}`" @click="remove(item)"><Trash2 :size="15" aria-hidden="true" /> 删除</button>
        </div>
      </article>
      <button v-if="filtered.length > visible.length" type="button" class="more-button" @click="pageSize += 20">再显示 20 条</button>
    </div>

    <section class="data-panel panel" aria-labelledby="data-heading">
      <div class="data-panel-header"><div><p class="section-eyebrow">BACKUP & STORAGE</p><h2 id="data-heading">本地数据管理</h2></div><Database :size="21" aria-hidden="true" /></div>
      <p>使用 <code>artist-generator.local-data</code> v1 JSON 规范。导入采用合并方式：历史按 ID 去重，收藏按内容去重；图片和登录信息不会导出。</p>
      <div class="data-actions">
        <button type="button" @click="exportData"><Download :size="17" aria-hidden="true" /> 导出 JSON</button>
        <button type="button" :disabled="busy" @click="fileInput?.click()"><FileUp :size="17" aria-hidden="true" /> 导入 JSON</button>
        <input ref="fileInput" class="screen-reader-only" type="file" accept=".json,application/json" aria-label="选择本地 JSON 文件" @change="importData" />
      </div>
      <div class="data-divider"></div>
      <div class="storage-actions">
        <span>浏览器存储默认可能被清理。{{ persisted === true ? '已获得持久化权限。' : '重要收藏建议定期导出备份。' }}</span>
        <button v-if="persisted !== true && canPersist" type="button" @click="enablePersistence">申请持久化</button>
        <button type="button" @click="clearImages"><ImageOff :size="16" aria-hidden="true" /> 清理图片缓存</button>
      </div>
    </section>
    <p v-if="message" class="inline-message" :class="{ 'message-error': error }" role="status"><X v-if="error" :size="15" aria-hidden="true" /><Check v-else :size="15" aria-hidden="true" /> {{ message }}</p>
  </section>
</template>
