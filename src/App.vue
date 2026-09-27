<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { BookOpen, History, Moon, Settings2, Sparkles, Sun, WandSparkles } from 'lucide-vue-next'
import Workspace from '@/components/Workspace.vue'
import ArtistLibrary from '@/components/ArtistLibrary.vue'
import SavedStrings from '@/components/SavedStrings.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import OnboardingTour from '@/components/OnboardingTour.vue'
import { useVault } from '@/composables/useVault'

type Tab = 'workspace' | 'library' | 'saved' | 'settings'
type ThemeChoice = 'system' | 'light' | 'dark'
const THEME_KEY = 'artist-generator-theme'
const TOUR_KEY = 'artist-generator-tour-v1'
const activeTab = ref<Tab>('workspace')
const theme = ref<'light' | 'dark'>('light')
const themeChoice = ref<ThemeChoice>('system')
const showTour = ref(false)
const editRequest = ref<{ text: string; nonce: number } | null>(null)
let nextRequest = 0
let themeMedia: MediaQueryList | null = null
let tourTimer: ReturnType<typeof setTimeout> | undefined
const vault = useVault()
watch(activeTab, () => window.scrollTo({ top: 0, behavior: 'auto' }))

function storedValue(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function updateTheme(value: 'light' | 'dark') {
  theme.value = value
  document.documentElement.dataset.theme = value
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#151c1a' : '#fbfcfb')
}
function setThemeChoice(value: ThemeChoice) {
  themeChoice.value = value
  updateTheme(value === 'system' ? themeMedia?.matches ? 'dark' : 'light' : value)
  try { localStorage.setItem(THEME_KEY, value) }
  catch { /* Theme works for this session even without localStorage. */ }
}
function onSystemThemeChange(event: MediaQueryListEvent) {
  if (themeChoice.value === 'system') updateTheme(event.matches ? 'dark' : 'light')
}
function toggleTheme() { setThemeChoice(theme.value === 'light' ? 'dark' : 'light') }

async function edit(text: string) {
  editRequest.value = { text, nonce: ++nextRequest }
  activeTab.value = 'workspace'
  await nextTick()
}
function hasSeenTour() {
  return storedValue(TOUR_KEY) === 'done' || (() => {
    try { return sessionStorage.getItem(TOUR_KEY) === 'done' } catch { return false }
  })()
}
function replayTour() {
  activeTab.value = 'workspace'
  showTour.value = true
}
async function closeTour(completed: boolean) {
  showTour.value = false
  try { localStorage.setItem(TOUR_KEY, 'done') }
  catch { try { sessionStorage.setItem(TOUR_KEY, 'done') } catch { /* Storage disabled. */ } }
  if (completed) activeTab.value = 'workspace'
  await nextTick()
  const target = document.querySelector<HTMLElement>('.top-nav [aria-current="page"]') || document.querySelector<HTMLElement>('.settings-button')
  target?.focus({ preventScroll: true })
}

onMounted(() => {
  try { localStorage.removeItem('ag_gh_token') } catch { /* Remove legacy auth without touching old drafts. */ }
  themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  const saved = storedValue(THEME_KEY) || storedValue('theme')
  themeChoice.value = saved === 'dark' || saved === 'light' ? saved : 'system'
  updateTheme(themeChoice.value === 'system' ? themeMedia.matches ? 'dark' : 'light' : themeChoice.value)
  themeMedia.addEventListener('change', onSystemThemeChange)
  void vault.init()
  if (!hasSeenTour()) tourTimer = setTimeout(() => { showTour.value = true }, 450)
})
onUnmounted(() => {
  themeMedia?.removeEventListener('change', onSystemThemeChange)
  if (tourTimer) clearTimeout(tourTimer)
})
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <div class="app-shell" :inert="showTour">
    <header class="site-header">
      <div class="header-inner">
        <button type="button" class="brand" aria-label="返回画师串生成器" @click="activeTab = 'workspace'">
          <span class="brand-icon"><Sparkles :size="19" :stroke-width="2" aria-hidden="true" /></span>
          <span>画师串生成器</span>
        </button>
        <nav class="top-nav" aria-label="主要功能">
          <button type="button" :aria-current="activeTab === 'workspace' ? 'page' : undefined" @click="activeTab = 'workspace'"><WandSparkles :size="16" aria-hidden="true" /> 工作区</button>
          <button type="button" :aria-current="activeTab === 'library' ? 'page' : undefined" @click="activeTab = 'library'"><BookOpen :size="16" aria-hidden="true" /> 画师库</button>
          <button type="button" :aria-current="activeTab === 'saved' ? 'page' : undefined" @click="activeTab = 'saved'"><History :size="16" aria-hidden="true" /> 我的串</button>
        </nav>
        <div class="header-actions">
          <span class="local-badge"><span class="status-dot" aria-hidden="true"></span> 本地优先</span>
          <button class="icon-button settings-button" type="button" aria-label="设置" title="设置" :aria-current="activeTab === 'settings' ? 'page' : undefined" @click="activeTab = 'settings'"><Settings2 :size="19" aria-hidden="true" /></button>
          <button class="icon-button theme-button" type="button" :aria-label="theme === 'light' ? '切换到深色模式' : '切换到浅色模式'" @click="toggleTheme">
            <Moon v-if="theme === 'light'" :size="19" aria-hidden="true" />
            <Sun v-else :size="19" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <main id="main" class="main-content" :class="{ 'wide-content': activeTab !== 'workspace' }">
      <KeepAlive>
        <Workspace v-if="activeTab === 'workspace'" :edit-request="editRequest" />
        <ArtistLibrary v-else-if="activeTab === 'library'" @edit="edit" />
        <SavedStrings v-else-if="activeTab === 'saved'" @edit="edit" />
        <SettingsPanel v-else :theme-choice="themeChoice" @set-theme="setThemeChoice" @replay-tour="replayTour" />
      </KeepAlive>
    </main>

    <footer class="site-footer"><span>Artist Generator</span><span>Local first <span aria-hidden="true">·</span> Made for creating</span></footer>
  </div>
  <OnboardingTour v-if="showTour" @navigate="activeTab = $event" @close="closeTour" />
</template>
