<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGeneratorStore } from '@/stores/generator'
import AppHeader from '@/components/common/AppHeader.vue'
import {
  Archive,
  CalendarDays,
  Clock,
  Copy,
  FolderHeart,
  FolderPlus,
  Heart,
  Image as ImageIcon,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  User,
  X,
  Save,
} from 'lucide-vue-next'
import type { SharedPrompt } from '@/types'
import {
  findDuplicatePromptMatches,
  sanitizePromptPayload,
  validatePromptPayload,
} from '@/utils/promptSubmission'

const store = useGeneratorStore()

const { t } = useI18n()

// 状态
const searchQuery = ref('')
const activeTag = ref('')
const showDetailModal = ref(false)
const showSubmitModal = ref(false)
const showCollectionsModal = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedPrompt = ref<SharedPrompt | null>(null)
const collectionTargetPrompt = ref<SharedPrompt | null>(null)
const newCollectionName = ref('')
const newCollectionDescription = ref('')
const rawTags = computed(() =>
  tagsInput.value.split(/[\s,，、]+/).map((tag) => tag.trim()).filter(Boolean),
)
const livePayload = computed(() =>
  sanitizePromptPayload({
    ...form.value,
    tags: rawTags.value,
  }) as SharedPrompt,
)
const liveValidation = computed(() => validatePromptPayload(livePayload.value))
const liveValidationErrors = computed(() =>
  liveValidation.value.issues.filter((issue) => issue.severity === 'error'),
)
const liveValidationWarnings = computed(() =>
  liveValidation.value.issues.filter((issue) => issue.severity === 'warning'),
)
const liveDuplicateMatches = computed(() =>
  findDuplicatePromptMatches(
    livePayload.value,
    store.sharedPrompts,
    'published',
  ),
)

// 提交表单
const form = ref({
  title: '',
  username: '',
  prompt: '',
  model: 'NAI 3',
  tags: [] as string[],
  description: '',
  image: ''
})

// Draft System
const showDraftsModal = ref(false)
const currentDraftId = ref<string | null>(null)
const draftSearchQuery = ref('')
const isFormDirty = computed(() => !!(
  form.value.prompt.trim() ||
  form.value.title.trim() ||
  form.value.description.trim() ||
  form.value.image.trim()
))

function handleSaveDraft(isAuto = false) {
    if (!isFormDirty.value) return

    const draftData = {
        ...form.value,
        id: currentDraftId.value || undefined,
        tags: rawTags.value
    }

    const id = store.saveLocalDraft(draftData, isAuto)
    currentDraftId.value = id
}

function handleLoadDraft(draft: SharedPrompt) {
    form.value = {
        title: draft.title || '',
        username: draft.username || store.user?.login || activeOfflineProfile.value?.name || '',
        prompt: draft.prompt || '',
        model: draft.model || 'NAI 3',
        tags: draft.tags || [],
        description: draft.description || '',
        image: draft.image || ''
    }
    tagsInput.value = (draft.tags || []).join(', ')
    currentDraftId.value = draft.id
    showDraftsModal.value = false
    showSubmitModal.value = true
}

function handleDuplicateDraft(id: string) {
    const nextId = store.duplicateLocalDraft(id)
    if (nextId) {
        currentDraftId.value = nextId
    }
}

function handleDeleteDraft(id: string) {
    if(confirm(t('common.confirm_delete') || 'Delete this draft?')) {
        store.deleteLocalDraft(id)
        if(currentDraftId.value === id) currentDraftId.value = null
    }
}

// Auto-save hooks
onBeforeRouteLeave((to, from, next) => {
    if (showSubmitModal.value && isFormDirty.value) {
        handleSaveDraft(true)
        store.addToast('info', 'Auto Saved', 'Draft saved to box', 2000)
    }
    next()
})

watch(showSubmitModal, (newVal, oldVal) => {
    // Closing modal with unsaved changes -> Auto Save
    if (!newVal && oldVal && isFormDirty.value) {
         handleSaveDraft(true)
    }
})

// 图片上传处理
async function handleFileDrop(e: DragEvent) {
    const file = e.dataTransfer?.files[0]
    if (file) await processFile(file)
}

async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) await processFile(file)
}

async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
        store.addToast('error', 'Invalid File', 'Please upload an image')
        return
    }
    isUploading.value = true
    try {
        const url = await store.uploadToCatbox(file)
        form.value.image = url
        store.addToast('success', 'Uploaded', 'Image uploaded to Catbox')
    } catch {
        // Error handled in store
    } finally {
        isUploading.value = false
    }
}

// 临时标签输入
const tagsInput = ref('')

// 计算属性
const keywords = computed(() =>
  searchQuery.value
    .split(/[\s,，、]+/).map(k => k.trim()).filter(Boolean).map(k => k.toLowerCase())
)

const tagEntries = computed(() => {
  if (store.promptTagStats.length) {
    return store.promptTagStats.map((entry) => ({
      name: entry.tag,
      count: entry.count,
    }))
  }

  const tagCounts: Record<string, number> = {}
  store.sharedPrompts.forEach(p => {
    p.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    })
  })
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
})

const filteredPrompts = computed(() => {
  let arr = [...store.sharedPrompts]
  console.log(`[SharedPrompts] Total loaded: ${arr.length}`)

  if (activeTag.value) {
    arr = arr.filter(p => p.tags.includes(activeTag.value))
    console.log(`[SharedPrompts] After tag filter: ${arr.length}`)
  }

  if (keywords.value.length) {
    arr = arr.filter(sp => {
      const prompt = String(sp.prompt || '').toLowerCase()
      const title = String(sp.title || '').toLowerCase()
      const tagsStr = String((sp.tags || []).join(' ')).toLowerCase()
      const descStr = String(sp.description || '').toLowerCase()
      const userStr = String(sp.username || sp.author || '').toLowerCase()

      return keywords.value.every(
        kw => prompt.includes(kw) || title.includes(kw) || tagsStr.includes(kw) || descStr.includes(kw) || userStr.includes(kw)
      )
    })
    console.log(`[SharedPrompts] After keyword filter: ${arr.length}`)
  }

  return arr
})

const isLoading = computed(() => store.isPromptsLoading)
const activeCollections = computed(() => store.activeLocalCollections)
const activeOfflineProfile = computed(() => store.activeOfflineProfile)
const totalPromptCount = computed(() => store.sharedPrompts.length)
const totalTagCount = computed(() => tagEntries.value.length)
const totalCollectionCount = computed(() => store.activeLocalCollections.length)
const resultSummary = computed(() => {
  if (isLoading.value) return '正在同步最新 Prompt...'

  if (searchQuery.value.trim()) {
    return `搜索 “${searchQuery.value.trim()}” 共找到 ${filteredPrompts.value.length} 条结果`
  }

  if (activeTag.value) {
    return `标签 #${activeTag.value} 下共有 ${filteredPrompts.value.length} 条 Prompt`
  }

  return `当前收录 ${filteredPrompts.value.length} 条 Prompt，可继续搜索、筛选和收藏`
})
const featuredPrompt = computed(() => {
  if (searchQuery.value.trim() || activeTag.value) {
    return filteredPrompts.value[0] || null
  }
  return store.featuredPrompts[0] || filteredPrompts.value[0] || null
})
const visibleDrafts = computed(() => {
  const keyword = draftSearchQuery.value.trim().toLowerCase()
  if (!keyword) return store.activeLocalDrafts

  return store.activeLocalDrafts.filter((draft) => {
    const title = String(draft.title || '').toLowerCase()
    const prompt = String(draft.prompt || '').toLowerCase()
    const description = String(draft.description || '').toLowerCase()
    return title.includes(keyword) || prompt.includes(keyword) || description.includes(keyword)
  })
})

onMounted(() => {
  store.loadSharedPrompts()
  store.loadPromptMetadata()
  store.loadFavorites()
})

function handleNewPrompt() {
  // Reset for new entry
  form.value = {
    title: '',
    username: store.user?.login || activeOfflineProfile.value?.name || '',
    prompt: '',
    model: 'NAI 3',
    tags: [],
    description: '',
    image: ''
  }
  tagsInput.value = ''
  currentDraftId.value = null

  showSubmitModal.value = true
}

function openDetail(item: SharedPrompt) {
  selectedPrompt.value = item
  showDetailModal.value = true
}

function openCollectionsModal(item?: SharedPrompt) {
  collectionTargetPrompt.value = item || null
  showCollectionsModal.value = true
}

function closeCollectionsModal() {
  showCollectionsModal.value = false
  collectionTargetPrompt.value = null
  newCollectionName.value = ''
  newCollectionDescription.value = ''
}

function addPromptToCollection(collectionId: string) {
  if (!collectionTargetPrompt.value) return
  const added = store.addPromptToCollection(collectionTargetPrompt.value, collectionId)
  if (added) {
    closeCollectionsModal()
  }
}

function createCollectionAndAddPrompt() {
  const collection = store.createLocalCollection(newCollectionName.value, newCollectionDescription.value)
  if (!collection) return

  if (collectionTargetPrompt.value) {
    store.addPromptToCollection(collectionTargetPrompt.value, collection.id)
  } else {
    store.addToast('success', '收藏夹已创建', `已创建《${collection.name}》`, 1800)
  }

  closeCollectionsModal()
}

function isPromptInCollection(promptId: string, collectionId: string) {
  return store.getPromptCollections(promptId).some((collection) => collection.id === collectionId)
}

function promptCollectionCount(promptId: string) {
  return store.getPromptCollections(promptId).length
}

function copyText(text: string) {
  if (!text) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => store.addToast('success', t('share.copy_success'), t('share.copy_success'), 1500))
      .catch(() => store.addToast('error', t('share.copy_fail'), t('share.copy_fail'), 2000))
  }
}

function handleImageError(e: Event) {
  const target = e.target as HTMLImageElement | null
  if (target) {
    target.style.display = 'none'
  }
}

async function handleSubmit() {
  if (store.isSubmissionLoading) return

  if (!store.user) {
    store.addToast('error', t('auth.identity_check'), t('share.auth_required'))
    return
  }

  if (!form.value.prompt) {
    store.addToast('error', 'Error', t('share.prompt_required'))
    return
  }

  if (liveValidationErrors.value.length) {
    store.addToast('error', '投稿未通过校验', liveValidationErrors.value[0]?.message || '请先修复表单问题', 2400)
    return
  }

  const payload = {
      ...form.value,
      tags: rawTags.value
  }

  // Submit via API (In-App)
  try {
      await store.submitIssue(payload)

      // Remove draft if exists
      if (currentDraftId.value) {
          store.deleteLocalDraft(currentDraftId.value)
          currentDraftId.value = null
      }

      showSubmitModal.value = false
      // Reset form but keep username if logged in
      const currentUsername = store.user?.login || ''
      form.value = { title: '', username: currentUsername, prompt: '', model: 'NAI 3', tags: [], description: '', image: '' }
      tagsInput.value = ''
  } catch {
      // Handled in store
  }
}

// Watchers
watch(searchQuery, () => {
  if (searchQuery.value && activeTag.value) {
    activeTag.value = ''
  }
})

// Auto-fill username when modal opens
watch(showSubmitModal, (val) => {
  if (val) {
    form.value.username = store.user?.login || form.value.username || activeOfflineProfile.value?.name || ''
  }
})

// Reload prompts when user logs in (to enable GitHub Raw fetch if available)
watch(() => store.user, (val) => {
  if (val) {
    console.log('[SharedPrompts] User authenticated, reloading data with potential Raw access...')
    store.loadSharedPrompts({ force: true })
  }
})
</script>

<template>
  <div class="app-shell min-h-screen">
    <AppHeader sectionLabel="画师串分享" />

    <main class="section section-spacing">
      <div class="page-stack">

        <section class="hero-panel hero-panel-accent">
          <div class="hero-layout hero-layout-split">
            <div>
              <div class="hero-eyebrow">
                <Sparkles class="w-4 h-4" />
                Prompt Hub
              </div>
              <h1 class="hero-title">{{ t('share.title') }}</h1>
              <p class="hero-body">{{ t('share.subtitle') }}</p>
              <p class="hero-summary">{{ resultSummary }}</p>

              <div class="mt-5 flex flex-wrap gap-2">
                <span v-if="activeTag" class="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1.5 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <Tags class="w-3.5 h-3.5" />
                  当前标签 #{{ activeTag }}
                </span>
                <span v-if="searchQuery.trim()" class="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  <Search class="w-3.5 h-3.5" />
                  正在搜索 {{ searchQuery.trim() }}
                </span>
              </div>

              <div class="mt-7 metric-grid">
                <div class="metric-tile">
                  <div class="metric-label">总 Prompt</div>
                  <div class="metric-value">{{ totalPromptCount }}</div>
                </div>
                <div class="metric-tile">
                  <div class="metric-label">标签数量</div>
                  <div class="metric-value">{{ totalTagCount }}</div>
                </div>
                <div class="metric-tile">
                  <div class="metric-label">本地收藏夹</div>
                  <div class="metric-value">{{ totalCollectionCount }}</div>
                </div>
              </div>

              <div class="page-actions">
                <button
                  @click="openCollectionsModal()"
                  class="btn btn-secondary text-base px-6 py-3 flex items-center gap-2"
                >
                  <FolderHeart class="w-5 h-5" />
                  <span>本地收藏夹</span>
                </button>
                <button
                  @click="showDraftsModal = true"
                  class="btn btn-secondary text-base px-6 py-3 flex items-center gap-2"
                >
                  <Archive class="w-5 h-5" />
                  <span>{{ t('common.draft_box') }} <span v-if="store.activeDraftCount">({{ store.activeDraftCount }})</span></span>
                </button>
                <button
                  @click="handleNewPrompt"
                  class="btn btn-primary text-base px-6 py-3 flex items-center gap-2"
                >
                  <Sparkles class="w-5 h-5" />
                  <span>{{ store.user ? t('share.new_prompt') : '新建离线草稿' }}</span>
                </button>
              </div>
            </div>

            <div class="panel-soft">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="metric-label">精选预览</div>
                  <div class="mt-2 text-xl font-black text-neutral-900 dark:text-neutral-100">
                    {{ featuredPrompt?.title || '等待 Prompt 数据载入' }}
                  </div>
                </div>
                <button
                  v-if="featuredPrompt"
                  @click="openDetail(featuredPrompt)"
                  class="btn btn-secondary px-4 py-2 text-sm"
                >
                  查看详情
                </button>
              </div>

              <div class="mt-4 rounded-[1.5rem] border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/70">
                <div class="relative overflow-hidden rounded-[1.35rem] bg-neutral-100 dark:bg-neutral-800 aspect-[4/3]">
                  <img
                    v-if="featuredPrompt?.image"
                    :src="featuredPrompt.image"
                    class="h-full w-full object-cover"
                    alt="Featured preview"
                    loading="lazy"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-neutral-300 dark:text-neutral-700">
                    <ImageIcon class="w-12 h-12" />
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <div class="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      By {{ featuredPrompt?.username || featuredPrompt?.author || 'Anonymous' }}
                    </div>
                    <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {{ featuredPrompt?.description || '从社区里发现更适合你工作流的画师串。' }}
                    </p>
                  </div>
                  <span v-if="featuredPrompt?.model" class="rounded-full border border-neutral-200 px-3 py-1 text-xs font-bold uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-300">
                    {{ featuredPrompt.model }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside class="filter-sidebar">
            <div class="toolbar-card">
              <div class="toolbar-label">
                <Search class="w-4 h-4" />
                搜索与筛选
              </div>
              <div class="mt-4 relative">
                <Search class="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  v-model="searchQuery"
                  type="text"
                  class="input-field h-12 pl-11"
                  :placeholder="t('share.search_placeholder')"
                />
              </div>
              <div class="mt-4 flex items-center justify-between text-sm">
                <span class="text-neutral-500 dark:text-neutral-400">
                  {{ activeTag ? `标签 #${activeTag}` : '全部标签' }}
                </span>
                <button
                  v-if="searchQuery || activeTag"
                  type="button"
                  class="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  @click="searchQuery = ''; activeTag = ''"
                >
                  清空条件
                </button>
              </div>
            </div>

            <div class="toolbar-card">
              <div class="toolbar-label">
                <SlidersHorizontal class="w-4 h-4" />
                热门标签
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="entry in tagEntries.slice(0, 18)"
                  :key="entry.name"
                  @click="activeTag = activeTag === entry.name ? '' : entry.name"
                  :class="[
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-all',
                    activeTag === entry.name
                      ? 'bg-primary-50 text-primary-700 border-primary-400 shadow-sm dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-500'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                  ]"
                >
                  <span>#{{ entry.name }}</span>
                  <span class="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
                    {{ entry.count }}
                  </span>
                </button>
              </div>
            </div>

            <div class="toolbar-card">
              <div class="toolbar-label">
                <FolderHeart class="w-4 h-4" />
                本地工作流
              </div>
              <div class="mt-4 space-y-3">
                <div class="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <div class="text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ activeOfflineProfile?.name || '本地用户' }}</div>
                  <div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    当前有 {{ activeCollections.length }} 个收藏夹，{{ store.activeDraftCount }} 条离线草稿
                  </div>
                </div>
                <button type="button" class="btn btn-secondary w-full justify-center" @click="openCollectionsModal()">
                  <FolderPlus class="w-4 h-4" />
                  管理收藏夹
                </button>
                <button type="button" class="btn btn-secondary w-full justify-center" @click="showDraftsModal = true">
                  <Archive class="w-4 h-4" />
                  查看草稿箱
                </button>
              </div>
            </div>
          </aside>

          <div class="space-y-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">浏览结果</div>
                <h2 class="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">{{ filteredPrompts.length }} 条 Prompt</h2>
                <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  卡片里优先展示标题、作者、简述和 Prompt 片段，减少浏览时的信息噪音。
                </p>
              </div>
              <div class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ resultSummary }}
              </div>
            </div>

            <div v-if="isLoading" class="empty-panel">
              <div class="text-2xl font-black animate-pulse">{{ t('common.loading') }}</div>
            </div>

            <div v-else-if="filteredPrompts.length === 0" class="empty-panel">
              <div class="text-xl text-neutral-400 font-bold">{{ t('share.no_results') }}</div>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
              <article
                v-for="item in filteredPrompts"
                :key="item.id"
                class="card p-0 overflow-hidden flex flex-col card-hover group"
              >
                <div class="relative aspect-[4/3] border-b border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                  <img
                    v-if="item.image"
                    :src="item.image"
                    class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    alt="Preview"
                    loading="lazy"
                    @error="handleImageError"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-neutral-300 dark:text-neutral-700">
                    <ImageIcon class="w-12 h-12" />
                  </div>

                  <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/30 to-transparent px-4 pb-4 pt-10">
                    <div class="flex items-end justify-between gap-3">
                      <div class="flex flex-wrap gap-2">
                        <span class="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-neutral-700">
                          {{ item.model }}
                        </span>
                        <span
                          v-if="promptCollectionCount(item.id)"
                          class="rounded-full bg-primary-500/90 px-3 py-1 text-[11px] font-black text-white"
                        >
                          {{ promptCollectionCount(item.id) }} 个收藏夹
                        </span>
                      </div>
                      <button
                        @click.stop="store.toggleFavorite(item)"
                        class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/92 shadow-soft transition-colors dark:bg-neutral-900/92"
                        :class="store.isFavorite(item.id) ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'"
                        :title="store.isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'"
                      >
                        <Heart :class="{ 'fill-current': store.isFavorite(item.id) }" :size="20" />
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex flex-1 flex-col p-5">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <h3 class="text-xl font-black leading-tight text-neutral-900 dark:text-neutral-100 line-clamp-2" :title="item.title">
                        {{ item.title || t('share.untitled') }}
                      </h3>
                      <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                        <span>By {{ item.username || item.author || 'Anonymous' }}</span>
                        <span v-if="item.created_at" class="inline-flex items-center gap-1.5">
                          <CalendarDays class="w-3.5 h-3.5" />
                          {{ new Date(item.created_at).toLocaleDateString() }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p
                    v-if="item.description"
                    class="mt-4 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2 min-h-[2.75rem]"
                  >
                    {{ item.description }}
                  </p>

                  <div class="mt-4 rounded-[1.4rem] border border-neutral-200/80 bg-neutral-50/80 p-4 shadow-inner dark:border-neutral-800 dark:bg-neutral-950/60">
                    <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Prompt Preview</div>
                    <div class="mt-3 min-h-[7.5rem] font-mono text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-5 break-all">
                      {{ item.prompt }}
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2">
                    <span
                      v-for="t in item.tags.slice(0, 4)"
                      :key="t"
                      class="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      #{{ t }}
                    </span>
                    <span v-if="item.tags.length > 4" class="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-400">
                      +{{ item.tags.length - 4 }}
                    </span>
                  </div>

                  <div class="mt-5 flex flex-wrap gap-3 border-t border-neutral-200/70 pt-4 dark:border-neutral-800">
                    <button
                      @click="openDetail(item)"
                      class="btn btn-secondary flex-1 min-w-[8.5rem] justify-center py-2.5 text-sm"
                    >
                      {{ t('share.view_details') }}
                    </button>
                    <button
                      @click="openCollectionsModal(item)"
                      class="btn btn-secondary px-4 py-2.5 text-sm"
                      title="加入收藏夹"
                    >
                      <FolderPlus class="w-4 h-4" />
                    </button>
                    <button
                      @click="copyText(item.prompt)"
                      class="btn btn-primary flex-1 min-w-[8.5rem] justify-center py-2.5 text-sm shadow-sm"
                    >
                      <Copy class="w-4 h-4" />
                      <span>{{ t('share.copy_prompt') }}</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedPrompt" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity" @click="showDetailModal = false"></div>
      <div class="relative w-full max-w-6xl rounded-[2rem] border border-neutral-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/95 max-h-[92vh] overflow-hidden flex flex-col">
        <div class="shrink-0 border-b border-neutral-200/80 px-6 py-5 dark:border-neutral-800">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                  {{ selectedPrompt.title || t('share.untitled') }}
                </h2>
                <span class="rounded-full border border-neutral-200 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-300">
                  {{ selectedPrompt.model }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                <span class="inline-flex items-center gap-1.5">
                  <User class="w-4 h-4" />
                  {{ selectedPrompt.username || selectedPrompt.author || 'Anonymous' }}
                </span>
                <span v-if="selectedPrompt.created_at" class="inline-flex items-center gap-1.5">
                  <CalendarDays class="w-4 h-4" />
                  {{ new Date(selectedPrompt.created_at).toLocaleDateString() }}
                </span>
                <span v-if="promptCollectionCount(selectedPrompt.id)" class="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                  已加入 {{ promptCollectionCount(selectedPrompt.id) }} 个收藏夹
                </span>
              </div>
            </div>
            <button @click="showDetailModal = false" class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div class="grid gap-8 xl:grid-cols-[0.88fr_1.12fr]">
            <div class="space-y-5">
              <div class="relative overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                <div class="absolute right-4 top-4 z-10">
                  <button
                    @click="store.toggleFavorite(selectedPrompt)"
                    class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/92 shadow-soft transition-colors dark:bg-neutral-900/92"
                    :class="store.isFavorite(selectedPrompt.id) ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'"
                  >
                    <Heart :class="{ 'fill-current': store.isFavorite(selectedPrompt.id) }" :size="22" />
                  </button>
                </div>
                <div class="aspect-[4/5] sm:aspect-[5/4]">
                  <img
                    v-if="selectedPrompt.image"
                    :src="selectedPrompt.image"
                    class="h-full w-full object-cover"
                    alt="Prompt preview"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-neutral-300 dark:text-neutral-700">
                    <ImageIcon class="w-20 h-20" />
                  </div>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-3xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/45 sm:col-span-2">
                  <div class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">作者</div>
                  <div class="mt-2 text-lg font-black text-neutral-900 dark:text-neutral-100">{{ selectedPrompt.username || selectedPrompt.author || 'Anonymous' }}</div>
                </div>
                <div class="rounded-3xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/45">
                  <div class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">模型</div>
                  <div class="mt-2 text-lg font-black text-neutral-900 dark:text-neutral-100">{{ selectedPrompt.model }}</div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/45">
                <div class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{{ t('share.form_tags') }}</div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="t in selectedPrompt.tags"
                    :key="t"
                    class="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-300"
                  >
                    #{{ t }}
                  </span>
                  <span v-if="!selectedPrompt.tags.length" class="text-sm text-neutral-400">暂无标签</span>
                </div>
              </div>

              <div
                v-if="selectedPrompt.description"
                class="rounded-[1.5rem] border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/45"
              >
                <div class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{{ t('share.form_desc') }}</div>
                <p class="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {{ selectedPrompt.description }}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-5">
              <div class="rounded-[1.75rem] border border-neutral-200/80 bg-white/80 p-5 shadow-inner dark:border-neutral-800 dark:bg-neutral-950/55">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <div class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Prompt 内容</div>
                    <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">优化后把内容区控制在更适合阅读和复制的比例，不再出现大面积空白。</p>
                  </div>
                  <button @click="copyText(selectedPrompt.prompt)" class="btn btn-secondary px-4 py-2 text-sm">
                    <Copy class="w-4 h-4" />
                    {{ t('share.copy_prompt') }}
                  </button>
                </div>

                <div class="mt-5 rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-5 font-mono text-sm leading-relaxed text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 whitespace-pre-wrap select-all overflow-y-auto min-h-[16rem] max-h-[45vh]">
                  {{ selectedPrompt.prompt }}
                </div>
              </div>

              <div class="rounded-[1.75rem] border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/45">
                <div class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">快捷操作</div>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    @click="store.toggleFavorite(selectedPrompt)"
                    class="btn btn-secondary justify-center py-3"
                  >
                    <Heart class="w-4 h-4" :class="{ 'fill-current': store.isFavorite(selectedPrompt.id) }" />
                    {{ store.isFavorite(selectedPrompt.id) ? '取消默认收藏' : '加入默认收藏' }}
                  </button>
                  <button
                    @click="openCollectionsModal(selectedPrompt)"
                    class="btn btn-secondary justify-center py-3"
                  >
                    <FolderPlus class="w-4 h-4" />
                    加入收藏夹
                  </button>
                  <button
                    @click="copyText(selectedPrompt.prompt)"
                    class="btn btn-primary justify-center py-3 sm:col-span-2"
                  >
                    <Copy class="w-4 h-4" />
                    {{ t('share.copy_prompt') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collections Modal -->
    <div v-if="showCollectionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity" @click="closeCollectionsModal"></div>
      <div class="relative w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 class="text-2xl font-black">本地收藏夹</h2>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              当前离线身份：{{ activeOfflineProfile?.name || '本地用户' }}
            </p>
            <p v-if="collectionTargetPrompt" class="mt-1 text-sm text-primary-600 dark:text-primary-400">
              正在添加：{{ collectionTargetPrompt.title || '未命名 Prompt' }}
            </p>
          </div>
          <button @click="closeCollectionsModal" class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              v-for="collection in activeCollections"
              :key="collection.id"
              type="button"
              class="text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors"
              @click="collectionTargetPrompt ? addPromptToCollection(collection.id) : null"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-lg text-neutral-900 dark:text-neutral-100">{{ collection.name }}</h3>
                    <span v-if="collection.isDefault" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      默认
                    </span>
                  </div>
                  <p v-if="collection.description" class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {{ collection.description }}
                  </p>
                </div>
                <FolderHeart class="w-5 h-5 text-neutral-400" />
              </div>
              <div class="mt-4 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{{ collection.prompts.length }} 个 Prompt</span>
                <span>{{ collection.artists.length }} 位画师</span>
              </div>
              <div v-if="collectionTargetPrompt" class="mt-4 text-sm">
                <span
                  v-if="isPromptInCollection(collectionTargetPrompt.id, collection.id)"
                  class="text-neutral-500 dark:text-neutral-400"
                >
                  已在这个收藏夹中
                </span>
                <span v-else class="text-primary-600 dark:text-primary-400">点击加入这个收藏夹</span>
              </div>
            </button>
          </div>

          <div class="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5">
            <h3 class="font-bold text-lg text-neutral-900 dark:text-neutral-100">新建收藏夹</h3>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">按主题拆分常用画师串，离线也会保存在本地。</p>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3">
              <input
                v-model="newCollectionName"
                type="text"
                class="input-field"
                placeholder="例如：日常灵感 / 二次元角色 / 风格实验"
              />
              <input
                v-model="newCollectionDescription"
                type="text"
                class="input-field"
                placeholder="可选描述"
              />
              <button
                type="button"
                class="btn btn-primary px-6"
                :disabled="!newCollectionName.trim()"
                @click="createCollectionAndAddPrompt"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Modal -->
    <div v-if="showSubmitModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity" @click="showSubmitModal = false"></div>
      <div class="relative w-full max-w-5xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-2xl max-h-[95vh] overflow-y-auto">
        <div class="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-2xl font-bold tracking-tight">{{ store.user ? t('share.submit_title') : '离线草稿' }}</h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              当前归属：{{ store.user?.login || activeOfflineProfile?.name || '本地用户' }}
            </p>
          </div>
          <div v-if="!store.user" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            当前可离线编辑和保存草稿，登录后即可提交到社区。
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-6">
          <div v-if="liveValidationErrors.length || liveValidationWarnings.length || liveDuplicateMatches.length" class="space-y-3">
            <div v-if="liveValidationErrors.length" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div class="font-bold mb-2">提交前需要修复</div>
              <ul class="space-y-1">
                <li v-for="issue in liveValidationErrors" :key="issue.code">• {{ issue.message }}</li>
              </ul>
            </div>
            <div v-if="liveValidationWarnings.length" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <div class="font-bold mb-2">优化建议</div>
              <ul class="space-y-1">
                <li v-for="issue in liveValidationWarnings" :key="issue.code">• {{ issue.message }}</li>
              </ul>
            </div>
            <div v-if="liveDuplicateMatches.length" class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <div class="font-bold mb-2">疑似和已发布内容重复</div>
              <ul class="space-y-1">
                <li v-for="match in liveDuplicateMatches" :key="match.id">
                  • {{ match.title }}（相似度 {{ Math.round(match.score * 100) }}%）
                </li>
              </ul>
            </div>
          </div>

          <!-- Title (Full Width) -->
          <div>
            <label class="block text-sm font-bold mb-2">{{ t('share.form_title') }}</label>
            <input v-model="form.title" required type="text" class="input-field w-full h-12 px-4 font-bold text-lg" :placeholder="t('share.form_title_ph')" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Left Column: Meta Info (40%) -->
            <div class="md:col-span-5 space-y-5">
               <!-- Model -->
               <div>
                 <label class="block text-sm font-bold mb-2">{{ t('share.form_model') }}</label>
                 <input
                   v-model="form.model"
                   list="model-options"
                   class="input-field w-full h-10 px-3"
                   :placeholder="t('share.form_model_ph')"
                 />
                 <datalist id="model-options">
                   <option value="NAI 4.5"></option>
                   <option value="NAI 3.0"></option>
                   <option value="Stable Diffusion"></option>
                   <option value="Midjourney"></option>
                   <option value="Flux"></option>
                 </datalist>
               </div>

               <!-- Tags -->
               <div>
                 <label class="block text-sm font-bold mb-2">{{ t('share.form_tags') }} <span class="font-normal text-muted">{{ t('share.form_tags_hint') }}</span></label>
                 <input v-model="tagsInput" type="text" class="input-field w-full h-10 px-3" :placeholder="t('share.form_tags_ph')" />
               </div>

               <!-- Image Upload -->
               <div>
                 <label class="block text-sm font-bold mb-2">{{ t('share.form_image') }}</label>

                 <!-- Drag & Drop Zone -->
                 <div
                    class="relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    @dragover.prevent
                    @drop.prevent="handleFileDrop"
                    @click="fileInput?.click()"
                 >
                    <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="handleFileSelect">

                    <div v-if="isUploading" class="flex flex-col items-center py-4">
                        <Loader2 class="w-8 h-8 animate-spin text-neutral-400 mb-2" />
                        <span class="text-xs text-neutral-500">Uploading to Catbox...</span>
                    </div>

                    <div v-else-if="form.image" class="relative group">
                        <img :src="form.image" class="max-h-32 mx-auto rounded shadow-sm object-contain" />
                        <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                            <span class="text-white text-xs font-bold">Click to Change</span>
                        </div>
                    </div>

                    <div v-else class="py-4 flex flex-col items-center text-neutral-500">
                        <Upload class="w-8 h-8 mb-2" />
                        <span class="text-xs font-bold">Drag & Drop or Click to Upload</span>
                        <span class="text-[10px] mt-1 text-neutral-400">Auto-uploads to Catbox.moe</span>
                    </div>
                 </div>

                 <!-- URL Input Fallback -->
                 <div class="mt-2">
                    <input
                      v-model="form.image"
                      type="url"
                      class="input-field w-full h-8 px-2 text-xs text-neutral-500"
                      :placeholder="t('share.form_image_ph')"
                    />
                 </div>
               </div>

               <!-- Image Preview (Compact) - REMOVED (Integrated above) -->

               <!-- Description -->
               <div>
                 <label class="block text-sm font-bold mb-2">{{ t('share.form_desc') }}</label>
                 <textarea v-model="form.description" rows="3" class="input-field w-full p-3 text-sm" :placeholder="t('share.form_desc_ph')"></textarea>
               </div>
            </div>

            <!-- Right Column: Prompt (60%) -->
            <div class="md:col-span-7 flex flex-col h-full">
               <label class="block text-sm font-bold mb-2">{{ t('share.form_content') }}</label>
               <textarea
                  v-model="form.prompt"
                  required
                  class="input-field w-full p-4 font-mono text-sm leading-relaxed flex-1 min-h-[400px] md:min-h-0 resize-none bg-neutral-50 dark:bg-neutral-950"
                  :placeholder="t('share.form_content_ph')">
               </textarea>
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-4 border-t border-neutral-200 dark:border-neutral-800 pt-6">
            <button
              type="button"
              @click="handleSaveDraft(false)"
              :disabled="store.isSubmissionLoading || isUploading"
              class="btn btn-secondary px-6 py-3 flex items-center gap-2 mr-auto"
            >
              <Save class="w-4 h-4" />
              <span>{{ t('common.save_draft') }}</span>
            </button>

            <button
              type="button"
              @click="showSubmitModal = false"
              class="btn btn-secondary px-6 py-3"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="!store.user || store.isSubmissionLoading || isUploading || liveValidationErrors.length > 0"
              class="btn btn-primary px-8 py-3"
            >
              {{ !store.user ? '登录后提交' : (store.isSubmissionLoading ? t('common.loading') : t('share.submit_review')) }}
            </button>
          </div>
        </form>
        <div class="text-xs text-center text-muted mt-4">
          {{ store.user ? t('share.submit_hint') : '草稿会保存在当前离线身份下，可稍后继续编辑或登录后再提交。' }}
        </div>
      </div>
    </div>

    <!-- Drafts Modal -->
    <div v-if="showDraftsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm transition-opacity">
      <div class="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-neutral-200 dark:border-neutral-800">
          <div class="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
               <div>
                 <h2 class="text-2xl font-black uppercase">{{ t('common.draft_box') }}</h2>
                 <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                   当前身份：{{ activeOfflineProfile?.name || '本地用户' }}
                 </p>
               </div>
                <button @click="showDraftsModal = false" class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"><X class="w-6 h-6"/></button>
           </div>

           <div class="flex-1 overflow-y-auto p-6 space-y-4">
                <div class="flex flex-col md:flex-row gap-3">
                  <input
                    v-model="draftSearchQuery"
                    type="text"
                    class="input-field"
                    placeholder="搜索草稿标题、内容或描述"
                  />
                  <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    共 {{ store.activeDraftCount }} 条
                  </div>
                </div>

                <div v-if="visibleDrafts.length === 0" class="text-center py-12 text-neutral-500">
                    <Archive class="w-12 h-12 mx-auto mb-3 opacity-50"/>
                    <p>{{ draftSearchQuery ? '没有匹配的草稿' : t('share.no_drafts') }}</p>
                </div>

                <div v-for="draft in visibleDrafts" :key="draft.id" class="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors">
                     <div class="flex justify-between items-start mb-2">
                          <div class="min-w-0 flex-1 pr-4">
                            <h3 class="font-bold text-lg truncate">{{ draft.title || t('share.untitled') }}</h3>
                            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                              <span class="inline-flex items-center">
                                <Clock class="w-3 h-3 mr-1"/>
                                {{ new Date(draft._updatedAt || Date.now()).toLocaleDateString() }}
                              </span>
                              <span v-if="draft._draftLabel" class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300">
                                {{ draft._draftLabel }}
                              </span>
                            </div>
                          </div>
                     </div>
                     <p class="text-sm text-neutral-500 line-clamp-2 mb-4 font-mono bg-neutral-50 dark:bg-neutral-950 p-2 rounded">
                         {{ draft.prompt || t('share.no_results') }}
                     </p>

                     <div class="flex flex-wrap justify-end gap-3">
                          <button @click="handleDuplicateDraft(draft.id)" class="text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100 text-sm font-bold flex items-center px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                              <Save class="w-4 h-4 mr-1"/> 复制副本
                          </button>
                          <button @click="handleDeleteDraft(draft.id)" class="text-red-500 hover:text-red-600 text-sm font-bold flex items-center px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                              <Trash2 class="w-4 h-4 mr-1"/> {{ t('common.delete') }}
                          </button>
                         <button @click="handleLoadDraft(draft)" class="btn btn-primary text-sm px-4 py-1.5">
                             {{ t('common.load_draft') }}
                         </button>
                    </div>
               </div>
          </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 无额外样式，全部使用 Main CSS */
</style>
