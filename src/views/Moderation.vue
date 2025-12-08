<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/common/AppHeader.vue'
import { useGeneratorStore } from '@/stores/generator'
import type { SharedPrompt } from '@/types'
import { LogOut, User as UserIcon, Github } from 'lucide-vue-next'

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

watch(activeTab, (val) => {
  if (val === 'pending') store.loadPendingSubmissions()
  if (val === 'draft') store.loadDraftSubmissions()
  if (val === 'rejected') store.loadRejectedSubmissions()
  if (val === 'my-submissions') store.loadUserSubmissions()
  if (val === 'favorites') store.loadFavorites()
})

const publishedList = computed(() => {
  return store.sharedPrompts.filter(p => p.status === 'published' || p.status === 'approved')
})

const myLocalPrompts = computed(() => store.userPrompts)

// Actions
const handleGuestLogin = () => {
  isGuest.value = true
}

const logout = () => {
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
</script>

<template>
  <div class="app-shell min-h-screen">
    <AppHeader :sectionLabel="store.isModerator ? t('nav.admin') : t('nav.login')" />

    <main class="section section-spacing">
      <div class="container-responsive">

        <!-- Header -->
        <div class="flex items-center justify-between mb-12">
          <div>
            <h1 class="heading-xl mb-2">
              {{ store.isModerator ? t('admin.dashboard') : (isGuest ? t('auth.guest_mode') : t('auth.login')) }}
            </h1>
            <p class="text-xl text-neutral-500">
               {{ store.isModerator ? t('auth.manage_desc') : (isGuest ? t('auth.local_mode') : t('auth.login_desc')) }}
            </p>
          </div>
          <div v-if="store.isModerator || isGuest" class="flex items-center gap-4">
             <span v-if="store.isModerator" class="badge bg-primary-500 text-white">ADMIN</span>
             <button @click="logout" class="btn btn-secondary px-4 py-2 text-sm">{{ t('auth.logout') }}</button>
          </div>
        </div>

        <!-- 1. Unified Login -->
        <div v-if="!store.isModerator && !isGuest" class="max-w-md mx-auto mt-20">
          <div class="card p-8 border-2 border-black flex flex-col gap-6 shadow-[8px_8px_0_0_#000]">
            <h2 class="text-3xl font-black text-center uppercase">{{ t('auth.identity_check') }}</h2>

            <button
              @click="store.loginWithGitHub()"
              class="btn bg-black text-white hover:bg-neutral-800 w-full py-4 flex items-center justify-center gap-2"
            >
              <Github class="w-5 h-5" />
              {{ t('auth.sign_in_github') }}
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
        <div v-else-if="store.user">
           <!-- Profile Header -->
           <div class="flex items-center gap-4 mb-8 p-6 bg-neutral-100 dark:bg-zinc-800 rounded-lg">
             <div class="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
               {{ store.user.login.slice(0, 2).toUpperCase() }}
             </div>
             <div>
               <h2 class="text-2xl font-bold">{{ store.user.login }}</h2>
               <p class="text-neutral-500">GitHub User</p>
             </div>
           </div>

          <!-- Tabs -->
           <div class="flex gap-4 border-b-2 border-neutral-200 dark:border-neutral-800 mb-8 overflow-x-auto pb-1">
            <button @click="activeTab = 'my-submissions'" :class="['px-6 py-3 font-bold border-b-4 -mb-1.5 whitespace-nowrap transition-colors', activeTab === 'my-submissions' ? 'border-primary-500 text-black dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800']">
               {{ t('admin.my_submissions') }} ({{ store.userPrompts.length }})
            </button>
            <button @click="activeTab = 'favorites'" :class="['px-6 py-3 font-bold border-b-4 -mb-1.5 whitespace-nowrap transition-colors', activeTab === 'favorites' ? 'border-primary-500 text-black dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800']">
               {{ t('admin.favorites') }} ({{ store.favorites.length }})
            </button>

            <!-- Admin Tabs -->
            <template v-if="store.isModerator">
              <div class="w-px bg-neutral-300 dark:bg-neutral-700 mx-2 h-8 self-center"></div>
              <button @click="activeTab = 'pending'" :class="['px-6 py-3 font-bold border-b-4 -mb-1.5 whitespace-nowrap transition-colors', activeTab === 'pending' ? 'border-primary-500 text-black dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800']">
                 {{ t('admin.pending') }} ({{ store.pendingSubmissions.length }})
              </button>
              <button @click="activeTab = 'draft'" :class="['px-6 py-3 font-bold border-b-4 -mb-1.5 whitespace-nowrap transition-colors', activeTab === 'draft' ? 'border-primary-500 text-black dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800']">
                 {{ t('admin.drafts') }} ({{ store.draftSubmissions.length }})
              </button>
              <button @click="activeTab = 'published'" :class="['px-6 py-3 font-bold border-b-4 -mb-1.5 whitespace-nowrap transition-colors', activeTab === 'published' ? 'border-primary-500 text-black dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800']">
                 {{ t('admin.published') }} ({{ publishedList.length }})
              </button>
              <button @click="activeTab = 'rejected'" :class="['px-6 py-3 font-bold border-b-4 -mb-1.5 whitespace-nowrap transition-colors', activeTab === 'rejected' ? 'border-primary-500 text-black dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-800']">
                 {{ t('admin.rejected') }} ({{ store.rejectedSubmissions.length }})
              </button>
            </template>
          </div>

          <!-- Content: My Submissions -->
          <div v-if="activeTab === 'my-submissions'" class="space-y-6">
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
                   </div>
                </div>
             </div>
          </div>

          <!-- Content: Favorites -->
          <div v-if="activeTab === 'favorites'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div v-if="store.favorites.length === 0" class="col-span-full text-center py-12 text-neutral-400 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg border-dashed border-2">
               {{ t('admin.no_favorites') }}
             </div>
             <div v-for="item in store.favorites" :key="item.id" class="card p-4 flex flex-col h-full hover:border-black transition-all group relative">
                <button @click="store.toggleFavorite(item)" class="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="text-xl">♥</span>
                </button>
                <div v-if="item.image" class="h-40 bg-neutral-100 mb-4 -mx-4 -mt-4 overflow-hidden border-b-2 border-black">
                   <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <h3 class="font-bold text-lg mb-1">{{ item.title }}</h3>
                <p class="text-xs text-neutral-500 mb-4">By {{ item.username }}</p>
                <div class="bg-neutral-100 dark:bg-zinc-800 p-2 text-xs font-mono mb-2 line-clamp-3">{{ item.prompt }}</div>
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
             <div v-for="item in store.pendingSubmissions" :key="item.id" class="card p-6 flex gap-6">
                <!-- Image Preview -->
                <div v-if="item.image" class="w-32 h-32 flex-shrink-0 bg-neutral-100">
                  <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                   <div class="flex justify-between items-start mb-2">
                     <h3 class="text-xl font-bold">{{ item.title }}</h3>
                     <span class="text-xs font-mono bg-yellow-100 px-2 py-1">#{{ item._issueNumber }}</span>
                   </div>
                   <p class="text-sm text-neutral-600 mb-2">By {{ item.username }}</p>
                   <div class="bg-neutral-100 p-3 font-mono text-xs mb-4 max-h-32 overflow-y-auto">{{ item.prompt }}</div>
                   <div class="flex gap-2">
                      <button @click="openEdit(item)" class="btn btn-secondary px-3 py-1 text-xs">{{ t('common.edit') }}</button>
                      <button @click="handleApprove(item.id)" class="btn btn-primary px-3 py-1 text-xs">{{ t('common.quick') }} {{ t('common.confirm') }}</button>
                      <button @click="handleReject(item.id)" class="btn bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 text-xs">{{ t('common.reject') }}</button>
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
             <div v-for="item in publishedList" :key="item.id" class="card p-4 flex flex-col h-full hover:border-black transition-all">
                <div v-if="item.image" class="h-40 bg-neutral-100 mb-4 -mx-4 -mt-4 overflow-hidden border-b-2 border-black">
                   <img :src="item.image" class="w-full h-full object-cover">
                </div>
                <h3 class="font-bold text-lg mb-1">{{ item.title }}</h3>
                <p class="text-xs text-neutral-500 mb-4">By {{ item.username }}</p>
                <div class="flex-1"></div>
                <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-100">
                   <button @click="openEdit(item)" class="text-xs font-bold hover:underline">{{ t('common.edit') }}</button>
                   <button @click="handleDelete(item.id)" class="text-xs font-bold text-red-500 hover:underline">{{ t('common.delete') }}</button>
                </div>
             </div>
          </div>
        </div>

        <!-- 3. Guest View -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div v-for="item in myLocalPrompts" :key="item.id" class="card p-6">
              <h3 class="font-bold">{{ item.title }}</h3>
              <p class="text-sm mt-2 line-clamp-4 font-mono text-neutral-600">{{ item.prompt }}</p>
           </div>
           <div v-if="myLocalPrompts.length === 0" class="col-span-full text-center text-neutral-500 py-12">
             {{ t('admin.no_pending') }}
           </div>
        </div>

      </div>
    </main>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
       <div class="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-black shadow-[8px_8px_0_0_#fff] p-8">
          <h2 class="text-2xl font-black mb-6">{{ t('admin.edit_content') }}</h2>

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
                   <div v-if="editForm.image" class="mt-2 h-20 w-20 bg-gray-100"><img :src="editForm.image" class="h-full w-full object-cover"></div>
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
