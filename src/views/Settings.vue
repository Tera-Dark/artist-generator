<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/common/AppHeader.vue'
import {
  Archive,
  Download,
  FolderHeart,
  FolderPlus,
  Languages,
  MonitorCog,
  MoonStar,
  Palette,
  Pencil,
  Sparkles,
  SunMedium,
  Trash2,
  Upload,
  UserRoundPlus,
} from 'lucide-vue-next'
import { useGeneratorStore } from '@/stores/generator'
import {
  applyThemePreference,
  getStoredThemePreference,
  setStoredLocale,
  type AppLocale,
  type ThemePreference,
} from '@/services/preferences'
import type { OfflineCollection } from '@/types'

const { t, locale } = useI18n()
const store = useGeneratorStore()

const currentTheme = ref<ThemePreference>(getStoredThemePreference())
const importInputRef = ref<HTMLInputElement | null>(null)
const newProfileName = ref('')
const newCollectionName = ref('')
const newCollectionDescription = ref('')
const collectionSearchQuery = ref('')

const themeOptions = computed<Array<{
  value: ThemePreference
  title: string
  description: string
  icon: typeof SunMedium
  previewClass: string
}>>(() => [
  {
    value: 'light',
    title: t('settings.theme_light'),
    description: '明亮、轻盈，适合长时间浏览和整理收藏。',
    icon: SunMedium,
    previewClass: 'from-white via-sky-50 to-amber-50 border-sky-200',
  },
  {
    value: 'dark',
    title: t('settings.theme_dark'),
    description: '降低眩光，适合夜间筛选 Prompt 和画师。',
    icon: MoonStar,
    previewClass: 'from-neutral-900 via-slate-900 to-neutral-800 border-neutral-700',
  },
  {
    value: 'system',
    title: t('settings.theme_system'),
    description: '跟随设备自动切换，兼顾白天和夜间使用。',
    icon: MonitorCog,
    previewClass: 'from-slate-100 via-white to-slate-900 border-slate-300',
  },
])

const languageOptions = computed<Array<{
  value: AppLocale
  title: string
  description: string
  badge: string
}>>(() => [
  {
    value: 'zh',
    title: '中文',
    description: '保留当前中文信息架构和说明文案。',
    badge: 'CN',
  },
  {
    value: 'en',
    title: 'English',
    description: 'Switch the product copy to English.',
    badge: 'EN',
  },
])

const activeProfile = computed(() => store.activeOfflineProfile)
const collectionsCount = computed(() => store.activeLocalCollections.length)
const defaultCollectionPromptCount = computed(() => store.defaultCollection?.prompts.length || 0)
const defaultCollectionArtistCount = computed(() => store.defaultCollection?.artists.length || 0)
const draftsCount = computed(() => store.activeDraftCount)
const recentDrafts = computed(() => store.activeLocalDrafts.slice(0, 4))
const filteredCollections = computed(() => {
  const keyword = collectionSearchQuery.value.trim().toLowerCase()
  if (!keyword) return store.activeLocalCollections

  return store.activeLocalCollections.filter((collection) => {
    const name = collection.name.toLowerCase()
    const description = String(collection.description || '').toLowerCase()
    const promptMatch = collection.prompts.some((entry) => {
      const title = String(entry.snapshot.title || '').toLowerCase()
      const prompt = String(entry.snapshot.prompt || '').toLowerCase()
      return title.includes(keyword) || prompt.includes(keyword)
    })
    const artistMatch = collection.artists.some((entry) =>
      entry.snapshot.name.toLowerCase().includes(keyword),
    )

    return name.includes(keyword) || description.includes(keyword) || promptMatch || artistMatch
  })
})

watch(currentTheme, (val) => {
  applyThemePreference(val)
})

const switchLanguage = (lang: AppLocale) => {
  locale.value = lang
  setStoredLocale(lang)
}

const handleCreateOfflineProfile = () => {
  const created = store.createOfflineProfile(newProfileName.value)
  if (!created) return

  newProfileName.value = ''
  store.addToast('success', '本地身份已创建', `当前正在使用 ${created.name}`, 1800)
}

const handleRenameOfflineProfile = () => {
  if (!activeProfile.value) return
  const nextName = prompt('请输入新的本地身份名称', activeProfile.value.name)
  if (!nextName) return

  if (store.renameOfflineProfile(activeProfile.value.id, nextName)) {
    store.addToast('success', '名称已更新', nextName, 1600)
  }
}

const handleDeleteOfflineProfile = () => {
  if (!activeProfile.value) return
  if (!confirm('删除这个本地身份后，其收藏夹和草稿也会一起删除，确定继续吗？')) return

  const deletedName = activeProfile.value.name
  if (!store.deleteOfflineProfile(activeProfile.value.id)) {
    store.addToast('warning', '无法删除', '至少保留一个本地身份', 1800)
    return
  }

  store.addToast('info', '已删除本地身份', deletedName, 1600)
}

const handleCreateCollection = () => {
  const collection = store.createLocalCollection(newCollectionName.value, newCollectionDescription.value)
  if (!collection) return

  newCollectionName.value = ''
  newCollectionDescription.value = ''
  store.addToast('success', '收藏夹已创建', `《${collection.name}》`, 1600)
}

const handleRenameCollection = (collection: OfflineCollection) => {
  const nextName = prompt('请输入新的收藏夹名称', collection.name)
  if (!nextName) return

  if (store.renameLocalCollection(collection.id, nextName, collection.description)) {
    store.addToast('success', '收藏夹已更新', nextName, 1500)
  }
}

const handleDeleteCollection = (collection: OfflineCollection) => {
  if (collection.isDefault) {
    store.addToast('warning', '默认收藏夹不可删除', '你可以新建更多收藏夹进行分类', 1800)
    return
  }

  if (!confirm(`确定删除收藏夹《${collection.name}》吗？`)) return
  if (store.deleteLocalCollection(collection.id)) {
    store.addToast('info', '收藏夹已删除', collection.name, 1500)
  }
}

const handleExportOfflineData = () => {
  const payload = store.exportOfflineData()
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date(payload.exportedAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.href = url
  link.download = `artist-generator-offline-backup-${date}.json`
  link.click()
  URL.revokeObjectURL(url)

  store.addToast('success', '已导出本地数据', '离线身份、收藏夹和草稿已打包保存', 1800)
}

const openImportPicker = () => {
  importInputRef.value?.click()
}

const handleImportOfflineData = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!confirm('导入会覆盖当前本地身份、收藏夹和草稿。建议先导出备份，确定继续吗？')) {
    input.value = ''
    return
  }

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const stats = store.importOfflineData(parsed)
    store.addToast(
      'success',
      '导入成功',
      `已导入 ${stats.profiles} 个身份、${stats.collections} 个收藏夹、${stats.drafts} 条草稿`,
      2600,
    )
  } catch (error) {
    console.error(error)
    store.addToast('error', '导入失败', '文件格式不正确或数据已损坏', 2200)
  } finally {
    input.value = ''
  }
}

onMounted(() => {
  store.loadFavorites()
})
</script>

<template>
  <div class="app-shell min-h-screen">
    <AppHeader :sectionLabel="t('settings.title')" />

    <main class="section section-spacing">
      <div class="page-stack">
        <section class="hero-panel hero-panel-accent">
          <div class="hero-layout xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div class="hero-eyebrow">
                <Sparkles class="w-4 h-4" />
                Workspace Settings
              </div>
              <h1 class="hero-title">
                {{ t('settings.title') }}
              </h1>
              <p class="hero-body">
                把外观、本地身份、收藏夹和草稿工作流统一收在这里，保证你的使用偏好在本机持续保存。
              </p>
            </div>

            <div class="metric-grid-2">
              <div class="metric-tile">
                <div class="metric-label">本地身份</div>
                <div class="mt-3 text-xl font-black text-neutral-900 dark:text-neutral-100">
                  {{ activeProfile?.name || '本地用户' }}
                </div>
                <div class="metric-copy">
                  当前离线资料归属
                </div>
              </div>
              <div class="metric-tile">
                <div class="metric-label">收藏夹</div>
                <div class="mt-3 text-xl font-black text-neutral-900 dark:text-neutral-100">
                  {{ collectionsCount }}
                </div>
                <div class="metric-copy">
                  当前身份可用的本地收藏夹
                </div>
              </div>
              <div class="metric-tile">
                <div class="metric-label">默认收藏</div>
                <div class="mt-3 text-xl font-black text-neutral-900 dark:text-neutral-100">
                  {{ defaultCollectionPromptCount }}/{{ defaultCollectionArtistCount }}
                </div>
                <div class="metric-copy">
                  Prompt / 画师
                </div>
              </div>
              <div class="metric-tile">
                <div class="metric-label">草稿箱</div>
                <div class="mt-3 text-xl font-black text-neutral-900 dark:text-neutral-100">
                  {{ draftsCount }}
                </div>
                <div class="metric-copy">
                  当前身份下的离线草稿
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div class="panel-card">
            <div class="section-head">
              <div class="section-icon">
                <Palette class="w-5 h-5" />
              </div>
              <div>
                <h2 class="section-title">{{ t('settings.appearance') }}</h2>
                <p class="section-description">跟主页和工作区保持统一的通透玻璃感和大面积留白。</p>
              </div>
            </div>

            <div class="mt-6 grid gap-4">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                type="button"
                class="group rounded-[1.75rem] border p-5 text-left transition-all duration-300"
                :class="currentTheme === option.value
                  ? 'border-primary-400 bg-primary-50/70 shadow-soft dark:border-primary-500 dark:bg-primary-900/15'
                  : 'border-neutral-200 hover:border-primary-300 hover:bg-white dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-950/60'"
                @click="currentTheme = option.value"
              >
                <div class="flex items-start gap-4">
                  <div class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-200">
                    <component :is="option.icon" class="w-5 h-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-lg font-black text-neutral-900 dark:text-neutral-100">{{ option.title }}</div>
                        <p class="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{{ option.description }}</p>
                      </div>
                      <div
                        class="h-16 w-24 rounded-2xl border bg-gradient-to-br"
                        :class="option.previewClass"
                      >
                        <div class="mx-3 mt-3 h-2 rounded-full bg-white/90 dark:bg-white/10"></div>
                        <div class="mx-3 mt-2 h-2 w-14 rounded-full bg-white/70 dark:bg-white/20"></div>
                        <div class="mx-3 mt-4 flex gap-1">
                          <span class="h-6 flex-1 rounded-xl bg-white/85 dark:bg-white/10"></span>
                          <span class="h-6 w-6 rounded-xl bg-primary-400/70"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div class="panel-card">
            <div class="section-head">
              <div class="section-icon">
                <Languages class="w-5 h-5" />
              </div>
              <div>
                <h2 class="section-title">{{ t('settings.language') }}</h2>
                <p class="section-description">切换全站文案语言，当前偏好会保存在本机。</p>
              </div>
            </div>

            <div class="mt-6 grid gap-4">
              <button
                v-for="option in languageOptions"
                :key="option.value"
                type="button"
                class="rounded-[1.75rem] border p-5 text-left transition-all duration-300"
                :class="locale === option.value
                  ? 'border-primary-400 bg-primary-50/70 shadow-soft dark:border-primary-500 dark:bg-primary-900/15'
                  : 'border-neutral-200 hover:border-primary-300 hover:bg-white dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-950/60'"
                @click="switchLanguage(option.value)"
              >
                <div class="flex items-center gap-4">
                  <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-sm font-black text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-200">
                    {{ option.badge }}
                  </div>
                  <div>
                    <div class="text-lg font-black text-neutral-900 dark:text-neutral-100">{{ option.title }}</div>
                    <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ option.description }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section class="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div class="space-y-8">
            <div class="panel-card">
              <div class="section-head">
                <div class="section-icon">
                  <UserRoundPlus class="w-5 h-5" />
                </div>
                <div>
                  <h2 class="section-title">离线身份</h2>
                  <p class="section-description">给不同用途拆出独立的本地收藏和草稿空间。</p>
                </div>
              </div>

              <div class="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  v-model="newProfileName"
                  type="text"
                  class="input-field"
                  placeholder="例如：角色灵感号 / 日常收藏号"
                />
                <button type="button" class="btn btn-primary px-6" :disabled="!newProfileName.trim()" @click="handleCreateOfflineProfile">
                  新建身份
                </button>
              </div>

              <div class="mt-5 flex flex-wrap gap-3">
                <button
                  v-for="profile in store.offlineProfiles"
                  :key="profile.id"
                  type="button"
                  class="rounded-2xl border px-4 py-3 text-left transition-colors"
                  :class="store.activeOfflineProfileId === profile.id
                    ? 'border-primary-400 bg-primary-50/70 text-primary-700 dark:border-primary-500 dark:bg-primary-900/15 dark:text-primary-300'
                    : 'border-neutral-200 bg-white/80 hover:border-primary-300 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700'"
                  @click="store.setActiveOfflineProfile(profile.id)"
                >
                  <div class="font-bold">{{ profile.name }}</div>
                  <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {{ new Date(profile.updatedAt).toLocaleDateString() }}
                  </div>
                </button>
              </div>

              <div class="mt-5 flex flex-wrap gap-3">
                <button type="button" class="btn btn-secondary px-5" @click="handleRenameOfflineProfile">重命名当前身份</button>
                <button
                  type="button"
                  class="btn btn-secondary px-5"
                  :disabled="store.offlineProfiles.length <= 1"
                  @click="handleDeleteOfflineProfile"
                >
                  删除当前身份
                </button>
              </div>
            </div>

            <div class="panel-card">
              <div class="section-head">
                <div class="section-icon">
                  <FolderPlus class="w-5 h-5" />
                </div>
                <div>
                  <h2 class="section-title">收藏夹管理</h2>
                  <p class="section-description">当前身份下可以继续拆分多个收藏夹，按主题归档内容。</p>
                </div>
              </div>

              <div class="mt-6 grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                <input
                  v-model="newCollectionName"
                  type="text"
                  class="input-field"
                  placeholder="例如：风格实验 / 角色常用 / 备用灵感"
                />
                <input
                  v-model="newCollectionDescription"
                  type="text"
                  class="input-field"
                  placeholder="可选描述"
                />
                <button type="button" class="btn btn-primary px-6" :disabled="!newCollectionName.trim()" @click="handleCreateCollection">
                  创建
                </button>
              </div>

              <div class="mt-5">
                <input
                  v-model="collectionSearchQuery"
                  type="text"
                  class="input-field"
                  placeholder="搜索收藏夹名、Prompt 标题、内容或画师名"
                />
              </div>

              <div class="mt-5 space-y-3">
                <div
                  v-for="collection in filteredCollections"
                  :key="collection.id"
                  class="rounded-[1.5rem] border border-neutral-200 bg-white/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-lg font-black text-neutral-900 dark:text-neutral-100">{{ collection.name }}</h3>
                        <span
                          v-if="collection.isDefault"
                          class="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                        >
                          默认
                        </span>
                      </div>
                      <p v-if="collection.description" class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ collection.description }}</p>
                      <div class="mt-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{{ collection.prompts.length }} 个 Prompt</span>
                        <span>{{ collection.artists.length }} 位画师</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button type="button" class="rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="handleRenameCollection(collection)">
                        <Pencil class="w-4 h-4" />
                      </button>
                      <button type="button" class="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" @click="handleDeleteCollection(collection)">
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="filteredCollections.length === 0" class="rounded-[1.5rem] border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  当前没有匹配的收藏夹。
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-8">
            <div class="panel-card">
              <div class="section-head">
                <div class="section-icon">
                  <Download class="w-5 h-5" />
                </div>
                <div>
                  <h2 class="section-title">本地数据迁移</h2>
                  <p class="section-description">导出或导入离线身份、收藏夹和草稿，方便备份或迁移到别的设备。</p>
                </div>
              </div>

              <div class="mt-6 grid gap-3">
                <button type="button" class="btn btn-primary justify-start px-6 py-4" @click="handleExportOfflineData">
                  <Download class="w-4 h-4" />
                  导出本地数据
                </button>
                <button type="button" class="btn btn-secondary justify-start px-6 py-4" @click="openImportPicker">
                  <Upload class="w-4 h-4" />
                  导入本地数据
                </button>
                <input
                  ref="importInputRef"
                  type="file"
                  class="hidden"
                  accept="application/json"
                  @change="handleImportOfflineData"
                />
              </div>

              <div class="mt-4 rounded-[1.5rem] border border-dashed border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
                导入会覆盖当前本地身份、收藏夹和草稿。建议先导出一份备份，再执行导入。
              </div>
            </div>

            <div class="panel-card">
              <div class="section-head">
                <div class="section-icon">
                  <FolderHeart class="w-5 h-5" />
                </div>
                <div>
                  <h2 class="section-title">本地数据概览</h2>
                  <p class="section-description">当前设置会和离线身份、收藏夹、草稿工作流一起在本机持久化。</p>
                </div>
              </div>

              <div class="mt-6 metric-grid">
                <div class="metric-tile-muted">
                  <div class="metric-label">默认收藏 Prompt</div>
                  <div class="metric-value">{{ defaultCollectionPromptCount }}</div>
                </div>
                <div class="metric-tile-muted">
                  <div class="metric-label">默认收藏画师</div>
                  <div class="metric-value">{{ defaultCollectionArtistCount }}</div>
                </div>
                <div class="metric-tile-muted">
                  <div class="metric-label">离线草稿</div>
                  <div class="metric-value">{{ draftsCount }}</div>
                </div>
              </div>
            </div>

            <div class="panel-card">
              <div class="section-head">
                <div class="section-icon">
                  <Archive class="w-5 h-5" />
                </div>
                <div>
                  <h2 class="section-title">最近离线草稿</h2>
                  <p class="section-description">快速确认当前身份下最近修改的内容。</p>
                </div>
              </div>

              <div class="mt-6 space-y-3">
                <div
                  v-for="draft in recentDrafts"
                  :key="draft.id"
                  class="rounded-[1.5rem] border border-neutral-200 bg-white/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                  <div class="text-base font-black text-neutral-900 dark:text-neutral-100">
                    {{ draft.title || '未命名草稿' }}
                  </div>
                  <div class="mt-1 text-xs text-neutral-400">
                    {{ new Date(draft._updatedAt || Date.now()).toLocaleString() }}
                  </div>
                  <div class="mt-3 line-clamp-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    {{ draft.prompt || '暂无内容' }}
                  </div>
                </div>

                <div v-if="recentDrafts.length === 0" class="rounded-[1.5rem] border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  当前身份下还没有离线草稿。
                </div>
              </div>

              <RouterLink to="/prompts" class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                <Archive class="w-4 h-4" />
                去草稿箱继续编辑
              </RouterLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
