<template>
  <header class="app-nav">
    <div class="nav-container container-responsive h-24">
      <RouterLink to="/" class="nav-brand group" @click="closeMenu">
        <div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl shadow-soft dark:shadow-none flex items-center justify-center transition-transform group-hover:scale-105">
          <Palette class="w-5 h-5 text-white" stroke-width="2.5" />
        </div>
        <span class="text-xl font-black tracking-tight ml-3">{{ title }}</span>
        <span
          v-if="sectionLabel"
          class="nav-section-pill"
        >
          {{ sectionLabel }}
        </span>
      </RouterLink>

      <nav class="nav-links gap-6 text-base">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          class="nav-link"
          active-class="nav-link-active"
          :to="item.path"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink class="nav-link icon-only" active-class="nav-link-active" to="/settings" :title="t('nav.settings')">
          <Settings class="w-5 h-5" />
        </RouterLink>
      </nav>

      <div class="md:hidden flex items-center gap-2">
        <RouterLink class="mobile-icon-button" to="/settings" :title="t('nav.settings')">
          <Settings class="w-5 h-5" />
        </RouterLink>
        <button
          type="button"
          class="mobile-icon-button"
          :aria-expanded="mobileMenuOpen"
          :aria-label="mobileMenuOpen ? 'Close navigation' : 'Open navigation'"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <X v-if="mobileMenuOpen" class="w-5 h-5" />
          <Menu v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <Transition name="mobile-nav">
      <div v-if="mobileMenuOpen" class="mobile-nav-shell md:hidden">
        <button type="button" class="mobile-nav-backdrop" aria-label="Close navigation" @click="closeMenu"></button>
        <div class="mobile-nav-panel">
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div class="text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ title }}</div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ store.user ? store.user.login : t('nav.login') }}
              </div>
            </div>
            <button type="button" class="mobile-icon-button" aria-label="Close navigation" @click="closeMenu">
              <X class="w-5 h-5" />
            </button>
          </div>

          <nav class="p-4 space-y-2">
            <RouterLink
              v-for="item in navItems"
              :key="`${item.path}-mobile`"
              :to="item.path"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': route.path === item.path }"
              @click="closeMenu"
            >
              <component :is="item.icon" class="w-4 h-4" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { MessageSquareText, House, Library, Menu, Palette, Settings, Sparkles, UserRound, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useGeneratorStore } from '@/stores/generator'

const props = defineProps<{ title?: string; sectionLabel?: string }>()
const title = props.title ?? 'Artist Generator'
const { t } = useI18n()
const route = useRoute()
const store = useGeneratorStore()
const mobileMenuOpen = ref(false)

const navItems = computed(() => [
  { path: '/', label: t('nav.home'), icon: House },
  { path: '/library', label: t('nav.artists'), icon: Library },
  { path: '/concept', label: t('nav.workspace'), icon: Sparkles },
  { path: '/prompts', label: t('nav.share'), icon: MessageSquareText },
  { path: '/moderation', label: store.user ? (store.user.login || 'User') : t('nav.login'), icon: UserRound },
])

function closeMenu() {
  mobileMenuOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)

watch(mobileMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>
