<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/common/AppHeader.vue'
import { useGeneratorStore } from '@/stores/generator'
import type { OfflineCollection, SharedPrompt } from '@/types'
import { AlertTriangle, FolderHeart, FolderPlus, Github, Pencil, RefreshCcw, Search, ShieldCheck, Sparkles, Trash2, UserRoundPlus } from 'lucide-vue-next'

const { t } = useI18n()
const store = useGeneratorStore()
const activeTab = ref<'pending' | 'published' | 'rejected' | 'draft' | 'my-submissions' | 'favorites'>('my-submissions')
const isGuest = ref(false)

// Edit State
const showEditModal = ref(false)
const editForm = ref<SharedPrompt>({
  id: '',
  title: '',
  prompt: '',
  model: '',
  tags: [],
  description: '',
  image: ''
})
const editFile = ref<File | null>(null)
const isUploading = ref(false)

onMounted(async () => {
  store.loadFavorites()
  store.loadSharedPrompts()
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (code) {
    await store.handleAuthCallback(code)
  }

  // Load User Data
  if (store.user) {
    store.loadFavorites()
    store.loadUserSubmissions()
  }

  // Admin Data
  if (store.isModerator) {
    store.loadPendingSubmissions()
    store.loadDraftSubmissions()
  }
})

// Reactivity for Auth State
watch(() => store.user, (u) => {
  if (u) {
    store.loadSharedPrompts({ force: true })
    store.loadUserSubmissions()
    store.loadFavorites()
  }
}, { immediate: true })

watch(() => store.isModerator, (isMod) => {
  if (isMod) {
    store.loadPendingSubmissions()
    store.loadDraftSubmissions()
  }
}, { immediate: true })

watch(activeTab, (val) => {
  if (val === 'pending') store.loadPendingSubmissions()
  if (val === 'draft') store.loadDraftSubmissions()
  if (val === 'rejected') store.loadRejectedSubmissions()
  if (val === 'my-submissions') store.loadUserSubmissions()
  if (val === 'favorites') store.loadFavorites()
})

const refreshCurrentTab = () => {
  if (activeTab.value === 'pending') store.loadPendingSubmissions()
  if (activeTab.value === 'draft') store.loadDraftSubmissions()
  if (activeTab.value === 'rejected') store.loadRejectedSubmissions()
  if (activeTab.value === 'my-submissions') store.loadUserSubmissions()
  if (activeTab.value === 'favorites') store.loadFavorites()
  store.addToast('info', 'Refreshed', 'Data updated', 1000)
}

const publishedList = computed(() => {
  return store.sharedPrompts.filter(p => p.status === 'published' || p.status === 'approved')
})

const activeOfflineProfile = computed(() => store.activeOfflineProfile)
const activeCollections = computed(() => store.activeLocalCollections)
const collectionSearchQuery = ref('')
const totalLocalPromptCount = computed(() =>
  activeCollections.value.reduce((sum, collection) => sum + collection.prompts.length, 0),
)
const totalLocalArtistCount = computed(() =>
  activeCollections.value.reduce((sum, collection) => sum + collection.artists.length, 0),
)
const newOfflineProfileName = ref('')
const newCollectionName = ref('')
const newCollectionDescription = ref('')
const filteredCollections = computed(() => {
  const keyword = collectionSearchQuery.value.trim().toLowerCase()
  if (!keyword) return activeCollections.value

  return activeCollections.value.filter((collection) => {
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

// Actions
const handleGuestLogin = () => {
  isGuest.value = true
  activeTab.value = 'favorites'
}

const logout = () => {
  if (isGuest.value && !store.user) {
    isGuest.value = false
    return
  }
  isGuest.value = false
  store.logout()
}

// Approval / Rejection
async function handleApprove(id: string) {
  if (confirm(t('common.confirm'))) {
    await store.approveSubmission(id)
  }
}

async function handleReject(id: string) {
  const reason = prompt(t('admin.reject_reason'), t('admin.reject_reason_ph'))
  if (reason !== null) {
    await store.rejectSubmission(id, reason)
  }
}

// CRUD
const openEdit = (item: SharedPrompt) => {
  editForm.value = JSON.parse(JSON.stringify(item)) // Deep copy
  editFile.value = null
  showEditModal.value = true
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    editFile.value = target.files[0]
  }
}

const saveEdit = async (action: 'save' | 'publish' | 'draft' | 'review' = 'save') => {
  if (!editForm.value.title || !editForm.value.prompt) return

  // Upload Image if selected
  if (editFile.value) {
    isUploading.value = true
    const url = await store.uploadImage(editFile.value)
    isUploading.value = false
    if (url) {
      editForm.value.image = url
    } else {
      return // Failed
    }
  }

  // Identify Item Type
  const pendingItem = store.pendingSubmissions.find(p => p.id === editForm.value.id)
  const draftItem = store.draftSubmissions.find(p => p.id === editForm.value.id)
  const userItem = store.userPrompts.find(p => p.id === editForm.value.id)

  if (pendingItem) {
     // Actions for Pending: Publish, Save as Draft, Update (Save)
     if (action === 'publish') await store.approveSubmission(editForm.value.id, editForm.value)
     else if (action === 'draft') await store.saveAsDraft(editForm.value.id, editForm.value)
     else await store.updatePendingSubmission(editForm.value.id, editForm.value)
  } else if (draftItem) {
     // Actions for Draft: Publish, Move to Review, Update (Save as Draft)
     if (action === 'publish') await store.approveSubmission(editForm.value.id, editForm.value)
     else if (action === 'review') await store.moveToReview(editForm.value.id, editForm.value)
     else await store.saveAsDraft(editForm.value.id, editForm.value)
  } else if (userItem) {
     // Regular user updating their own submission
     if (action === 'review') {
        await store.moveToReview(editForm.value.id, editForm.value)
     } else {
        await store.updatePendingSubmission(editForm.value.id, editForm.value)
     }
  } else {
     // Published Item -> Update
     await store.updatePublishedPrompt(editForm.value)
  }
  showEditModal.value = false
}

const handleDelete = async (id: string) => {
  if(confirm(t('common.confirm'))) {
     await store.deletePublishedPrompt(id)
  }
}

const handleCreateOfflineProfile = () => {
  const created = store.createOfflineProfile(newOfflineProfileName.value)
  if (!created) return

  newOfflineProfileName.value = ''
  isGuest.value = true
  store.addToast('success', '本地身份已创建', `当前正在使用 ${created.name}`, 1800)
}

const handleRenameOfflineProfile = () => {
  if (!activeOfflineProfile.value) return
  const nextName = prompt('请输入新的本地身份名称', activeOfflineProfile.value.name)
  if (!nextName) return

  if (store.renameOfflineProfile(activeOfflineProfile.value.id, nextName)) {
    store.addToast('success', '名称已更新', nextName, 1600)
  }
}

const handleDeleteOfflineProfile = () => {
  if (!activeOfflineProfile.value) return
  if (!confirm('删除这个本地身份后，其收藏夹也会一起删除，确定继续吗？')) return

  const deletedName = activeOfflineProfile.value.name
  if (!store.deleteOfflineProfile(activeOfflineProfile.value.id)) {
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

const handleRemovePromptFromCollection = (collection: OfflineCollection, promptId: string) => {
  store.removePromptFromCollection(promptId, collection.id)
}

const handleRemoveArtistFromCollection = (collection: OfflineCollection, artistName: string) => {
  store.removeArtistFromCollection(artistName, collection.id)
}

const copyPromptText = async (text: string) => {
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    store.addToast('success', '已复制', 'Prompt 已复制到剪贴板', 1500)
  } catch {
    store.addToast('error', '复制失败', '请稍后重试', 1500)
  }
}

const copyArtistName = async (name: string) => {
  if (!name) return

  try {
    await navigator.clipboard.writeText(name)
    store.addToast('success', '已复制画师名', name, 1400)
  } catch {
    store.addToast('error', '复制失败', '请稍后重试', 1400)
  }
}

const validationErrors = (item: SharedPrompt) =>
  item._validation?.issues.filter((issue) => issue.severity === 'error') || []

const validationWarnings = (item: SharedPrompt) =>
  item._validation?.issues.filter((issue) => issue.severity === 'warning') || []

const duplicateMatches = (item: SharedPrompt) => item._duplicateMatches || []

const canPublishPrompt = (item: SharedPrompt) => validationErrors(item).length === 0

const handleToggleFeatured = async (item: SharedPrompt) => {
  await store.toggleFeaturedPrompt(item.id)
}
</script>

<template>
  <div class="app-shell min-h-screen">
    <AppHeader :sectionLabel="store.isModerator ? t('nav.admin') : t('nav.login')" />

    <main class="section section-spacing">
      <div class="page-stack">

        <!-- Header -->
        <section class="hero-panel hero-panel-accent">
          <div class="hero-layout lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div class="hero-eyebrow">
                <ShieldCheck class="w-4 h-4" />
                {{ store.isModerator ? 'Moderation Console' : 'Identity & Collections' }}
              </div>
              <h1 class="hero-title">
              {{ store.isModerator ? t('admin.dashboard') : (isGuest ? t('auth.guest_mode') : t('auth.login')) }}
              </h1>
              <p class="hero-body">
               {{ store.isModerator ? t('auth.manage_desc') : (isGuest ? t('auth.local_mode') : t('auth.login_desc')) }}
              </p>
            </div>
            <div v-if="store.isModerator || isGuest" class="metric-grid-2">
               <div v-if="store.isModerator" class="metric-tile">
                 <div class="metric-label">权限级别</div>
                 <div class="mt-3 text-xl font-black text-neutral-900 dark:text-neutral-100">ADMIN</div>
                 <div class="metric-copy">可审核、发布和精选内容</div>
               </div>
               <div class="metric-tile">
                 <div class="metric-label">当前身份</div>
                 <div class="mt-3 text-xl font-black text-neutral-900 dark:text-neutral-100">
                   {{ store.user ? store.user.login : (activeOfflineProfile?.name || '本地用户') }}
                 </div>
                 <div class="mt-4">
                   <button @click="logout" class="btn btn-secondary w-full justify-center px-4 py-2 text-sm">{{ t('auth.logout') }}</button>
                 </div>
               </div>
            </div>
          </div>
        </section>

        <!-- 1. Unified Login -->
        <div v-if="!store.user && !isGuest" class="max-w-md mx-auto mt-20">
          <div class="panel-card border border-neutral-200 dark:border-neutral-800 flex flex-col gap-6 shadow-soft-lg">
            <h2 class="text-3xl font-black text-center uppercase">{{ t('auth.identity_check') }}</h2>

            <button
              @click="store.loginWithGitHub()"
              :disabled="store.isAuthLoading"
              class="btn bg-black text-white hover:bg-neutral-800 w-full py-4 flex items-center justify-center gap-2"
            >
              <Github class="w-5 h-5" />
              {{ store.isAuthLoading ? t('common.loading') : t('auth.sign_in_github') }}
            </button>

            <div class="relative flex py-2 items-center">
                <div class="flex-grow border-t border-neutral-300"></div>
                <span class="flex-shrink-0 mx-4 text-gray-400 text-xs">{{ t('auth.or') }}</span>
                <div class="flex-grow border-t border-neutral-300"></div>
            </div>

            <button
              @click="handleGuestLogin"
              class="btn btn-secondary w-full py-3 text-sm"
            >
              {{ t('auth.continue_guest') }}
            </button>
          </div>
        </div>

        <!-- 2. Dashboard (User + Admin) -->
        <div v-else-if="store.user || isGuest">
           <!-- Profile Header -->
           <div class="panel-soft flex items-center gap-4">
             <div class="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
               {{ store.user ? store.user.login.slice(0, 2).toUpperCase() : (activeOfflineProfile?.name || 'LO').slice(0, 2).toUpperCase() }}
             </div>
             <div>
               <h2 class="text-2xl font-bold">{{ store.user ? store.user.login : (activeOfflineProfile?.name || '本地用户') }}</h2>
               <p class="text-neutral-500">{{ store.user ? 'GitHub User' : 'Offline Local Profile' }}</p>
             </div>
           </div>

          <!-- Tabs -->
           <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 mb-8 pb-0">
             <div class="flex gap-4 overflow-x-auto -mb-[1px]">
              <button v-if="store.user" @click="activeTab = 'my-submissions'" :class="['px-6 py-3 font-semibold border-b-2 -mb-[1px] whitespace-nowrap transition-colors', activeTab === 'my-submissions' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300']">
                 {{ t('admin.my_submissions') }} ({{ store.userPrompts.length }})
              </button>
              <button @click="activeTab = 'favorites'" :class="['px-6 py-3 font-semibold border-b-2 -mb-[1px] whitespace-nowrap transition-colors', activeTab === 'favorites' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300']">
                 {{ isGuest ? '本地收藏夹' : t('admin.favorites') }} ({{ totalLocalPromptCount }})
              </button>

              <template v-if="store.isModerator">
                <div class="w-px bg-neutral-200 dark:bg-neutral-800 mx-2 h-6 self-center"></div>
                <button @click="activeTab = 'pending'" :class="['px-6 py-3 font-semibold border-b-2 -mb-[1px] whitespace-nowrap transition-colors', activeTab === 'pending' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300']">
                   {{ t('admin.pending') }} ({{ store.pendingSubmissions.length }})
                </button>
                <button @click="activeTab = 'draft'" :class="['px-6 py-3 font-semibold border-b-2 -mb-[1px] whitespace-nowrap transition-colors', activeTab === 'draft' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300']">
                   {{ t('admin.drafts') }} ({{ store.draftSubmissions.length }})
                </button>
                <button @click="activeTab = 'published'" :class="['px-6 py-3 font-semibold border-b-2 -mb-[1px] whitespace-nowrap transition-colors', activeTab === 'published' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300']">
                   {{ t('admin.published') }} ({{ publishedList.length }})
                </button>
                <button @click="activeTab = 'rejected'" :class="['px-6 py-3 font-semibold border-b-2 -mb-[1px] whitespace-nowrap transition-colors', activeTab === 'rejected' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300']">
                   {{ t('admin.rejected') }} ({{ store.rejectedSubmissions.length }})
                </button>
              </template>
             </div>
             <button @click="refreshCurrentTab" :disabled="store.isModerationLoading" class="btn btn-secondary text-xs px-3 py-1 mb-2 ml-4 flex-shrink-0 flex items-center gap-1 disabled:opacity-60">
                <RefreshCcw class="w-3 h-3" /> Refresh
             </button>
           </div>

          <!-- Content: My Submissions -->
          <div v-if="activeTab === 'my-submissions' && store.user" class="space-y-6">
             <div v-if="store.userPrompts.length === 0" class="text-center py-12 text-neutral-400 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg border-dashed border-2">
               {{ t('admin.no_submissions') }}
             </div>
             <div v-for="item in store.userPrompts" :key="item.id" class="card p-6 flex gap-6">
                <div v-if="item.image" class="w-32 h-32 flex-shrink-0 bg-neutral-100">
                  <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                   <div class="flex justify-between items-start mb-2">
                     <h3 class="text-xl font-bold">{{ item.title || t('share.untitled') }}</h3>
                     <span
                        class="text-xs font-mono px-2 py-1 uppercase font-bold"
                        :class="{
                          'bg-yellow-100 text-yellow-800': item.status === 'pending',
                          'bg-green-100 text-green-800': item.status === 'published',
                          'bg-red-100 text-red-800': item.status === 'rejected',
                          'bg-neutral-200 text-neutral-800': !item.status
                        }"
                     >
                       {{ item.status || 'Unknown' }} #{{ item._issueNumber }}
                     </span>
                   </div>
                   <div class="bg-neutral-100 dark:bg-zinc-800 p-3 font-mono text-xs mb-4 max-h-32 overflow-y-auto">{{ item.prompt }}</div>
                   <div class="flex gap-2">
                      <a :href="`https://github.com/${store.repoOwner || 'Tera-Dark'}/${store.repoName || 'artist-generator'}/issues/${item._issueNumber}`" target="_blank" class="btn btn-secondary px-3 py-1 text-xs">{{ t('admin.view_github') }}</a>
                      <button v-if="item.status === 'pending' || item.status === 'draft'" @click="openEdit(item)" class="btn btn-secondary px-3 py-1 text-xs">{{ t('common.edit') }}</button>
                      <button v-if="item.status === 'pending' || item.status === 'draft'" @click="store.deleteUserSubmission(item.id)" class="btn bg-red-600 text-white hover:bg-red-700 px-3 py-1 text-xs">{{ t('common.delete') }}</button>
                   </div>
                </div>
             </div>
          </div>

          <!-- Content: Favorites -->
          <div v-if="activeTab === 'favorites'" class="space-y-6">
             <div class="card p-6">
               <div class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                 <div>
                   <div class="flex items-center gap-2 text-sm font-bold text-neutral-500 uppercase tracking-wider">
                     <FolderHeart class="w-4 h-4" />
                     本地离线身份
                   </div>
                   <div class="mt-3 flex flex-col md:flex-row gap-3">
                     <select
                       :value="store.activeOfflineProfileId"
                       class="input-field"
                       @change="store.setActiveOfflineProfile(($event.target as HTMLSelectElement).value)"
                     >
                       <option v-for="profile in store.offlineProfiles" :key="profile.id" :value="profile.id">
                         {{ profile.name }}
                       </option>
                     </select>
                     <button type="button" class="btn btn-secondary px-4" @click="handleRenameOfflineProfile">重命名</button>
                     <button type="button" class="btn btn-secondary px-4" :disabled="store.offlineProfiles.length <= 1" @click="handleDeleteOfflineProfile">
                       删除身份
                     </button>
                   </div>
                   <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                     <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/80 dark:bg-neutral-950/40">
                       <div class="text-xs text-neutral-500 uppercase tracking-wider">当前收藏夹</div>
                       <div class="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{{ activeCollections.length }}</div>
                     </div>
                     <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/80 dark:bg-neutral-950/40">
                       <div class="text-xs text-neutral-500 uppercase tracking-wider">Prompt 数</div>
                       <div class="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{{ totalLocalPromptCount }}</div>
                     </div>
                     <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/80 dark:bg-neutral-950/40">
                       <div class="text-xs text-neutral-500 uppercase tracking-wider">画师数</div>
                       <div class="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{{ totalLocalArtistCount }}</div>
                     </div>
                   </div>
                 </div>

                 <div class="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5">
                   <div class="flex items-center gap-2 text-sm font-bold text-neutral-500 uppercase tracking-wider">
                     <UserRoundPlus class="w-4 h-4" />
                     新建本地身份
                   </div>
                   <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">适合同一台设备上区分不同收藏偏好，全部只保存在本机。</p>
                   <div class="mt-4 flex flex-col sm:flex-row gap-3">
                     <input
                       v-model="newOfflineProfileName"
                       type="text"
                       class="input-field"
                       placeholder="例如：我的日常号 / 角色灵感号"
                     />
                     <button type="button" class="btn btn-primary px-5" :disabled="!newOfflineProfileName.trim()" @click="handleCreateOfflineProfile">
                       创建
                     </button>
                   </div>
                 </div>
               </div>
             </div>

             <div class="card p-6">
               <div class="flex items-center gap-2 text-sm font-bold text-neutral-500 uppercase tracking-wider">
                 <FolderPlus class="w-4 h-4" />
                 新建收藏夹
               </div>
               <div class="mt-4 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3">
                 <input v-model="newCollectionName" type="text" class="input-field" placeholder="例如：角色常用 / 光影实验 / 备用灵感" />
                 <input v-model="newCollectionDescription" type="text" class="input-field" placeholder="可选描述" />
                 <button type="button" class="btn btn-primary px-6" :disabled="!newCollectionName.trim()" @click="handleCreateCollection">
                   创建收藏夹
                 </button>
                </div>
              </div>

             <div class="card p-5">
               <div class="flex items-center gap-3 text-sm font-bold text-neutral-500 uppercase tracking-wider">
                 <Search class="w-4 h-4" />
                 搜索收藏内容
               </div>
               <div class="mt-4">
                 <input
                   v-model="collectionSearchQuery"
                   type="text"
                   class="input-field"
                   placeholder="搜索收藏夹名、Prompt 标题、内容或画师名"
                 />
               </div>
             </div>

             <div v-if="filteredCollections.length === 0" class="text-center py-12 text-neutral-400 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg border-dashed border-2">
                暂无收藏夹，先创建一个开始收集常用内容吧。
             </div>

             <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-6">
               <div v-for="collection in filteredCollections" :key="collection.id" class="card p-5 flex flex-col gap-5">
                 <div class="flex items-start justify-between gap-4">
                   <div>
                     <div class="flex items-center gap-2">
                       <h3 class="text-xl font-bold text-neutral-900 dark:text-neutral-100">{{ collection.name }}</h3>
                       <span v-if="collection.isDefault" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">默认</span>
                     </div>
                     <p v-if="collection.description" class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ collection.description }}</p>
                     <div class="mt-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                       <span>{{ collection.prompts.length }} 个 Prompt</span>
                       <span>{{ collection.artists.length }} 位画师</span>
                     </div>
                   </div>
                   <div class="flex items-center gap-2">
                     <button type="button" class="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" @click="handleRenameCollection(collection)">
                       <Pencil class="w-4 h-4" />
                     </button>
                     <button type="button" class="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" @click="handleDeleteCollection(collection)">
                       <Trash2 class="w-4 h-4" />
                     </button>
                   </div>
                 </div>

                 <div>
                   <div class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Prompt 收藏</div>
                   <div v-if="collection.prompts.length === 0" class="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-500 dark:text-neutral-400">
                     这个收藏夹里还没有 Prompt。
                   </div>
                   <div v-else class="space-y-3 max-h-72 overflow-y-auto pr-1">
                     <div v-for="entry in collection.prompts" :key="`${collection.id}-${entry.promptId}`" class="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/70 dark:bg-neutral-950/40">
                       <div class="flex items-start justify-between gap-4">
                         <div class="min-w-0">
                           <div class="font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ entry.snapshot.title || '未命名 Prompt' }}</div>
                           <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">By {{ entry.snapshot.username || entry.snapshot.author || 'Anonymous' }}</div>
                         </div>
                         <button type="button" class="text-red-500 hover:text-red-600 transition-colors" @click="handleRemovePromptFromCollection(collection, entry.promptId)">
                           <Trash2 class="w-4 h-4" />
                         </button>
                       </div>
                       <div class="mt-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-xs font-mono text-neutral-600 dark:text-neutral-300 line-clamp-4">
                         {{ entry.snapshot.prompt }}
                       </div>
                       <div class="mt-3 flex items-center justify-between gap-3">
                         <div class="text-[11px] text-neutral-400">保存于 {{ new Date(entry.addedAt).toLocaleDateString() }}</div>
                         <button type="button" class="btn btn-secondary text-xs px-3 py-1.5" @click="copyPromptText(entry.snapshot.prompt)">
                           复制
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>

                 <div>
                   <div class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">画师收藏</div>
                   <div v-if="collection.artists.length === 0" class="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-500 dark:text-neutral-400">
                     这个收藏夹里还没有画师。
                   </div>
                    <div v-else class="flex flex-wrap gap-2">
                      <span v-for="entry in collection.artists" :key="`${collection.id}-${entry.artistName}`" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-200">
                        <button type="button" class="font-medium hover:text-primary-600 dark:hover:text-primary-300 transition-colors" @click="copyArtistName(entry.snapshot.name)">
                          {{ entry.snapshot.name }}
                        </button>
                        <button type="button" class="text-red-500 hover:text-red-600 transition-colors" @click="handleRemoveArtistFromCollection(collection, entry.artistName)">
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                     </span>
                   </div>
                 </div>
               </div>
             </div>
          </div>

          <!-- Content: Admin Views (Only if Moderator) -->

          <!-- Draft Items -->
          <div v-if="activeTab === 'draft'" class="space-y-6">
             <div v-if="store.draftSubmissions.length === 0" class="text-center py-12 text-neutral-400">
               {{ t('admin.no_drafts') }}
             </div>
             <div v-for="item in store.draftSubmissions" :key="item.id" class="card p-6 flex gap-6 border-dashed border-2">
                <div v-if="item.image" class="w-32 h-32 flex-shrink-0 bg-neutral-100">
                  <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                   <div class="flex justify-between items-start mb-2">
                     <h3 class="text-xl font-bold text-neutral-600">{{ item.title }}</h3>
                     <span class="text-xs font-mono bg-neutral-200 px-2 py-1">{{ t('common.draft').toUpperCase() }} #{{ item._issueNumber }}</span>
                   </div>
                   <p class="text-sm text-neutral-600 mb-2">By {{ item.username }}</p>
                   <div v-if="validationErrors(item).length || validationWarnings(item).length" class="mb-3 flex flex-wrap gap-2">
                     <span v-if="validationErrors(item).length" class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                       <AlertTriangle class="w-3.5 h-3.5" />
                       {{ validationErrors(item).length }} 个校验错误
                     </span>
                     <span v-if="validationWarnings(item).length" class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                       <AlertTriangle class="w-3.5 h-3.5" />
                       {{ validationWarnings(item).length }} 个提醒
                     </span>
                   </div>
                   <div class="bg-neutral-100 p-3 font-mono text-xs mb-4 max-h-32 overflow-y-auto">{{ item.prompt }}</div>
                   <div class="flex gap-2">
                      <button @click="openEdit(item)" class="btn btn-secondary px-3 py-1 text-xs">{{ t('common.edit') }}</button>
                   </div>
                </div>
             </div>
          </div>

          <!-- Pending Items -->
          <div v-if="activeTab === 'pending'" class="space-y-6">
             <div v-if="store.pendingSubmissions.length === 0" class="text-center py-12 text-neutral-400">
               {{ t('admin.no_pending') }}
             </div>
             <div v-for="item in store.pendingSubmissions" :key="item.id" class="card p-6 flex flex-col md:flex-row gap-6">
                <!-- Image Preview -->
                <div v-if="item.image" class="w-full md:w-48 h-48 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden shadow-sm">
                  <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 flex flex-col">
                   <div class="flex justify-between items-start mb-2">
                     <div>
                        <h3 class="text-xl font-bold">{{ item.title }}</h3>
                        <p class="text-sm text-neutral-600">By {{ item.username }}</p>
                     </div>
                     <span class="text-xs font-mono bg-yellow-100 px-2 py-1 border border-yellow-300">#{{ item._issueNumber }}</span>
                   </div>

                   <div class="bg-neutral-100 p-3 font-mono text-xs mb-4 max-h-40 overflow-y-auto border border-neutral-200 flex-1">
                      {{ item.prompt }}
                   </div>

                   <div v-if="validationErrors(item).length || validationWarnings(item).length || duplicateMatches(item).length" class="mb-4 space-y-3">
                      <div v-if="validationErrors(item).length" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <div class="font-bold mb-2">发布前需要处理</div>
                        <ul class="space-y-1">
                          <li v-for="issue in validationErrors(item)" :key="issue.code">• {{ issue.message }}</li>
                        </ul>
                      </div>
                      <div v-if="validationWarnings(item).length" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        <div class="font-bold mb-2">审核提醒</div>
                        <ul class="space-y-1">
                          <li v-for="issue in validationWarnings(item)" :key="issue.code">• {{ issue.message }}</li>
                        </ul>
                      </div>
                      <div v-if="duplicateMatches(item).length" class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        <div class="font-bold mb-2">疑似重复内容</div>
                        <ul class="space-y-1">
                          <li v-for="match in duplicateMatches(item)" :key="`${item.id}-${match.id}`">
                            • {{ match.title }}（{{ match.source === 'published' ? '已发布' : '待审核' }}，相似度 {{ Math.round(match.score * 100) }}%）
                          </li>
                        </ul>
                      </div>
                   </div>

                   <!-- Actions -->
                   <div class="flex flex-wrap gap-3 mt-auto pt-4 border-t border-neutral-200">
                       <button
                          @click="handleApprove(item.id)"
                          :disabled="!canPublishPrompt(item)"
                          class="btn bg-green-500 text-white hover:bg-green-600 px-4 py-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           {{ canPublishPrompt(item) ? t('common.publish') : '需先修复' }}
                       </button>
                       <button
                          @click="handleReject(item.id)"
                          class="btn bg-red-500 text-white hover:bg-red-600 px-4 py-2 text-sm shadow-sm"
                       >
                           {{ t('common.reject') }}
                       </button>
                       <button
                          @click="openEdit(item)"
                          class="btn btn-secondary px-4 py-2 text-sm"
                       >
                           {{ t('common.edit') }}
                       </button>
                       <a
                          v-if="item._issueNumber"
                          :href="`https://github.com/${store.repoOwner}/${store.repoName}/issues/${item._issueNumber}`"
                          target="_blank"
                          class="btn btn-secondary px-4 py-2 text-sm ml-auto"
                       >
                          View Issue
                       </a>
                   </div>
                </div>
             </div>
          </div>

          <!-- Rejected Items -->
          <div v-else-if="activeTab === 'rejected'" class="space-y-6">
             <div v-if="store.rejectedSubmissions.length === 0" class="text-center py-12 text-neutral-400">
               {{ t('admin.no_rejected') }}
             </div>
             <div v-for="item in store.rejectedSubmissions" :key="item.id" class="card p-6 flex gap-6 opacity-75">
                <!-- Image Preview -->
                <div v-if="item.image" class="w-32 h-32 flex-shrink-0 bg-neutral-100 grayscale">
                  <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                   <div class="flex justify-between items-start mb-2">
                     <h3 class="text-xl font-bold line-through text-neutral-500">{{ item.title }}</h3>
                     <span class="text-xs font-mono bg-red-100 text-red-600 px-2 py-1">{{ t('admin.rejected').toUpperCase() }} #{{ item._issueNumber }}</span>
                   </div>
                   <p class="text-sm text-neutral-600 mb-2">By {{ item.username }}</p>
                   <div class="bg-neutral-100 p-3 font-mono text-xs mb-4 max-h-32 overflow-y-auto">{{ item.prompt }}</div>
                </div>
             </div>
          </div>

          <!-- Published Items -->
          <div v-else-if="activeTab === 'published'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div v-for="item in publishedList" :key="item.id" class="card p-4 flex flex-col h-full ring-1 ring-transparent hover:ring-primary-300 transition-all">
                <div v-if="item.image" class="h-40 bg-neutral-100 dark:bg-neutral-800 mb-4 -mx-4 -mt-4 overflow-hidden border-b border-neutral-200 dark:border-neutral-800 rounded-t-xl">
                   <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <h3 class="font-bold text-lg mb-1">{{ item.title }}</h3>
                <p class="text-xs text-neutral-500 mb-4">By {{ item.username }}</p>
                <div class="mb-4 flex flex-wrap gap-2">
                   <span v-if="store.isFeaturedPrompt(item.id)" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                     <Sparkles class="w-3.5 h-3.5" />
                     精选
                   </span>
                </div>
                <div class="flex-1"></div>
                <div class="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-neutral-100">
                   <button @click="handleToggleFeatured(item)" class="text-xs font-bold text-primary-600 hover:underline">
                     {{ store.isFeaturedPrompt(item.id) ? '取消精选' : '设为精选' }}
                   </button>
                   <button @click="openEdit(item)" class="text-xs font-bold hover:underline">{{ t('common.edit') }}</button>
                   <button @click="handleDelete(item.id)" class="text-xs font-bold text-red-500 hover:underline">{{ t('common.delete') }}</button>
                </div>
             </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
       <div class="bg-white dark:bg-neutral-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-8">
          <h2 class="text-2xl font-bold tracking-tight mb-6">{{ t('admin.edit_content') }}</h2>

          <div class="space-y-4">
             <div>
               <label class="label">{{ t('share.form_title') }}</label>
               <input v-model="editForm.title" type="text" class="input-field w-full">
             </div>

             <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">{{ t('admin.author') }}</label>
                  <input v-model="editForm.username" type="text" class="input-field w-full">
                </div>
                <div>
                   <label class="label">{{ t('share.form_image') }}</label>
                   <input type="file" @change="handleFileSelect" class="block w-full text-sm mb-1">
                   <input v-model="editForm.image" @input="editFile = null" type="text" placeholder="https://..." class="input-field w-full text-xs p-2">
                   <div v-if="editForm.image" class="mt-3 h-24 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm"><img :src="editForm.image" class="h-full w-full object-cover"></div>
                </div>
             </div>

             <div>
                <label class="label">{{ t('share.form_content') }}</label>
                <textarea v-model="editForm.prompt" rows="6" class="input-field w-full font-mono text-sm"></textarea>
             </div>

             <div>
                <label class="label">{{ t('admin.tags_label') }}</label>
                <input
                  :value="editForm.tags.join(', ')"
                  @input="e => editForm.tags = (e.target as HTMLInputElement).value.split(',').map(s => s.trim())"
                  type="text"
                  class="input-field w-full"
                >
             </div>
          </div>

          <div class="flex justify-end gap-4 mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
             <button @click="showEditModal = false" class="btn btn-secondary px-6">{{ t('common.cancel') }}</button>

             <!-- Dynamic Actions -->
             <template v-if="store.pendingSubmissions.find(p => p.id === editForm.id)">
                 <button @click="saveEdit('draft')" :disabled="isUploading" class="btn btn-secondary px-6">
                    {{ t('admin.save_draft') }}
                 </button>
                 <button @click="saveEdit('save')" :disabled="isUploading" class="btn btn-secondary px-6">
                    {{ t('common.save') }}
                 </button>
                 <button @click="saveEdit('publish')" :disabled="isUploading" class="btn btn-primary px-8">
                    {{ isUploading ? t('common.uploading') : t('admin.publish') }}
                 </button>
             </template>

             <template v-else-if="store.draftSubmissions.find(p => p.id === editForm.id)">
                 <button @click="saveEdit('draft')" :disabled="isUploading" class="btn btn-secondary px-6">
                    {{ t('admin.save_draft') }}
                 </button>
                 <button @click="saveEdit('review')" :disabled="isUploading" class="btn bg-blue-600 text-white hover:bg-blue-700 px-6">
                    {{ t('admin.submit_review') }}
                 </button>
                 <button @click="saveEdit('publish')" :disabled="isUploading" class="btn btn-primary px-8">
                    {{ isUploading ? t('common.uploading') : t('admin.publish') }}
                 </button>
             </template>

             <template v-else-if="store.userPrompts.find(p => p.id === editForm.id && p.status === 'draft')">
                 <button @click="saveEdit('save')" :disabled="isUploading" class="btn btn-secondary px-6">
                    {{ t('common.save') }}
                 </button>
                 <button @click="saveEdit('review')" :disabled="isUploading" class="btn btn-primary px-8">
                    {{ t('admin.submit_review') }}
                 </button>
             </template>

             <button v-else @click="saveEdit('save')" :disabled="isUploading" class="btn btn-primary px-8">
                {{ isUploading ? t('common.uploading') : t('common.save') }}
             </button>
          </div>
       </div>
    </div>

  </div>
</template>

<style scoped>
.label {
  @apply block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500;
}
.badge {
  @apply px-2 py-0.5 text-xs font-bold rounded;
}
</style>
