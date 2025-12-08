<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGeneratorStore } from '@/stores/generator'
import AppHeader from '@/components/common/AppHeader.vue'
import { Github, Upload, X, Image as ImageIcon, Heart, User } from 'lucide-vue-next'
import type { SharedPrompt } from '@/types'

const store = useGeneratorStore()

const { t } = useI18n()

// 状态
const searchQuery = ref('')
const activeTag = ref('')
const showDetailModal = ref(false)
const showSubmitModal = ref(false)
const selectedPrompt = ref<SharedPrompt | null>(null)

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

// 图片上传状态
// const imageFile = ref<File | null>(null) // Removed
// const imagePreview = ref<string>('') // Removed

// 临时标签输入
const tagsInput = ref('')

// 计算属性
const keywords = computed(() =>
  searchQuery.value
    .split(/[\s,，、]+/).map(k => k.trim()).filter(Boolean).map(k => k.toLowerCase())
)

const allTags = computed(() => {
  const tagCounts: Record<string, number> = {}
  store.sharedPrompts.forEach(p => {
    p.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    })
  })
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0])
})

const filteredPrompts = computed(() => {
  let arr = [...store.sharedPrompts]

  if (activeTag.value) {
    arr = arr.filter(p => p.tags.includes(activeTag.value))
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
  }

  return arr
})

const isLoading = computed(() => store.isLoading)

onMounted(() => {
  store.loadSharedPrompts()
  store.loadFavorites()
})

function handleNewPrompt() {
  if (!store.user) {
    store.addToast('info', t('auth.identity_check'), t('share.auth_required'))
    return
  }
  showSubmitModal.value = true
}

function openDetail(item: SharedPrompt) {
  if (!store.user) {
    store.addToast('info', t('auth.identity_check'), t('share.auth_required'))
    return
  }
  selectedPrompt.value = item
  showDetailModal.value = true
}

function copyText(text: string) {
  if (!store.user) {
    store.addToast('info', t('auth.identity_check'), t('share.auth_required'))
    return
  }
  if (!text) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => store.addToast('success', t('share.copy_success'), t('share.copy_success'), 1500))
      .catch(() => store.addToast('error', t('share.copy_fail'), t('share.copy_fail'), 2000))
  }
}

function handleImageError(e: Event) {
  // Optional: clear broken image or show error
  // (e.target as HTMLImageElement).style.display = 'none'
  store.addToast('error', 'Image Error', 'Failed to load preview image')
}

async function handleSubmit() {
  if (!store.user) {
    store.addToast('error', t('auth.identity_check'), t('share.auth_required'))
    return
  }

  if (!form.value.prompt) {
    store.addToast('error', 'Error', t('share.prompt_required'))
    return
  }

  const payload = { ...form.value }

  // Logic: Open GitHub Issue
  // We keep the image URL in the payload
  const link = store.getSubmissionLink({
    ...payload,
    id: '', // Placeholder
    tags: tagsInput.value.split(/[\s,，、]+/).map(t => t.trim()).filter(Boolean)
  } as any)

  window.open(link, '_blank')
  store.addToast('success', 'Opened GitHub', 'Please submit the issue to contribute.')

  showSubmitModal.value = false
  // Reset form but keep username if logged in
  const currentUsername = store.user?.login || ''
  form.value = { title: '', username: currentUsername, prompt: '', model: 'NAI 3', tags: [], description: '', image: '' }
  tagsInput.value = ''
}

// Watchers
watch(searchQuery, () => {
  if (searchQuery.value && activeTag.value) {
    activeTag.value = ''
  }
})

// Auto-fill username when modal opens
watch(showSubmitModal, (val) => {
  if (val && store.user) {
    form.value.username = store.user.login
  }
})
</script>

<template>
  <div class="app-shell min-h-screen">
    <AppHeader sectionLabel="画师串分享" />

    <main class="section section-spacing">
      <div class="container-responsive">

        <!-- Header & Actions -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 class="heading-xl mb-2">{{ t('share.title') }}</h1>
            <p class="text-xl text-neutral-500">{{ t('share.subtitle') }}</p>
          </div>
          <button
            @click="handleNewPrompt"
            class="btn btn-primary text-base px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          >
            {{ t('share.new_prompt') }}
          </button>
        </div>

        <!-- Search & Filter -->
        <div class="mb-12 space-y-6">
          <!-- Search Bar -->
          <div class="relative max-w-2xl">
            <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg class="h-6 w-6 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
              </svg>
            </div>
            <input
              v-model="searchQuery"
              type="text"
              class="input-field h-14 pl-12 text-lg w-full"
              :placeholder="t('share.search_placeholder')"
            />
          </div>

          <!-- Tags Scroll -->
          <div class="flex flex-wrap gap-3">
            <button
              v-for="tag in allTags.slice(0, 20)"
              :key="tag"
              @click="activeTag = activeTag === tag ? '' : tag"
              :class="[
                'px-4 py-2 text-sm font-bold border-2 transition-all',
                activeTag === tag
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-900 hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-100 dark:hover:text-neutral-100'
              ]"
            >
              #{{ tag }}
            </button>
          </div>
        </div>

        <!-- Grid -->
        <div v-if="isLoading" class="py-20 text-center">
           <div class="text-2xl font-black animate-pulse">{{ t('common.loading') }}</div>
        </div>

        <div v-else-if="filteredPrompts.length === 0" class="py-20 text-center border-4 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div class="text-xl text-neutral-400 font-bold">{{ t('share.no_results') }}</div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="item in filteredPrompts"
            :key="item.id"
            class="card p-0 flex flex-col group hover:-translate-y-1 transition-transform duration-200 relative"
          >
            <!-- Image Area with Favorite Button Overlay -->
            <div class="relative w-full aspect-video bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-900 dark:border-neutral-100 overflow-hidden group-inner">
               <img
                 v-if="item.image"
                 :src="item.image"
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                 alt="Preview"
                 loading="lazy"
               />
               <div v-else class="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-700">
                  <ImageIcon class="w-12 h-12" />
               </div>

               <button
                  @click.stop="store.toggleFavorite(item)"
                  class="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 dark:bg-neutral-900/90 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm"
                  :class="store.isFavorite(item.id) ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'"
                  :title="store.isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'"
                >
                  <Heart :class="{'fill-current': store.isFavorite(item.id)}" :size="20" />
                </button>
            </div>

            <div class="p-5 flex-1 flex flex-col">
              <div class="flex items-start justify-between mb-2 gap-2">
                <h3 class="text-lg font-bold truncate flex-1" :title="item.title">{{ item.title || t('share.untitled') }}</h3>
                <span class="inline-flex items-center px-2 py-1 text-xs font-bold border border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 uppercase tracking-wider whitespace-nowrap">
                  {{ item.model }}
                </span>
              </div>

              <div class="text-xs text-neutral-500 mb-3 font-mono">By {{ item.username || item.author || 'Anonymous' }}</div>

              <div class="relative flex-1 mb-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 p-3 text-sm font-mono leading-relaxed h-24 overflow-hidden shadow-inner">
                <div class="line-clamp-3 break-all opacity-80 group-hover:opacity-100 transition-opacity">{{ item.prompt }}</div>
              </div>

              <div class="flex flex-wrap gap-2 mt-auto">
                <span
                  v-for="t in item.tags.slice(0, 3)"
                  :key="t"
                  class="text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1"
                >
                  #{{ t }}
                </span>
                <span v-if="item.tags.length > 3" class="text-xs text-neutral-400 py-1">+{{ item.tags.length - 3 }}</span>
              </div>
            </div>

            <div class="border-t-2 border-neutral-900 dark:border-neutral-100 p-4 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-4">
              <button
                @click="openDetail(item)"
                class="btn btn-secondary flex-1 py-2 text-sm"
              >
                {{ t('share.view_details') }}
              </button>
              <button
                @click="copyText(item.prompt)"
                class="btn btn-primary flex-1 py-2 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                {{ t('common.submit') === '提交' ? '复制' : 'Copy' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedPrompt" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" @click="showDetailModal = false"></div>
      <div class="relative w-full max-w-5xl bg-white dark:bg-neutral-900 border-4 border-neutral-900 dark:border-neutral-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-h-[90vh] overflow-hidden flex flex-col">

        <!-- Modal Header with Close -->
        <div class="flex items-center justify-between p-6 border-b-2 border-neutral-100 dark:border-neutral-800 shrink-0">
           <h2 class="text-2xl font-black truncate flex-1 pr-4">{{ selectedPrompt.title }}</h2>
           <button @click="showDetailModal = false" class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
              <X class="w-6 h-6" />
           </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            <!-- Left: Image & Meta -->
            <div class="space-y-6">
               <div class="w-full bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 aspect-square sm:aspect-video md:aspect-auto md:h-[400px] flex items-center justify-center overflow-hidden relative">
                  <img v-if="selectedPrompt.image" :src="selectedPrompt.image" class="w-full h-full object-contain bg-neutral-950/5" />
                  <div v-else class="text-neutral-300 dark:text-neutral-700">
                     <ImageIcon class="w-20 h-20" />
                  </div>

                  <!-- Favorite Button on Image -->
                  <button
                    @click="store.toggleFavorite(selectedPrompt)"
                    class="absolute top-4 right-4 p-3 rounded-full bg-white/90 dark:bg-neutral-900/90 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-md"
                    :class="store.isFavorite(selectedPrompt.id) ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'"
                  >
                    <Heart :class="{'fill-current': store.isFavorite(selectedPrompt.id)}" :size="24" />
                  </button>
               </div>

               <!-- Meta Info -->
               <div class="flex flex-wrap items-center gap-4 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-950 p-4 border border-neutral-200 dark:border-neutral-800">
                  <span class="font-bold flex items-center gap-2">
                    <User class="w-4 h-4" />
                    {{ selectedPrompt.username || selectedPrompt.author }}
                  </span>
                  <span class="w-px h-4 bg-neutral-300"></span>
                  <span>{{ new Date(selectedPrompt.created_at || 0).toLocaleDateString() }}</span>
                  <span class="w-px h-4 bg-neutral-300"></span>
                  <span class="px-2 py-0.5 border border-neutral-300 dark:border-neutral-700 text-xs rounded font-bold uppercase">{{ selectedPrompt.model }}</span>
               </div>

               <!-- Tags -->
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-400">{{ t('share.form_tags') }}</label>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="t in selectedPrompt.tags"
                      :key="t"
                      class="px-3 py-1 border border-neutral-900 dark:border-neutral-100 text-xs font-bold uppercase hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 transition-colors cursor-default"
                    >
                      #{{ t }}
                    </span>
                  </div>
                </div>
            </div>

            <!-- Right: Prompt & Description -->
            <div class="flex flex-col h-full">
               <div class="flex-1 flex flex-col min-h-0">
                  <div class="flex items-center justify-between mb-2">
                     <label class="text-sm font-bold uppercase tracking-wider">{{ t('share.form_content') }}</label>
                     <button @click="copyText(selectedPrompt.prompt)" class="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1">
                        <span class="uppercase">{{ t('share.copy_prompt') }}</span>
                     </button>
                  </div>
                  <div class="flex-1 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-800 p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap select-all overflow-y-auto mb-6">
                    {{ selectedPrompt.prompt }}
                  </div>

                  <div v-if="selectedPrompt.description" class="mb-6">
                    <label class="block text-sm font-bold uppercase tracking-wider mb-2">{{ t('share.form_desc') }}</label>
                    <p class="text-base text-neutral-600 dark:text-neutral-300 leading-relaxed bg-white dark:bg-neutral-900 p-4 border border-neutral-100 dark:border-neutral-800">{{ selectedPrompt.description }}</p>
                  </div>
               </div>

               <div class="flex justify-end gap-4 pt-4 mt-auto">
                  <button
                    @click="showDetailModal = false"
                    class="btn btn-secondary px-6 py-3"
                  >
                    {{ t('share.close') }}
                  </button>
                  <button
                    @click="copyText(selectedPrompt.prompt)"
                    class="btn btn-primary px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  >
                    {{ t('share.copy_prompt') }}
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Modal -->
    <div v-if="showSubmitModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" @click="showSubmitModal = false"></div>
      <div class="relative w-full max-w-5xl bg-white dark:bg-neutral-900 border-4 border-neutral-900 dark:border-neutral-100 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-h-[95vh] overflow-y-auto">
        <h2 class="text-2xl font-black mb-6 uppercase tracking-tight">{{ t('share.submit_title') }}</h2>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-6">
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
                 <div class="flex gap-2">
                    <input
                      v-model="form.image"
                      type="url"
                      class="input-field flex-1 h-10 px-3 text-sm"
                      :placeholder="t('share.form_image_ph')"
                    />
                    <a
                      href="https://catbox.moe/"
                      target="_blank"
                      class="btn btn-secondary px-3 flex items-center justify-center whitespace-nowrap text-sm"
                      :title="t('share.image_upload_btn')"
                    >
                      <Upload class="w-4 h-4 mr-1" />
                      {{ t('share.image_upload_btn') }}
                    </a>
                 </div>
                 <p class="text-xs text-muted mt-1">{{ t('share.image_hint') }}</p>
               </div>

               <!-- Image Preview (Compact) -->
               <div v-if="form.image" class="relative w-full h-32 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <img :src="form.image" class="w-full h-full object-contain" alt="Preview" @error="handleImageError" />
               </div>

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

          <div class="mt-4 flex justify-end gap-4 border-t-2 border-neutral-100 dark:border-neutral-800 pt-6">
            <button
              type="button"
              @click="showSubmitModal = false"
              class="btn btn-secondary px-6 py-3"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              class="btn btn-primary px-8 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            >
              {{ t('share.submit_review') }}
            </button>
          </div>
        </form>
        <div class="text-xs text-center text-muted mt-4">{{ t('share.submit_hint') }}</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 无额外样式，全部使用 Main CSS */
</style>
